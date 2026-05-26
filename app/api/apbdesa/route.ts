import { NextRequest, NextResponse } from 'next/server';
import { dummyAPBDesa } from '@/lib/dummy-data';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { jsonError } from '@/lib/api-helpers';

export async function GET() {
  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json(dummyAPBDesa);

  const { data, error } = await supabase
    .from('apbdesa')
    .select('*')
    .order('year', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[API] Failed to get apbdesa:', error);
    return NextResponse.json(dummyAPBDesa);
  }

  return NextResponse.json(data ?? dummyAPBDesa);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = getSupabaseServerClient();

  if (!supabase) return NextResponse.json({ ...dummyAPBDesa, ...body });

  const { data, error } = await supabase
    .from('apbdesa')
    .upsert(body, { onConflict: 'year' })
    .select()
    .single();

  if (error) return jsonError(error.message);
  return NextResponse.json(data);
}
