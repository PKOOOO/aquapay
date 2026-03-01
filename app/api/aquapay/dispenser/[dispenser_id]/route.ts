// GET /api/aquapay/dispenser/[dispenser_id]
// ESP32 polls this every 3s. Returns LCD text + any dispense command.
// Uses status='paid' → 'dispensing' transition to prevent double-dispense.

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface RouteParams { params: Promise<{ dispenser_id: string }>; }

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { dispenser_id } = await params;

        // Atomically grab a paid order and set it to 'dispensing'
        const orders = await sql`
            UPDATE aquapay_orders
            SET status = 'dispensing'
            WHERE id = (
                SELECT id FROM aquapay_orders
                WHERE dispenser_id=${dispenser_id}
                  AND status='paid'
                ORDER BY paid_at ASC
                LIMIT 1
            )
            RETURNING order_id, amount_ml`;

        if (orders.length > 0) {
            const o = orders[0];
            console.log(`[DISPENSER] Dispense ${o.amount_ml}ml for ${o.order_id}`);
            return NextResponse.json({
                dispense: true,
                order_id: o.order_id,
                amount_ml: o.amount_ml,
            });
        }

        // No dispense needed — return current LCD text
        const lcd = await sql`
            SELECT line1, line2 FROM aquapay_lcd
            WHERE dispenser_id=${dispenser_id}
            LIMIT 1`;

        const line1 = lcd.length > 0 ? lcd[0].line1 : 'AquaPay Ready';
        const line2 = lcd.length > 0 ? lcd[0].line2 : 'Order via app';

        return NextResponse.json({
            dispense: false,
            lcd_line1: line1,
            lcd_line2: line2,
        });

    } catch (error) {
        console.error('[DISPENSER]', error);
        return NextResponse.json({ dispense: false, lcd_line1: 'AquaPay Ready', lcd_line2: 'Order via app' });
    }
}
