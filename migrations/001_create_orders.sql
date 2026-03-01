CREATE TABLE IF NOT EXISTS aquapay_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id TEXT UNIQUE NOT NULL,
    dispenser_id TEXT NOT NULL DEFAULT 'D1',
    phone TEXT NOT NULL,
    amount_ml INTEGER NOT NULL,
    amount_kes INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    paystack_ref TEXT,
    token_plain TEXT,
    token_hash TEXT,
    token_delivered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    dispensed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_orders_dispenser_status ON aquapay_orders(dispenser_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_paystack_ref ON aquapay_orders(paystack_ref);
