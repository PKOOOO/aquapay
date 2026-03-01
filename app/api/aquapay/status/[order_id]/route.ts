// GET /api/aquapay/status/[order_id]
// The Expo app polls this to know when payment is confirmed.
// Does NOT touch token_delivered — that flag is reserved for the ESP32 dispenser route.

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface RouteParams { params: Promise<{ order_id: string }>; }

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { order_id } = await params;
        const orders = await sql`
            SELECT id, status FROM aquapay_orders
            WHERE order_id=${order_id} AND status='paid'
            LIMIT 1`;

        if (orders.length === 0) return NextResponse.json({ paid: false });

        console.log(`[STATUS] Payment confirmed for ${order_id}`);
        return NextResponse.json({ paid: true });
    } catch (error) {
        console.error('[STATUS]', error);
        return NextResponse.json({ paid: false, error: 'Internal server error' }, { status: 500 });
    }
}
