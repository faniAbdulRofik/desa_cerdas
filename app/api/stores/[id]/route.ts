/**
 * app/api/stores/[id]/route.ts
 * PATCH: Update store (admin approval/rejection or seller edit).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getRowById, jsonError, updateRow } from '@/lib/api-helpers';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getRowById('stores', id, null);

  if (!store) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(store);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const { data, error } = await updateRow('stores', id, body, { id, ...body });

  if (error) return jsonError(error.message);
  return NextResponse.json(data);
}
