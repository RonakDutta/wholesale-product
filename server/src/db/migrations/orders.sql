CREATE TABLE orders (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number      VARCHAR(24) UNIQUE NOT NULL,   -- human-readable
    buyer_user_id     UUID NOT NULL REFERENCES users(id),
    buyer_business_id UUID REFERENCES business_profiles(id),
    supplier_id       UUID REFERENCES business_profiles(id), -- when single-supplier order
    status            order_status NOT NULL DEFAULT 'pending',
    subtotal          NUMERIC(14,2) NOT NULL,
    tax_total         NUMERIC(14,2) DEFAULT 0,
    shipping_total    NUMERIC(14,2) DEFAULT 0,
    discount_total    NUMERIC(14,2) DEFAULT 0,
    grand_total       NUMERIC(14,2) NOT NULL,
    currency          CHAR(3) DEFAULT 'INR',
    shipping_address_id UUID REFERENCES addresses(id),
    billing_address_id  UUID REFERENCES addresses(id),
    notes             TEXT,
    placed_at         TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at      TIMESTAMPTZ,
    shipped_at        TIMESTAMPTZ,
    delivered_at      TIMESTAMPTZ,
    cancelled_at      TIMESTAMPTZ
);
CREATE INDEX idx_orders_buyer    ON orders(buyer_user_id);
CREATE INDEX idx_orders_supplier ON orders(supplier_id);
CREATE INDEX idx_orders_status   ON orders(status);

CREATE TABLE order_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    listing_id      UUID NOT NULL REFERENCES product_suppliers(id),
    product_id      UUID NOT NULL REFERENCES products(id),
    supplier_id     UUID NOT NULL REFERENCES business_profiles(id),
    product_name    VARCHAR(255) NOT NULL,   -- snapshot
    quantity        INTEGER NOT NULL,
    unit_price      NUMERIC(12,2) NOT NULL,  -- snapshot
    tax_rate        NUMERIC(5,2),
    line_total      NUMERIC(14,2) NOT NULL,
    status          order_status DEFAULT 'pending'
);
CREATE INDEX idx_oi_order ON order_items(order_id);
CREATE INDEX idx_oi_supplier ON order_items(supplier_id);