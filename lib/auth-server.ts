/**
 * lib/auth-server.ts
 * Server-side authentication helpers backed by Supabase Auth.
 *
 * - Passwords are hashed and stored by Supabase (never by us).
 * - Sessions are stateless JWTs verified against Supabase.
 * - Admin operations use the service-role key (server-only).
 *
 * Account model:
 *   role:   'warga' | 'admin'   (admins are created manually, never via register)
 *   status: 'active' | 'pending' | 'suspended'
 *
 * Approval mode is controlled by REQUIRE_ADMIN_APPROVAL (env):
 *   - "false"/unset  -> new citizens are immediately 'active' (default)
 *   - "true"         -> new citizens are 'pending' and cannot log in until
 *                       an admin approves them.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type AppRole = 'warga' | 'admin';
export type AppStatus = 'active' | 'pending' | 'suspended';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  status: AppStatus;
  avatar: string;
  created_at: string;
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Admin client (service role) — full access, server-only. */
export function getAdminAuthClient(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Anon client — used to verify passwords via signInWithPassword. */
export function getAnonAuthClient(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function requireApproval() {
  return process.env.REQUIRE_ADMIN_APPROVAL === 'true';
}

export function initials(name: string) {
  return (
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U'
  );
}

/** Map a Supabase auth user record into our app shape. */
export function toAuthUser(u: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  created_at?: string;
}): AuthUser {
  const meta = u.user_metadata ?? {};
  const name = String(meta.name ?? u.email?.split('@')[0] ?? 'Pengguna');
  return {
    id: u.id,
    email: u.email ?? '',
    name,
    role: (meta.role as AppRole) === 'admin' ? 'admin' : 'warga',
    status: (['active', 'pending', 'suspended'].includes(meta.status as string)
      ? (meta.status as AppStatus)
      : 'active'),
    avatar: String(meta.avatar ?? initials(name)),
    created_at: u.created_at ?? new Date().toISOString(),
  };
}

/** Find an auth user by email (admin). Returns null if not found. */
export async function findUserByEmail(email: string) {
  const admin = getAdminAuthClient();
  if (!admin) return null;

  const target = email.trim().toLowerCase();
  // Paginate through users (small village scale; cap a few pages).
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data) return null;
    const match = data.users.find((u) => u.email?.toLowerCase() === target);
    if (match) return match;
    if (data.users.length < 200) break;
  }
  return null;
}
