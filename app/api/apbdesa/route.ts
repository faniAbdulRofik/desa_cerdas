import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { jsonError } from '@/lib/api-helpers';

export async function GET() {
  const supabase = getSupabaseServerClient();
  if (!supabase) return jsonError('Database is not configured', 503);

  const { data, error } = await supabase
    .from('apbdesa')
    .select('*')
    .order('year', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[API] Failed to get apbdesa:', error);
    return jsonError(error.message);
  }

  if (!data) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = getSupabaseServerClient();

  if (!supabase) return jsonError('Database is not configured', 503);

  const { data, error } = await supabase
    .from('apbdesa')
    .upsert(body, { onConflict: 'year' })
    .select()
    .single();

  if (error) return jsonError(error.message);
  return NextResponse.json(data);
}
