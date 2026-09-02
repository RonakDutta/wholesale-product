-- Credit limit and pay-later support. This runs after the Wholesale 3.0 cleanup
-- migrations, which remove legacy credit fields from parties.
ALTER TABLE parties
  ADD COLUMN IF NOT EXISTS credit_limit numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_period_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS outstanding_balance numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS available_credit numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_status varchar(20) NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS last_payment_date date,
  ADD COLUMN IF NOT EXISTS overdue_amount numeric(12,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  party_id uuid NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  transaction_type varchar(30) NOT NULL CHECK (transaction_type IN ('credit_sale','payment_received','adjustment','overdue_penalty','refund')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  balance_after numeric(12,2) NOT NULL CHECK (balance_after >= 0),
  due_date date,
  payment_method varchar(30),
  notes text,
  idempotency_key varchar(120) UNIQUE,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS credit_account_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  party_id uuid NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  action varchar(40) NOT NULL,
  old_values jsonb NOT NULL,
  new_values jsonb NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_party_date ON credit_transactions(party_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_seller_date ON credit_transactions(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_due_date ON credit_transactions(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credit_accounts_seller_status ON parties(wholesaler_id, credit_status);

DO $$
DECLARE con RECORD;
BEGIN
  FOR con IN SELECT conname FROM pg_constraint
    WHERE conrelid = 'orders'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%payment_status%'
  LOOP
    EXECUTE format('ALTER TABLE orders DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;
ALTER TABLE orders ADD CONSTRAINT chk_order_payment_status CHECK (payment_status IN (
  'pending', 'payment_pending', 'credit_pending', 'paid', 'partial',
  'partially_paid', 'failed', 'cod', 'refunded'
));

UPDATE parties
SET available_credit = GREATEST(credit_limit - outstanding_balance, 0),
    credit_status = CASE
      WHEN credit_limit <= 0 THEN 'inactive'
      WHEN outstanding_balance > credit_limit THEN 'blocked'
      WHEN outstanding_balance >= credit_limit * 0.8 THEN 'warning'
      ELSE 'active'
    END;
