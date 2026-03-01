// GET /api/aquapay/dispenser/[dispenser_id]
// ESP32 polls this every 3s. Returns LCD text + any dispense command.

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface RouteParams { params: Promise<{ dispenser_id: string }>; }

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { dispenser_id } = await params;

        // 1. Check for a paid order ready to dispense
        const orders = await sql`
            SELECT id, order_id, amount_ml FROM aquapay_orders
            WHERE dispenser_id=${dispenser_id}
              AND status='paid'
              AND token_delivered=FALSE
            ORDER BY paid_at ASC
            LIMIT 1`;

        if (orders.length > 0) {
            const o = orders[0];
            // Mark as delivered so we don't dispense twice
            await sql`UPDATE aquapay_orders SET token_delivered=TRUE WHERE id=${o.id} AND token_delivered=FALSE`;
            console.log(`[DISPENSER] Dispense ${o.amount_ml}ml for ${o.order_id}`);
            return NextResponse.json({
                dispense: true,
                order_id: o.order_id,
                amount_ml: o.amount_ml,
            });
        }

        // 2. No dispense needed — return current LCD text
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
