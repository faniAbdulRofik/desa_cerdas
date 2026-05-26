import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

type QueryOptions = {
  filters?: Record<string, string | number | boolean | null | undefined>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  select?: string;
};

export function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function cleanPayload<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}

export async function listRows<T>(
  table: string,
  fallback: T[],
  options: QueryOptions = {}
) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return applyFallbackOptions(fallback, options);

  let query = supabase.from(table).select(options.select ?? '*');

  for (const [key, value] of Object.entries(options.filters ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      query = query.eq(key, value);
    }
  }

  if (options.order) {
    query = query.order(options.order.column, {
      ascending: options.order.ascending ?? true,
    });
  }

  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) {
    console.error(`[API] Failed to list ${table}:`, error);
    return applyFallbackOptions(fallback, options);
  }

  return (data ?? []) as T[];
}

function applyFallbackOptions<T>(rows: T[], options: QueryOptions) {
  let result = [...rows];

  for (const [key, value] of Object.entries(options.filters ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      result = result.filter((row) => (row as Record<string, unknown>)[key] === value);
    }
  }

  if (options.order) {
    const { column, ascending = true } = options.order;
    result.sort((a, b) => {
      const aValue = (a as Record<string, unknown>)[column];
      const bValue = (b as Record<string, unknown>)[column];
      if (aValue === bValue) return 0;
      return (aValue ?? '') > (bValue ?? '') === ascending ? 1 : -1;
    });
  }

  if (options.limit) result = result.slice(0, options.limit);
  return result;
}

export async function getRowById<T>(
  table: string,
  id: string,
  fallback: T | null,
  select = '*'
) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return fallback;

  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error(`[API] Failed to get ${table}/${id}:`, error);
    return fallback;
  }

  return (data as T | null) ?? fallback;
}

export async function countRows(
  table: string,
  filters: QueryOptions['filters'] = {}
) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      query = query.eq(key, value);
    }
  }

  const { count, error } = await query;
  if (error) {
    console.error(`[API] Failed to count ${table}:`, error);
    return null;
  }

  return count ?? 0;
}

export async function insertRow<T>(
  table: string,
  payload: Record<string, unknown>,
  fallback: T
) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { data: fallback, error: null };

  const { data, error } = await supabase
    .from(table)
    .insert(cleanPayload(payload))
    .select()
    .single();

  return { data: data as T | null, error };
}

export async function updateRow<T>(
  table: string,
  id: string,
  payload: Record<string, unknown>,
  fallback: T
) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { data: fallback, error: null };

  const { data, error } = await supabase
    .from(table)
    .update(cleanPayload({ ...payload, updated_at: new Date().toISOString() }))
    .eq('id', id)
    .select()
    .single();

  return { data: data as T | null, error };
}

export async function deleteRow(table: string, id: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { error: null };

  const { error } = await supabase.from(table).delete().eq('id', id);
  return { error };
}
