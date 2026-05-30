/**
 * app/api/orders/route.ts
 * GET: List orders (by buyer_id or store_id).
 * PATCH: Update order status / AWB number.
 */
import { NextRequest, NextResponse } from 'next/server';
import { jsonError, listRows, updateRow } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const buyer_id = searchParams.get('buyer_id');
  const store_id = searchParams.get('store_id');

  const orders = await listRows('orders', [], {
    filters: { buyer_id, store_id },
    order: { column: 'created_at', ascending: false },
    select: '*, order_items(*, products(*))',
  });

  return NextResponse.json(orders);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { order_id, status, awb_number } = body;

  if (!order_id) {
    return jsonError('order_id is required', 400);
  }

  const updateData: any = { updated_at: new Date().toISOString() };
  if (status) updateData.status = status;
  if (awb_number) updateData.awb_number = awb_number;
  if (body.cancellation_reason !== undefined) updateData.cancellation_reason = body.cancellation_reason;
  if (body.cancellation_requested_by !== undefined) updateData.cancellation_requested_by = body.cancellation_requested_by;
  if (body.cancellation_status !== undefined) updateData.cancellation_status = body.cancellation_status;
  if (body.completion_photo_base64 !== undefined) updateData.completion_photo_base64 = body.completion_photo_base64;
  if (body.is_reviewed !== undefined) updateData.is_reviewed = body.is_reviewed;

  const { data, error } = await updateRow('orders', order_id, updateData, {
    id: order_id,
    ...updateData,
  });

  if (error) return jsonError(error.message);
  return NextResponse.json(data);
}
