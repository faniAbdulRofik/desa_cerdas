import { NextResponse } from 'next/server';
import { countRows } from '@/lib/api-helpers';
import { dummyStats } from '@/lib/dummy-data';

export async function GET() {
  try {
    const reportsCount = await countRows('reports');
    const productsCount = await countRows('products');
    const resolvedCount = await countRows('reports', { status: 'completed' });

    return NextResponse.json({
      reports: reportsCount ?? dummyStats.totalReports,
      products: productsCount ?? dummyStats.activeUMKM,
      resolved: resolvedCount ?? dummyStats.completedReports
    });
  } catch (error) {
    console.error('[API_STATS_GET]', error);
    return NextResponse.json({
      reports: dummyStats.totalReports,
      products: dummyStats.activeUMKM,
      resolved: dummyStats.completedReports,
    }, { status: 500 });
  }
}
