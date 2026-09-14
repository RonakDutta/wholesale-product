-- Razorpay Route: the buyer's money reaching the wholesaler he bought from.
--
-- Until now every rupee taken through Razorpay landed in ONE account, the
-- platform's, because razorpayService reads a single key pair from the server
-- environment. That is fine for a test checkout and wrong for a marketplace:
-- the money belongs to whichever wholesaler was bought from.
--
-- Route is Razorpay's answer. Each wholesaler becomes a LINKED ACCOUNT under
-- the platform account, a payment carries a transfer to that account, and
-- Razorpay settles to his bank. The platform holds the relationship; Razorpay
-- holds the licence and does the KYC.
--
-- ---------------------------------------------------------------------------
-- WHY THE STATUS IS STORED AND NOT INFERRED
-- ---------------------------------------------------------------------------
-- A linked account exists long before it can be paid into. Razorpay creates
-- it immediately, then verifies the business, and transfers are held until it
-- activates. So "has an account id" and "can receive money" are different
-- facts, and treating the first as the second is how a wholesaler's takings
-- end up parked in the platform's account with no way out.
--
-- razorpay_kyc_status is therefore the gate, and only 'activated' opens it.
-- Everything else, including 'created', means offer him the UPI QR instead.
--
-- ---------------------------------------------------------------------------
-- WHAT THIS DOES NOT DO
-- ---------------------------------------------------------------------------
-- It does not make the platform able to pay anybody. Route splits money
-- COMING IN. Paying a supplier is money going out and is not this; see
-- wholesale3_supplier_payment_details.sql for why that stays a UPI intent the
-- wholesaler sends himself.
--
-- Safe to re-run.

ALTER TABLE wholesaler_profiles
    -- Razorpay's id for his linked account, acc_XXXXXXXXXXXX. NULL until he
    -- starts onboarding.
    ADD COLUMN IF NOT EXISTS razorpay_account_id VARCHAR(40),

    -- Where his onboarding has got to. Deliberately NOT a boolean: a
    -- wholesaler stuck on 'needs_clarification' has to be told what Razorpay
    -- wants, and "not activated" does not say that.
    ADD COLUMN IF NOT EXISTS razorpay_kyc_status VARCHAR(30)
        NOT NULL DEFAULT 'not_started',

    -- Razorpay's own words when it wants something. Shown to him as given,
    -- because a paraphrase of a compliance requirement is worse than useless.
    ADD COLUMN IF NOT EXISTS razorpay_status_note TEXT,

    ADD COLUMN IF NOT EXISTS razorpay_onboarded_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS razorpay_checked_at TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
     WHERE table_name = 'wholesaler_profiles'
       AND constraint_name = 'wholesaler_profiles_razorpay_kyc_status_check'
  ) THEN
    ALTER TABLE wholesaler_profiles
      ADD CONSTRAINT wholesaler_profiles_razorpay_kyc_status_check
      CHECK (razorpay_kyc_status IN (
        'not_started', 'created', 'under_review',
        'needs_clarification', 'activated', 'suspended'));
  END IF;
END $$;

-- One linked account per wholesaler, and one wholesaler per linked account.
-- Two profiles pointing at the same acc_ id would send one man's takings to
-- another, which is the single worst thing this table can get wrong.
CREATE UNIQUE INDEX IF NOT EXISTS idx_wholesaler_razorpay_account
    ON wholesaler_profiles (razorpay_account_id)
    WHERE razorpay_account_id IS NOT NULL;

-- Every transfer Razorpay reports, kept so a wholesaler can be shown what he
-- was actually sent and when, rather than being asked to trust a figure this
-- product worked out for itself.
CREATE TABLE IF NOT EXISTS razorpay_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES users(id) ON DELETE SET NULL,

    razorpay_transfer_id VARCHAR(40) NOT NULL,
    razorpay_payment_id VARCHAR(40),
    razorpay_account_id VARCHAR(40) NOT NULL,

    -- In paise, as Razorpay reports them. Not converted on the way in: this
    -- is their record, and a rounding of our own in the middle would make the
    -- two disagree for no reason.
    amount_paise BIGINT NOT NULL,
    fee_paise BIGINT NOT NULL DEFAULT 0,
    tax_paise BIGINT NOT NULL DEFAULT 0,

    status VARCHAR(30),
    settlement_status VARCHAR(30),
    failure_reason TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (razorpay_transfer_id)
);

CREATE INDEX IF NOT EXISTS idx_razorpay_transfers_order
    ON razorpay_transfers (order_id);
CREATE INDEX IF NOT EXISTS idx_razorpay_transfers_supplier
    ON razorpay_transfers (supplier_id);

-- Webhook deliveries, so the same event arriving twice settles once.
--
-- Razorpay retries until it gets a 2xx, and a retry after a slow success is
-- normal rather than exceptional. Without this a buyer's payment could be
-- applied to his order twice, and the money side of this product has been
-- bitten by exactly that before.
CREATE TABLE IF NOT EXISTS razorpay_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(80) NOT NULL,
    event_type VARCHAR(60),
    payload JSONB,
    handled_at TIMESTAMP,
    error TEXT,
    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (event_id)
);

-- What the platform keeps out of each payment, as a percentage.
--
-- DEFAULTS TO ZERO, so running this migration changes nobody's takings. A
-- commission is a commercial decision somebody has to make and tell their
-- wholesalers about; a plausible-looking five per cent defaulted in here
-- would be money taken from them that nobody agreed to.
--
-- Guarded, because master_settings arrives with its own migration and the two
-- are applied in whatever order the directory sorts in.
DO $$
BEGIN
  IF to_regclass('public.master_settings') IS NOT NULL THEN
    ALTER TABLE master_settings
        ADD COLUMN IF NOT EXISTS platform_commission_percent NUMERIC(5,2)
            NOT NULL DEFAULT 0
            CHECK (platform_commission_percent >= 0
               AND platform_commission_percent < 100);
  ELSE
    RAISE NOTICE 'master_settings does not exist yet, run wholesale3_master_settings.sql to set a commission';
  END IF;
END $$;

COMMENT ON COLUMN wholesaler_profiles.razorpay_kyc_status IS
    'Only ''activated'' means money may be transferred to him. Anything else, offer the UPI QR instead.';
