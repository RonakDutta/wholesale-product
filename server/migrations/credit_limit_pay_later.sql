-- Credit Limit and Pay Later
-- Run manually after wholesale3_parties_and_sales.sql.

ALTER TABLE parties
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_period_days INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS available_credit NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_status VARCHAR(20) NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS last_payment_date DATE,
  ADD COLUMN IF NOT EXISTS overdue_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE parties
  DROP CONSTRAINT IF EXISTS parties_credit_status_check;
ALTER TABLE parties
  ADD CONSTRAINT parties_credit_status_check
  CHECK (credit_status IN ('inactive', 'active', 'warning', 'blocked'));

ALTER TABLE parties
  DROP CONSTRAINT IF EXISTS parties_credit_values_check;
ALTER TABLE parties
  ADD CONSTRAINT parties_credit_values_check
  CHECK (credit_limit >= 0 AND credit_period_days BETWEEN 1 AND 3650
         AND outstanding_balance >= 0 AND available_credit >= 0
         AND overdue_amount >= 0);

UPDATE parties
SET available_credit = GREATEST(credit_limit - outstanding_balance, 0),
    credit_status = CASE
      WHEN credit_limit <= 0 THEN 'inactive'
      WHEN outstanding_balance > credit_limit THEN 'blocked'
      WHEN outstanding_balance >= credit_limit * 0.8 THEN 'warning'
      ELSE 'active'
    END;

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN
    ('credit_sale', 'payment_received', 'adjustment', 'overdue_penalty', 'refund')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  balance_after NUMERIC(12, 2) NOT NULL CHECK (balance_after >= 0),
  due_date DATE,
  payment_method VARCHAR(30),
  notes TEXT,
  idempotency_key VARCHAR(120),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_party_date
  ON credit_transactions (party_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_seller_date
  ON credit_transactions (seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_due_date
  ON credit_transactions (seller_id, due_date)
  WHERE transaction_type = 'credit_sale' AND due_date IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_transactions_idempotency
  ON credit_transactions (seller_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS credit_account_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  action VARCHAR(40) NOT NULL,
  old_values JSONB NOT NULL,
  new_values JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credit_account_audit_party_date
  ON credit_account_audit (party_id, created_at DESC);

ALTER TABLE payment_transactions
  DROP CONSTRAINT IF EXISTS payment_transactions_status_check;
ALTER TABLE payment_transactions
  ADD CONSTRAINT payment_transactions_status_check CHECK (
    payment_status IN ('pending', 'completed', 'paid', 'failed', 'superseded', 'credit_pending')
  );

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_payment_status_check CHECK (
    payment_status IN ('pending', 'partial', 'partially_paid', 'paid', 'completed', 'failed', 'cod', 'credit_pending')
  );