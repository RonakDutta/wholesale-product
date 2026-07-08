CREATE TABLE countries (
    id   SMALLINT PRIMARY KEY,
    iso2 CHAR(2) UNIQUE NOT NULL,      -- 'IN' for India
    name VARCHAR(100) NOT NULL,
    phone_code VARCHAR(5)              -- '+91'
);

CREATE TABLE states (
    id          SMALLINT PRIMARY KEY,
    country_id  SMALLINT NOT NULL REFERENCES countries(id),
    name        VARCHAR(100) NOT NULL, -- "Maharashtra"
    gst_code    CHAR(2) UNIQUE NOT NULL -- "27" -- first 2 digits of GSTIN
);

CREATE TABLE cities (
    id          SERIAL PRIMARY KEY,
    state_id    SMALLINT NOT NULL REFERENCES states(id),
    name        VARCHAR(100) NOT NULL, -- "Pune"
    is_active   BOOLEAN DEFAULT TRUE,
    UNIQUE (state_id, name)
);

CREATE TABLE addresses (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_type    VARCHAR(10) NOT NULL,        -- 'user' | 'business'
    owner_id      UUID NOT NULL,
    label         VARCHAR(50),                 -- "Warehouse" "head office"
    line1         TEXT NOT NULL,
    line2         TEXT,
    city_id       INTEGER REFERENCES cities(id),
    state_id      SMALLINT REFERENCES states(id), -- Redundant but fast for GST checks
    pincode       VARCHAR(10) NOT NULL,       -- for logistics
    country_id    SMALLINT NOT NULL DEFAULT 101 REFERENCES countries(id), -- Default to India (assuming 101 is India)
    latitude      NUMERIC(9,6),
    longitude     NUMERIC(9,6),
    is_default    BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_addresses_owner ON addresses(owner_type, owner_id);
CREATE INDEX idx_addresses_pincode ON addresses(pincode);