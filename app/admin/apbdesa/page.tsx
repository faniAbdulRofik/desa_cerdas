'use client';
import { useEffect, useState } from 'react';
import { PieChart, Save, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { fetchJson } from '@/lib/api-client';
import { formatRupiah } from '@/lib/utils';
import type { APBDesa } from '@/lib/types';

const EMPTY_APB_DESA: APBDesa = {
  year: new Date().getFullYear(),
  total_budget: 0,
  realized: 0,
  allocations: [],
  programs: [],
};

export default function AdminAPBDesaPage() {
  const [data, setData] = useState<APBDesa>(EMPTY_APB_DESA);
  const [allocationsText, setAllocationsText] = useState('[]');
  const [programsText, setProgramsText] = useState('[]');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const result = await fetchJson<APBDesa | null>('/api/apbdesa', null);
    const next = result ?? EMPTY_APB_DESA;
    setData(next);
    setAllocationsText(JSON.stringify(next.allocations ?? [], null, 2));
    setProgramsText(JSON.stringify(next.programs ?? [], null, 2));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    setError('');
    try {
      const allocations = JSON.parse(allocationsText);
      const programs = JSON.parse(programsText);
      const res = await fetch('/api/apbdesa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          year: Number(data.year),
          total_budget: Number(data.total_budget),
          realized: Number(data.realized),
          allocations,
          programs,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Gagal menyimpan APBDesa.');
      }
      const saved = await res.json();
      setData(saved);
      setAllocationsText(JSON.stringify(saved.allocations ?? [], null, 2));
      setProgramsText(JSON.stringify(saved.programs ?? [], null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Format JSON tidak valid.');
    }
    setSaving(false);
  }

  const progress = data.total_budget > 0 ? Math.round((data.realized / data.total_budget) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-primary-900 border-l-4 border-primary-600 pl-4">Master Data APBDesa</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 pl-5">Konfigurasi alokasi & realisasi dana desa</p>
        </div>
        <div className="flex gap-3">
          <button onClick={load} className="p-3 border border-gray-200 hover:bg-gray-50 transition-colors"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-primary-800 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-primary-950 disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan APBDesa
          </button>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 text-red-600 text-[10px] font-bold uppercase tracking-widest bg-red-50 border border-red-200 p-4 mb-6"><AlertCircle className="w-4 h-4" />{error}</div>}

      <div className="bg-white border border-gray-200 p-8 mb-8">
        <h3 className="text-sm font-semibold text-gray-900 mb-6 flex items-center gap-2"><PieChart className="w-4 h-4" /> Rekapitulasi Anggaran</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Input label="Tahun" type="number" value={String(data.year)} onChange={(value) => setData((prev) => ({ ...prev, year: Number(value) }))} />
          <Input label="Total Anggaran" type="number" value={String(data.total_budget)} onChange={(value) => setData((prev) => ({ ...prev, total_budget: Number(value) }))} />
          <Input label="Realisasi" type="number" value={String(data.realized)} onChange={(value) => setData((prev) => ({ ...prev, realized: Number(value) }))} />
        </div>
        <div className="mt-6">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
            <span>{formatRupiah(data.realized)} terserap</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100"><div className="h-full bg-primary-600" style={{ width: `${progress}%` }} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <JsonEditor label="Alokasi Anggaran JSON" value={allocationsText} onChange={setAllocationsText} />
        <JsonEditor label="Program APBDesa JSON" value={programsText} onChange={setProgramsText} />
      </div>

      <div className="bg-white border border-gray-200 overflow-hidden mt-8">
        <table className="w-full text-sm">
          <thead className="bg-bg border-b border-gray-200">
            <tr>{['Bidang Alokasi', 'Pagu Anggaran', 'Porsi'].map((h) => <th key={h} className="text-left px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={3} className="text-center py-12 text-gray-400">Memuat data...</td></tr>
            ) : data.allocations.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-12 text-gray-400">Belum ada alokasi anggaran.</td></tr>
            ) : data.allocations.map((item) => {
              const pct = data.total_budget > 0 ? Math.round((item.amount / data.total_budget) * 100) : 0;
              return (
                <tr key={item.category} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-primary-900">{item.category}</td>
                  <td className="px-6 py-4 text-gray-600">{formatRupiah(item.amount)}</td>
                  <td className="px-6 py-4">
                    <div className="w-full bg-gray-100 h-1.5"><div className="bg-primary-600 h-full" style={{ width: `${pct}%` }} /></div>
                    <span className="text-[10px] text-gray-500 mt-1 block">{pct}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-2">{label}</label>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full px-4 py-3 border border-gray-200 text-sm focus:outline-none focus:border-primary-800 bg-gray-50" />
    </div>
  );
}

function JsonEditor({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="bg-white border border-gray-200 p-8">
      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-4">{label}</label>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={14} className="w-full font-mono text-xs px-4 py-3 border border-gray-200 focus:outline-none focus:border-primary-800 bg-gray-50 resize-y" />
    </div>
  );
}
