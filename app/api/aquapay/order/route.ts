import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { initiateMpesaCharge, isTestMode, submitChargeOTP } from '@/lib/paystack';
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

        // Auto-expire stale pending/paid orders older than 3 minutes
        await sql`UPDATE aquapay_orders SET status='expired'
                  WHERE dispenser_id=${dispenser_id}
                    AND status IN ('pending','paid')
                    AND created_at < NOW() - INTERVAL '3 minutes'`;

        const existing = await sql`SELECT id FROM aquapay_orders WHERE dispenser_id=${dispenser_id} AND status IN ('pending','paid') LIMIT 1`;
        if (existing.length > 0)
            return NextResponse.json({ success: false, error: 'Dispenser has pending order' }, { status: 409 });

        const orderId = `AQ_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const ref = `aquapay_${orderId}`;

        await sql`INSERT INTO aquapay_orders (order_id, dispenser_id, phone, amount_ml, amount_kes, status, paystack_ref)
              VALUES (${orderId}, ${dispenser_id}, ${phone}, ${amount_ml}, ${amountCents}, 'pending', ${ref})`;

        const charge = await initiateMpesaCharge(phone, amountKes, ref);
        if (!charge.success) {
            await sql`UPDATE aquapay_orders SET status='failed' WHERE order_id=${orderId}`;
            return NextResponse.json({ success: false, error: 'Payment failed: ' + charge.message }, { status: 502 });
        }

        if (isTestMode() && charge.data?.status === 'send_otp') {
            console.log(`[ORDER] Test mode — auto-submitting OTP "123456"`);
            await submitChargeOTP('123456', charge.data?.reference || ref);
        }

        return NextResponse.json({ success: true, order_id: orderId, amount_ml, amount_kes: amountCents });
    } catch (error) {
        console.error('[ORDER]', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
