import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyWebhookSignature, generateToken, hashToken } from '@/lib/paystack';

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();
        const sig = request.headers.get('x-paystack-signature') || '';
        if (!verifyWebhookSignature(rawBody, sig))
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

        const event = JSON.parse(rawBody);
        if (event.event === 'charge.success') {
            const ref = event.data.reference;
            const orders = await sql`SELECT id, status FROM aquapay_orders WHERE paystack_ref=${ref} LIMIT 1`;
            if (orders.length > 0 && orders[0].status === 'pending') {
                const token = generateToken();
                await sql`UPDATE aquapay_orders SET status='paid', token_hash=${hashToken(token)}, token_plain=${token}, token_delivered=FALSE, paid_at=NOW() WHERE id=${orders[0].id} AND status='pending'`;
                console.log(`[WEBHOOK] Token ${token} for order ${orders[0].id}`);
            }
        }
        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('[WEBHOOK]', error);
        return NextResponse.json({ received: true });
    }
}
