CREATE TABLE reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_user_id  UUID NOT NULL REFERENCES users(id),
    target_type     review_target NOT NULL,
    product_id      UUID REFERENCES products(id) ON DELETE CASCADE,
    supplier_id     UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
    order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
    rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title           VARCHAR(200),
    body            TEXT,
    images          JSONB,                          -- array of URLs
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    reply           TEXT,
    replied_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_reviews_product  ON reviews(product_id);
CREATE INDEX idx_reviews_supplier ON reviews(supplier_id);

-- Aggregated counters (faster reads)
CREATE TABLE rating_summaries (
    target_type   review_target NOT NULL,
    target_id     UUID NOT NULL,
    avg_rating    NUMERIC(3,2),
    total_reviews INTEGER DEFAULT 0,
    PRIMARY KEY (target_type, target_id)
);