/**
 * app/api/products/route.ts
 * GET: List all UMKM products. POST: Create. PUT: Update. DELETE: Remove.
 */
import { NextRequest, NextResponse } from 'next/server';
import { deleteRow, getRowById, insertRow, jsonError, listRows, updateRow } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const store_id = searchParams.get('store_id');
  const id = searchParams.get('id');

  if (id) {
    const product = await getRowById('products', id);
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(product);
  }

  const products = await listRows('products', [], {
    filters: { store_id },
    order: { column: 'created_at', ascending: false },
  });
  return NextResponse.json(id ? products.find((product: any) => product.id === id) ?? null : products);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, description, price, phone_number, image_url, user_id, category, seller_name, store_id, stock } = body;

  if (!name || !price) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const fallback = {
    id: `product-${Date.now()}`,
    user_id: user_id ?? 'anonymous',
    store_id: store_id ?? null,
    seller_name: seller_name ?? 'UMKM Desa',
    name,
    description: description ?? '',
    price: Number(price),
    phone_number: phone_number ?? '',
    whatsapp: body.whatsapp ?? phone_number ?? '',
    image_url: image_url ?? '',
    category: category ?? 'Makanan',
    stock: Number(stock ?? 0),
    featured: Boolean(body.featured ?? false),
    sales_count: Number(body.sales_count ?? 0),
    rating: Number(body.rating ?? 0),
    created_at: new Date().toISOString(),
  };

  const { data, error } = await insertRow('products', fallback, fallback);
  if (error) return jsonError(error.message);

  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) return jsonError('Missing product id', 400);

  const { data, error } = await updateRow('products', id, updates, { id, ...updates });
  if (error) return jsonError(error.message);
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return jsonError('Missing product id', 400);

  const { error } = await deleteRow('products', id);
  if (error) return jsonError(error.message);
  return NextResponse.json({ deleted: true });
}

