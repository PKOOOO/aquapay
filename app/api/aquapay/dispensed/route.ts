import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const { order_id } = await request.json();
        if (!order_id) return NextResponse.json({ success: false, error: 'Missing order_id' }, { status: 400 });

        const result = await sql`UPDATE aquapay_orders SET status='dispensed', dispensed_at=NOW() WHERE order_id=${order_id} AND status IN ('paid', 'dispensing') RETURNING id`;
        if (result.length === 0) return NextResponse.json({ success: false, error: 'No active order' }, { status: 404 });

        console.log(`[DISPENSED] ${order_id}`);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[DISPENSED]', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
