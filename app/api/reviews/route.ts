import { NextRequest, NextResponse } from 'next/server';
import { jsonError, listRows } from '@/lib/api-helpers';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const product_id = searchParams.get('product_id');
  const order_id = searchParams.get('order_id');

  const reviews = await listRows('reviews', [], {
    filters: { product_id, order_id },
    order: { column: 'created_at', ascending: false },
    select: '*, orders(buyer_name, completion_photo_base64)',
  });

  return NextResponse.json(reviews);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id, product_id, buyer_id, rating, comment } = body;

    if (!order_id || !product_id || !buyer_id || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({
        id: `review-${Date.now()}`,
        order_id,
        product_id,
        buyer_id,
        rating,
        comment,
        created_at: new Date().toISOString(),
      }, { status: 201 });
    }

    // Insert review
    const { data, error } = await supabase
      .from('reviews')
      .insert([{ order_id, product_id, buyer_id, rating, comment }])
      .select()
      .single();

    if (error) {
       // Check for duplicate constraint
       if (error.code === '23505') {
          return NextResponse.json({ error: 'Anda sudah memberikan ulasan untuk produk ini.' }, { status: 409 });
       }
       throw error;
    }

    // Mark order as reviewed
    await supabase.from('orders').update({ is_reviewed: true }).eq('id', order_id);

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error('Review API Error:', err);
    return jsonError(err.message);
  }
}
