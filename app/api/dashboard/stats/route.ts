/**
 * app/api/dashboard/stats/route.ts
 * GET: Aggregated statistics for the admin dashboard.
 * Returns real data from Supabase or dummy stats.
 */
import { NextResponse } from 'next/server';
import { countRows, listRows } from '@/lib/api-helpers';
import { dummyCategoryData, dummyProducts, dummyReports, dummyStats, dummyTrendData } from '@/lib/dummy-data';

export async function GET() {
  try {
    const [total, pending, inProgress, completed, products, reports] = await Promise.all([
      countRows('reports'),
      countRows('reports', { status: 'pending' }),
      countRows('reports', { status: 'in_progress' }),
      countRows('reports', { status: 'completed' }),
      listRows('products', dummyProducts),
      listRows('reports', dummyReports),
    ]);

    const totalCount = total ?? dummyStats.totalReports;
    const pendingCount = pending ?? dummyStats.pendingReports;
    const inProgressCount = inProgress ?? dummyStats.inProgressReports;
    const completedCount = completed ?? dummyStats.completedReports;
    const categoryData = Object.values(
      reports.reduce((acc: Record<string, { category: string; count: number }>, report: any) => {
        const category = report.category ?? 'Lainnya';
        acc[category] ??= { category, count: 0 };
        acc[category].count += 1;
        return acc;
      }, {})
    );

    return NextResponse.json({
      totalReports: totalCount,
      pendingReports: pendingCount,
      inProgressReports: inProgressCount,
      completedReports: completedCount,
      resolutionRate: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      activeUMKM: products.length,
      totalCitizens: dummyStats.totalCitizens,
      categoryData: categoryData.length ? categoryData : dummyCategoryData,
      trendData: dummyTrendData,
    });
  } catch {
    return NextResponse.json({
      ...dummyStats,
      categoryData: dummyCategoryData,
      trendData: dummyTrendData,
    });
  }
}
