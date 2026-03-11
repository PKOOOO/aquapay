// POST /api/aquapay/order/cancel — cancel a pending order
// Body: { order_id }
// Only orders with status 'pending' can be cancelled.

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const { order_id } = await request.json();
        if (!order_id) {
            return NextResponse.json({ success: false, error: 'Missing order_id' }, { status: 400 });
        }

        const result = await sql`
            UPDATE aquapay_orders
            SET status = 'cancelled'
            WHERE order_id = ${order_id}
              AND status = 'pending'
            RETURNING id, order_id, status
        `;

        if (result.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Order not found or already paid/cancelled' },
                { status: 404 }
            );
        }

        console.log(`[CANCEL] Order ${order_id} cancelled`);
        return NextResponse.json({ success: true, order_id, message: 'Order cancelled' });
    } catch (error) {
        console.error('[CANCEL]', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
