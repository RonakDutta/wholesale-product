CREATE TABLE rfqs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_number      VARCHAR(24) UNIQUE NOT NULL,
    buyer_user_id   UUID NOT NULL REFERENCES users(id),
    buyer_business_id UUID REFERENCES business_profiles(id),
    product_id      UUID REFERENCES products(id),
    category_id     INTEGER REFERENCES categories(id),
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    required_qty    INTEGER,
    unit_id         INTEGER REFERENCES units(id),
    target_price    NUMERIC(12,2),
    delivery_city_id INTEGER REFERENCES cities(id),
    expected_by     DATE,
    status          rfq_status DEFAULT 'open',
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rfq_quotes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id        UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    supplier_id   UUID NOT NULL REFERENCES business_profiles(id),
    unit_price    NUMERIC(12,2) NOT NULL,
    moq           INTEGER,
    lead_time_days INTEGER,
    validity_date DATE,
    notes         TEXT,
    status        VARCHAR(20) DEFAULT 'submitted', -- awarded/rejected
    submitted_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (rfq_id, supplier_id)
);