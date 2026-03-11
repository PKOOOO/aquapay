import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
    try {
        const orders = await sql`
            SELECT id, order_id, dispenser_id, tap, phone, amount_ml, amount_kes, status, created_at, paid_at, dispensed_at
            FROM aquapay_orders
            ORDER BY created_at DESC
            LIMIT 100`;
        const stats = await sql`SELECT
      COUNT(*) FILTER (WHERE status='dispensed') as total_dispensed,
      COUNT(*) FILTER (WHERE status IN ('pending','paid')) as active_orders,
      COALESCE(SUM(amount_ml) FILTER (WHERE status='dispensed'),0) as total_ml,
      COALESCE(SUM(amount_kes) FILTER (WHERE status='dispensed'),0) as total_revenue
    FROM aquapay_orders`;
        return NextResponse.json({ success: true, stats: stats[0], count: orders.length, orders });
    } catch (error) {
        console.error('[DASHBOARD]', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
