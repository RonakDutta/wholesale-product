CREATE TABLE payments (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_gateway   VARCHAR(40),                 -- razorpay/stripe/manual
    gateway_txn_id    VARCHAR(120),
    method            payment_method NOT NULL,
    amount            NUMERIC(14,2) NOT NULL,
    currency          CHAR(3) DEFAULT 'INR',
    status            payment_status NOT NULL DEFAULT 'pending',
    paid_at           TIMESTAMPTZ,
    failure_reason    TEXT,
    metadata          JSONB,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_payments_order ON payments(order_id);