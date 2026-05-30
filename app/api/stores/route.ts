import { NextRequest, NextResponse } from 'next/server';
import { insertRow, jsonError, listRows } from '@/lib/api-helpers';


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const user_id = searchParams.get('user_id');
  const status = searchParams.get('status');
  const stores = await listRows('stores', [], {
    filters: { user_id, status },
    order: { column: 'created_at', ascending: false },
  });

  return NextResponse.json(stores);
}

export async function POST(req: Request) {
  const body = await req.json();
  const name = String(body.name ?? '').trim();

  if (!name) return jsonError('Nama toko wajib diisi.', 400);

  const fallback = {
    id: `store-${Date.now()}`,
    user_id: body.user_id ?? 'anonymous',
    name,
    description: body.description ?? '',
    logo_url: body.logo_url ?? null,
    status: body.status ?? 'pending',
    created_at: new Date().toISOString(),
  };

  const { data, error } = await insertRow('stores', fallback, fallback);
  if (error) return jsonError(error.message);

  return NextResponse.json(data, { status: 201 });
}
