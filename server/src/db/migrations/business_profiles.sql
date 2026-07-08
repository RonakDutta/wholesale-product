CREATE TABLE business_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name                VARCHAR(200) NOT NULL,        -- "Apex Traders"
    slug                VARCHAR(200) UNIQUE NOT NULL,
    business_type       business_type NOT NULL DEFAULT 'wholesaler',
    gst_number          VARCHAR(15) UNIQUE,           -- 15-char GSTIN
    pan_number          VARCHAR(10) UNIQUE,
    established_year    SMALLINT,                     -- yearsInBusiness source
    description         TEXT,
    logo_url            TEXT,
    -- Aggregated metrics (updated periodically via triggers/jobs)
    rating              NUMERIC(2,1) DEFAULT 0,       -- 4.8
    reviews_count       INTEGER DEFAULT 0,            -- 421
    trust_score         SMALLINT DEFAULT 0,           -- 87 (percent)
    completed_orders    INTEGER DEFAULT 0,            -- 920
    total_products      INTEGER DEFAULT 0,            -- 310
    response_rate       SMALLINT DEFAULT 0,           -- 98 (percent)
    response_time_mins  INTEGER,                      -- 60 (Within 1 hour)
    -- Verification flags
    is_verified         BOOLEAN DEFAULT FALSE,        -- verified
    gst_verified        BOOLEAN DEFAULT FALSE,        -- gstVerified
    gst_verified_at     TIMESTAMPTZ,
    trust_badge_level   SMALLINT DEFAULT 0,           -- 0/1/2/3
    -- Contact
    primary_mobile      VARCHAR(20),                  -- "+91 98765 10101"
    -- Status
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_business_slug ON business_profiles(slug);
CREATE INDEX idx_business_gst  ON business_profiles(gst_number);

-- many users can manage one business 
CREATE TABLE business_members (
    business_id  UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role         VARCHAR(30) DEFAULT 'staff',  -- owner/admin/staff/viewer
    joined_at    TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (business_id, user_id)
);