CREATE TABLE IF NOT EXISTS aquapay_lcd (
    dispenser_id TEXT PRIMARY KEY,
    line1 TEXT NOT NULL DEFAULT 'AquaPay Ready',
    line2 TEXT NOT NULL DEFAULT 'Order via app',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO aquapay_lcd (dispenser_id) VALUES ('D1') ON CONFLICT DO NOTHING;
