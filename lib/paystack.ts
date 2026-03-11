import crypto from 'crypto';

function getSecretKey(): string {
    const key = process.env.PAYSTACK_SECRET_KEY;
    if (!key) throw new Error('[PAYSTACK] PAYSTACK_SECRET_KEY is not set');
    return key;
}

export function normalizePhone(phone: string): string {
    let c = phone.replace(/[^0-9]/g, '');
    if (c.startsWith('0')) c = '254' + c.substring(1);
    if (!c.startsWith('254')) c = '254' + c;
    return '+' + c;
}

export function isTestMode(): boolean {
    return getSecretKey().startsWith('sk_test_');
}

export async function initiateMpesaCharge(phone: string, amountKes: number, reference: string) {
    const p = normalizePhone(phone);
    const email = `${p.replace(/[^0-9]/g, '')}@aquapay-water.com`;
    const cents = Math.round(amountKes * 100);
    console.log(`[PAYSTACK] Charging ${p} KES ${amountKes} (${cents} cents)`);

    const res = await fetch('https://api.paystack.co/charge', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getSecretKey()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, amount: cents, currency: 'KES', mobile_money: { phone: p, provider: 'mpesa' }, reference }),
    });
    const data = await res.json();
    console.log('[PAYSTACK]', JSON.stringify(data, null, 2));

    const isPending = data.message === 'Charge attempted' ||
        data.data?.status === 'send_otp' ||
        data.data?.status === 'pay_offline' ||
        data.data?.status === 'pending';

    if (isPending)
        return { success: true, message: data.message, data: data.data };
    if (data.status === true && data.data?.status === 'success')
        return { success: true, message: 'Charge successful', data: data.data };
    return { success: false, message: data.message || 'Charge failed', data: data.data };
}

export async function submitChargeOTP(otp: string, reference: string) {
    console.log(`[PAYSTACK] Submitting OTP for ref: ${reference}`);
    const res = await fetch('https://api.paystack.co/charge/submit_otp', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getSecretKey()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp, reference }),
    });
    const data = await res.json();
    console.log('[PAYSTACK] OTP response:', JSON.stringify(data, null, 2));
    return { success: data.status || data.data?.status === 'success', message: data.message, data: data.data };
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
    return crypto.createHmac('sha512', getSecretKey()).update(body).digest('hex') === signature;
}

export function generateToken(): string {
    return crypto.randomInt(1000, 10000).toString();
}

export function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}
