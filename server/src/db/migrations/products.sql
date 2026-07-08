CREATE TABLE categories (
    id          SERIAL PRIMARY KEY,
    parent_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name        VARCHAR(120) NOT NULL,        -- "Packaging", "Electronics"
    slug        VARCHAR(140) UNIQUE NOT NULL,
    icon_url    TEXT,
    is_active   BOOLEAN DEFAULT TRUE,
    sort_order  INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE TABLE units (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(20) UNIQUE NOT NULL,    -- 'piece','kg','ton','meter','carton'
    code VARCHAR(10) UNIQUE NOT NULL     -- 'PCS','KG'
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
    hsn_code      VARCHAR(10),      -- for GST
    status        VARCHAR(20) DEFAULT 'active',
    view_count    INTEGER DEFAULT 0,
    created_by    UUID REFERENCES users(id),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);  -- fuzzy search

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
    key         VARCHAR(80) NOT NULL,    -- "voltage", "material"
    value       TEXT NOT NULL,
    unit        VARCHAR(20)
);