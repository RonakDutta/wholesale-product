-- Multiple marketplace and channel linkages with independent series numbers.
--
-- Extends sales channels so a wholesaler can connect multiple marketplace
-- accounts (e.g. two Amazon stores or multiple Flipkart accounts) and give
-- each linkage its own independent series of numbers for orders, sales, and
-- invoices.
--
-- Run by hand against Neon, like every other file in this directory.

-- 1. Relax channel check constraints on sales and invoices so custom linkage codes are accepted.
ALTER TABLE IF EXISTS sales
    DROP CONSTRAINT IF EXISTS sales_channel_check;

ALTER TABLE IF EXISTS sales
    ALTER COLUMN channel TYPE VARCHAR(64);

ALTER TABLE IF EXISTS invoices
    DROP CONSTRAINT IF EXISTS invoices_channel_check;

ALTER TABLE IF EXISTS invoices
    ALTER COLUMN channel TYPE VARCHAR(64);

-- 2. Add channel to orders so marketplace orders record which linkage they belong to.
ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS channel VARCHAR(64) DEFAULT 'shop';

-- 3. Expand series length in invoice_sequences.
ALTER TABLE IF EXISTS invoice_sequences
    ALTER COLUMN series TYPE VARCHAR(64);

-- 4. Add series column to sale_sequences for independent runs per channel.
ALTER TABLE IF EXISTS sale_sequences
    ADD COLUMN IF NOT EXISTS series VARCHAR(64) NOT NULL DEFAULT 'counter';

ALTER TABLE IF EXISTS sale_sequences
    DROP CONSTRAINT IF EXISTS sale_sequences_pkey;

ALTER TABLE IF EXISTS sale_sequences
    ADD CONSTRAINT sale_sequences_pkey PRIMARY KEY (wholesaler_id, financial_year, series);

-- 5. Add series column to order_sequences for independent runs per channel.
ALTER TABLE IF EXISTS order_sequences
    ADD COLUMN IF NOT EXISTS series VARCHAR(64) NOT NULL DEFAULT 'shop';

ALTER TABLE IF EXISTS order_sequences
    DROP CONSTRAINT IF EXISTS order_sequences_pkey;

ALTER TABLE IF EXISTS order_sequences
    ADD CONSTRAINT order_sequences_pkey PRIMARY KEY (wholesaler_id, financial_year, series);

-- 6. Table to store marketplace and channel linkages per wholesaler.
CREATE TABLE IF NOT EXISTS marketplace_linkages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wholesaler_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    marketplace VARCHAR(32) NOT NULL,
    linkage_name VARCHAR(100) NOT NULL,
    code VARCHAR(64) NOT NULL,
    invoice_prefix VARCHAR(10) NOT NULL,
    sale_prefix VARCHAR(10) NOT NULL,
    order_prefix VARCHAR(10) NOT NULL,
    number_suffix VARCHAR(16) DEFAULT '/{FY}',
    number_pad_to INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_linkage_wholesaler_code
    ON marketplace_linkages (wholesaler_id, code);

CREATE INDEX IF NOT EXISTS idx_linkage_wholesaler_active
    ON marketplace_linkages (wholesaler_id, is_active);

COMMENT ON TABLE marketplace_linkages IS
    'Configured marketplace linkages per wholesaler, each with its own independent document series.';
