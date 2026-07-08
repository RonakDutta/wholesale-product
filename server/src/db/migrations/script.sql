-- 0. Extensions (Required for fuzzy search and UUIDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Enums
CREATE TYPE user_role         AS ENUM ('buyer', 'seller', 'both', 'admin');
CREATE TYPE business_type     AS ENUM ('manufacturer', 'wholesaler', 'distributor', 'trader', 'retailer'); -- FIXED: Un-commented
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected', 'expired');
CREATE TYPE order_status      AS ENUM ('draft','pending','confirmed','processing','shipped','delivered','cancelled','returned','refunded');
CREATE TYPE payment_status    AS ENUM ('pending','paid','failed','refunded','partially_refunded');
CREATE TYPE payment_method    AS ENUM ('upi','bank_transfer','card', 'credit', 'cheque', 'cod');
CREATE TYPE shipment_status   AS ENUM ('pending','packed','dispatched','in_transit','delivered','rto');
CREATE TYPE listing_status    AS ENUM ('active','inactive','out_of_stock','discontinued');
CREATE TYPE review_target     AS ENUM ('product','supplier','order');
CREATE TYPE rfq_status        AS ENUM ('open','quoted','awarded','expired','closed');
CREATE TYPE inquiry_status    AS ENUM ('new','responded','converted','lost');

-- 2. Users & Authentication (FIXED: Removed company_id)
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 3. Business Profiles
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
    -- Aggregated metrics
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

-- Link users to businesses (Multi-user teams)
CREATE TABLE business_members (
    business_id  UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role         VARCHAR(30) DEFAULT 'staff',  -- owner/admin/staff/viewer
    joined_at    TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (business_id, user_id)
);

-- 4. Geography
CREATE TABLE countries (
    id   SMALLINT PRIMARY KEY,
    iso2 CHAR(2) UNIQUE NOT NULL,      
    name VARCHAR(100) NOT NULL,
    phone_code VARCHAR(5)              
);

CREATE TABLE states (
    id          SMALLINT PRIMARY KEY,
    country_id  SMALLINT NOT NULL REFERENCES countries(id),
    name        VARCHAR(100) NOT NULL, 
    gst_code    CHAR(2) UNIQUE NOT NULL 
);

CREATE TABLE cities (
    id          SERIAL PRIMARY KEY,
    state_id    SMALLINT NOT NULL REFERENCES states(id),
    name        VARCHAR(100) NOT NULL, 
    is_active   BOOLEAN DEFAULT TRUE,
    UNIQUE (state_id, name)
);

CREATE TABLE addresses (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_type    VARCHAR(10) NOT NULL,        -- 'user' | 'business'
    owner_id      UUID NOT NULL,
    label         VARCHAR(50),                 
    line1         TEXT NOT NULL,
    line2         TEXT,
    city_id       INTEGER REFERENCES cities(id),
    state_id      SMALLINT REFERENCES states(id), 
    pincode       VARCHAR(10) NOT NULL,       
    country_id    SMALLINT NOT NULL DEFAULT 101 REFERENCES countries(id), 
    latitude      NUMERIC(9,6),
    longitude     NUMERIC(9,6),
    is_default    BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_addresses_owner ON addresses(owner_type, owner_id);
CREATE INDEX idx_addresses_pincode ON addresses(pincode);

-- 5. Catalog (Categories, Units, Products)
CREATE TABLE categories (
    id          SERIAL PRIMARY KEY,
    parent_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name        VARCHAR(120) NOT NULL,        
    slug        VARCHAR(140) UNIQUE NOT NULL,
    icon_url    TEXT,
    is_active   BOOLEAN DEFAULT TRUE,
    sort_order  INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_categories_parent ON categories(parent_id);

CREATE TABLE units (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(20) UNIQUE NOT NULL,    
    code VARCHAR(10) UNIQUE NOT NULL     
);

CREATE TABLE products (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug          VARCHAR(200) UNIQUE NOT NULL,
    name          VARCHAR(255) NOT NULL,
    category_id   INTEGER REFERENCES categories(id),
    description   TEXT,
    image_url     TEXT,                   
    unit_id       INTEGER REFERENCES units(id),
    brand         VARCHAR(120),
    model         VARCHAR(120),
    hsn_code      VARCHAR(10),            
    status        VARCHAR(20) DEFAULT 'active',
    view_count    INTEGER DEFAULT 0,
    created_by    UUID REFERENCES users(id),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);  

CREATE TABLE product_images (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    alt_text    TEXT,
    sort_order  INTEGER DEFAULT 0
);

CREATE TABLE product_attributes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    key         VARCHAR(80) NOT NULL,    
    value       TEXT NOT NULL,
    unit        VARCHAR(20)
);

CREATE TABLE product_suppliers (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    supplier_id       UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    sku               VARCHAR(80),
    price             NUMERIC(12,2) NOT NULL,
    discount_price    NUMERIC(12,2),                 
    currency          CHAR(3) DEFAULT 'INR',
    tax_rate          NUMERIC(5,2) DEFAULT 0,        
    moq               INTEGER NOT NULL DEFAULT 1,    
    stock             INTEGER NOT NULL DEFAULT 0,
    lead_time_days    INTEGER,                       
    status            listing_status DEFAULT 'active',
    is_featured       BOOLEAN DEFAULT FALSE,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (product_id, supplier_id)
);
CREATE INDEX idx_ps_product ON product_suppliers(product_id);
CREATE INDEX idx_ps_supplier ON product_suppliers(supplier_id);
CREATE INDEX idx_ps_price ON product_suppliers(price);

-- 6. Carts & Wishlists
CREATE TABLE carts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cart_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id       UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    listing_id    UUID NOT NULL REFERENCES product_suppliers(id) ON DELETE CASCADE,
    quantity      INTEGER NOT NULL CHECK (quantity > 0),
    added_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (cart_id, listing_id)
);

CREATE TABLE wishlists (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE wishlist_items (
    wishlist_id  UUID NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
    product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    added_at     TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (wishlist_id, product_id)
);

-- 7. Orders & Shipments
CREATE TABLE orders (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number      VARCHAR(24) UNIQUE NOT NULL,   
    buyer_user_id     UUID NOT NULL REFERENCES users(id),
    buyer_business_id UUID REFERENCES business_profiles(id),
    supplier_id       UUID REFERENCES business_profiles(id), 
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
    product_name    VARCHAR(255) NOT NULL,   
    quantity        INTEGER NOT NULL,
    unit_price      NUMERIC(12,2) NOT NULL,  
    tax_rate        NUMERIC(5,2),
    line_total      NUMERIC(14,2) NOT NULL,
    status          order_status DEFAULT 'pending'
);
CREATE INDEX idx_oi_order ON order_items(order_id);
CREATE INDEX idx_oi_supplier ON order_items(supplier_id);

CREATE TABLE shipments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    order_item_id   UUID REFERENCES order_items(id) ON DELETE CASCADE,
    carrier         VARCHAR(80),
    tracking_number VARCHAR(80),
    status          shipment_status NOT NULL DEFAULT 'pending',
    shipped_at      TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    eta             DATE,
    metadata        JSONB
);