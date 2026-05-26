import { NextRequest, NextResponse } from 'next/server';
import { dummyModules } from '@/lib/dummy-data';
import { deleteRow, getRowById, jsonError, updateRow } from '@/lib/api-helpers';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fallback = dummyModules.find((trainingModule) => trainingModule.id === id) ?? null;
  const trainingModule = await getRowById('training_modules', id, fallback);

  if (!trainingModule) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(trainingModule);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updates = await request.json();
  const { data, error } = await updateRow('training_modules', id, updates, { id, ...updates });

  if (error) return jsonError(error.message);
  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await deleteRow('training_modules', id);

  if (error) return jsonError(error.message);
  return NextResponse.json({ deleted: true });
}
