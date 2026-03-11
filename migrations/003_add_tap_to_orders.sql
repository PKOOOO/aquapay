ALTER TABLE aquapay_orders
    ADD COLUMN IF NOT EXISTS tap SMALLINT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_orders_dispenser_tap_status
    ON aquapay_orders(dispenser_id, tap, status);

