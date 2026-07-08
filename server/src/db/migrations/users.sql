-- enums
CREATE TYPE user_role         AS ENUM ('buyer', 'seller', 'both', 'admin');
CREATE TYPE business_type     AS ENUM ('manufacturer', 'wholesaler', 'distributor', 'trader', 'retailer');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected', 'expired');
CREATE TYPE order_status      AS ENUM ('draft','pending','confirmed','processing','shipped','delivered','cancelled','returned','refunded');
CREATE TYPE payment_status    AS ENUM ('pending','paid','failed','refunded','partially_refunded');
CREATE TYPE payment_method AS ENUM ('upi','bank_transfer','card', 'credit', 'cheque', 'cod');
CREATE TYPE shipment_status   AS ENUM ('pending','packed','dispatched','in_transit','delivered','rto');
CREATE TYPE listing_status    AS ENUM ('active','inactive','out_of_stock','discontinued');
CREATE TYPE review_target     AS ENUM ('product','supplier','order');
CREATE TYPE rfq_status        AS ENUM ('open','quoted','awarded','expired','closed');
CREATE TYPE inquiry_status    AS ENUM ('new','responded','converted','lost');

-- users and auth
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id         UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    full_name       VARCHAR(150) NOT NULL,
    email           CITEXT UNIQUE NOT NULL,
    phone           VARCHAR(20) UNIQUE,
    password_hash   TEXT NOT NULL,
    role            user_role NOT NULL DEFAULT 'buyer',
    avatar_url      TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    email_verified  BOOLEAN DEFAULT FALSE,
    phone_verified  BOOLEAN DEFAULT FALSE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_company ON users (company_id);
