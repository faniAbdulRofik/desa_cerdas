import { NextRequest, NextResponse } from 'next/server';
import { dummyReportHistory } from '@/lib/dummy-data';
import { listRows } from '@/lib/api-helpers';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fallback = dummyReportHistory.filter((item) => item.report_id === id);
  const history = await listRows('report_status_history', fallback, {
    filters: { report_id: id },
    order: { column: 'created_at', ascending: true },
  });

  return NextResponse.json(history);
}
