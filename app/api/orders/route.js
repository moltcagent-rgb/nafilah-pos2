import { NextResponse } from 'next/server';
import { listOrders, createOrder } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const limit = searchParams.get('limit') || undefined;
    const statusesParam = searchParams.get('statuses');
    const statuses = statusesParam ? statusesParam.split(',').filter(Boolean) : undefined;
    const orders = await listOrders({ from, to, limit, statuses });
    return NextResponse.json({ data: orders });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const order = await createOrder({
      customer_name: body.customer_name,
      items: body.items,
      total: body.total,
      status: body.status,
    });
    return NextResponse.json({ data: order }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
