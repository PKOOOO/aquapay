import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface RouteParams { params: Promise<{ order_id: string }>; }

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { order_id } = await params;
        const orders = await sql`
      SELECT id, token_plain, status FROM aquapay_orders
      WHERE order_id=${order_id} AND status='paid' AND token_delivered=FALSE AND token_plain IS NOT NULL LIMIT 1`;

        if (orders.length === 0) return NextResponse.json({ paid: false });

        const o = orders[0];
        await sql`UPDATE aquapay_orders SET token_delivered=TRUE, token_plain=NULL WHERE id=${o.id} AND token_delivered=FALSE`;
        console.log(`[STATUS] Token delivered for ${order_id}`);
        return NextResponse.json({ paid: true, token: o.token_plain });
    } catch (error) {
        console.error('[STATUS]', error);
        return NextResponse.json({ paid: false, error: 'Internal server error' }, { status: 500 });
    }
}
