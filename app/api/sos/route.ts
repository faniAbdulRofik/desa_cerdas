/**
 * app/api/sos/route.ts
 * POST: Create a new emergency (SOS) alert.
 * Persists to Supabase and falls back to mock response.
 */
import { NextRequest, NextResponse } from 'next/server';
import { dummyAlerts } from '@/lib/dummy-data';
import { insertRow, jsonError, listRows } from '@/lib/api-helpers';

export async function GET() {
  const alerts = await listRows('emergency_alerts', dummyAlerts, {
    order: { column: 'created_at', ascending: false },
  });

  return NextResponse.json(alerts);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, description, location, lat, lng, user_id } = body;

  if (!type || !description) {
    return jsonError('Missing required fields', 400);
  }

  const fallback = {
    id: `sos-${Date.now()}`,
    type,
    description,
    location,
    lat: lat ?? null,
    lng: lng ?? null,
    user_id: user_id ?? 'anonymous',
    status: 'active',
    created_at: new Date().toISOString(),
  };

  const { data, error } = await insertRow('emergency_alerts', fallback, fallback);
  if (error) return jsonError(error.message);

  return NextResponse.json(data, { status: 201 });
}
