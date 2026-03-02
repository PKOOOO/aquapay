import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { initiateMpesaCharge } from '@/lib/paystack';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const { phone, dispenser_id, amount_ml } = await request.json();
        if (!phone || !dispenser_id || !amount_ml)
            return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
        if (![250, 500, 1000].includes(amount_ml))
            return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 });

        const amountCents = Math.round((amount_ml / 100) * 100);
        const amountKes = amountCents / 100;

        // Auto-expire stale orders older than 3 minutes
        await sql`UPDATE aquapay_orders SET status='expired'
                  WHERE dispenser_id=${dispenser_id}
                    AND status IN ('pending','paid','dispensing')
                    AND created_at < NOW() - INTERVAL '3 minutes'`;

        const existing = await sql`SELECT id FROM aquapay_orders WHERE dispenser_id=${dispenser_id} AND status IN ('pending','paid','dispensing') LIMIT 1`;
        if (existing.length > 0)
            return NextResponse.json({ success: false, error: 'Dispenser has pending order' }, { status: 409 });

        const orderId = `AQ_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const ref = `aquapay_${orderId}`;

        // Send M-Pesa STK push (fire and forget — we don't wait for payment confirmation)
        initiateMpesaCharge(phone, amountKes, ref).catch((err) => {
            console.error(`[ORDER] STK push failed for ${orderId}:`, err);
        });

        // Immediately mark as paid so the ESP32 dispenses right away
        await sql`INSERT INTO aquapay_orders (order_id, dispenser_id, phone, amount_ml, amount_kes, status, paystack_ref, paid_at)
              VALUES (${orderId}, ${dispenser_id}, ${phone}, ${amount_ml}, ${amountCents}, 'paid', ${ref}, NOW())`;

        console.log(`[ORDER] ${orderId}: ${amount_ml}ml, KES ${amountKes}, phone ${phone} — marked paid immediately`);

        return NextResponse.json({ success: true, order_id: orderId, amount_ml, amount_kes: amountCents });
    } catch (error) {
        console.error('[ORDER]', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
