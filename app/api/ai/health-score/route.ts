import { NextResponse } from 'next/server';
import { countRows, listRows } from '@/lib/api-helpers';
import type { HealthScore, Report } from '@/lib/types';

export async function GET() {
  return NextResponse.json(await buildHealthScore());
}

export async function POST() {
  const score = await buildHealthScore();
  const [totalReports, completedReports, products] = await Promise.all([
    countRows('reports'),
    countRows('reports', { status: 'completed' }),
    countRows('products'),
  ]);

  if (process.env.OPENAI_API_KEY) {
    try {
      const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/';
      const url = baseUrl.endsWith('/') ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`;
      const modelName = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

      const context = `
Statistik Desa:
- Total laporan: ${totalReports ?? 0}, selesai: ${completedReports ?? 0}
- Tingkat penyelesaian: ${score.overall}%
- UMKM aktif: ${products ?? 0}
Skor per dimensi: Kebersihan ${score.metrics.cleanliness}, Infrastruktur ${score.metrics.infrastructure}, Keamanan ${score.metrics.safety}, Kesehatan ${score.metrics.health}, Ekonomi ${score.metrics.economy}, Komunitas ${score.metrics.community}.
Skor keseluruhan: ${score.overall}/100 (${score.grade}).
      `;
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          max_tokens: 250,
          messages: [
            { role: 'system', content: 'Anda adalah analis pemerintahan desa. Buat analisis naratif singkat (2-3 kalimat) tentang kondisi desa berdasarkan data yang diberikan, sertakan kekuatan utama dan area yang perlu perhatian. Gunakan Bahasa Indonesia yang jelas dan profesional.' },
            { role: 'user', content: context },
          ],
        }),
      });
      const data = await res.json();
      const narrative = data.choices?.[0]?.message?.content;
      if (narrative) return NextResponse.json({ narrative });
    } catch {
      // Use database-derived narrative below.
    }
  }

  return NextResponse.json({ narrative: score.ai_narrative });
}

async function buildHealthScore(): Promise<HealthScore> {
  const [reports, totalReports, completedReports, products, actions] = await Promise.all([
    listRows<Report>('reports', [], { order: { column: 'created_at', ascending: false } }),
    countRows('reports'),
    countRows('reports', { status: 'completed' }),
    countRows('products'),
    countRows('community_actions'),
  ]);

  const total = totalReports ?? reports.length;
  const completed = completedReports ?? reports.filter((report) => report.status === 'completed').length;
  const resolutionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const categoryCount = (name: string) => reports.filter((report) => report.category === name).length;
  const penalty = (count: number) => Math.min(45, count * 8);

  const metrics = {
    cleanliness: Math.max(0, resolutionRate + 20 - penalty(categoryCount('Sampah') + categoryCount('Lingkungan'))),
    infrastructure: Math.max(0, resolutionRate + 20 - penalty(categoryCount('Infrastruktur'))),
    safety: Math.max(0, resolutionRate + 25 - penalty(categoryCount('Keamanan'))),
    health: Math.max(0, resolutionRate + 25 - penalty(categoryCount('Kesehatan'))),
    economy: Math.min(100, 40 + Math.min(40, (products ?? 0) * 5) + Math.round(resolutionRate / 5)),
    community: Math.min(100, 45 + Math.min(35, (actions ?? 0) * 8) + Math.round(resolutionRate / 5)),
  };

  const overall = Math.round(Object.values(metrics).reduce((sum, value) => sum + value, 0) / 6);
  const grade =
    overall >= 85 ? 'Sangat Baik' :
    overall >= 70 ? 'Baik' :
    overall >= 55 ? 'Cukup' :
    overall >= 40 ? 'Perlu Perhatian' :
    'Kritis';

  return {
    overall,
    grade,
    metrics,
    trend: resolutionRate >= 70 ? 'naik' : resolutionRate >= 40 ? 'stabil' : 'turun',
    ai_narrative: total > 0
      ? `Skor dihitung dari ${total} laporan, ${completed} di antaranya sudah selesai. Prioritas terbesar saat ini adalah kategori laporan yang paling banyak muncul dan percepatan penyelesaian laporan terbuka.`
      : 'Belum ada data laporan yang cukup untuk menghitung skor desa secara akurat.',
    last_updated: new Date().toISOString(),
  };
}
