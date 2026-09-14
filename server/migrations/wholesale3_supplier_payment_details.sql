-- How to pay a supplier, and what the payment was called when you did.
--
-- Paying a mill today means leaving this product, opening a UPI app, typing
-- his VPA from memory or off an old bill, typing the amount, paying, then
-- coming back and typing the amount a second time into the book. Two chances
-- to fat finger a figure and one to pay the wrong person.
--
-- These columns let the product hand him a UPI intent with the payee and the
-- amount already filled in, and record what came back.
--
-- ---------------------------------------------------------------------------
-- WHAT THIS IS NOT
-- ---------------------------------------------------------------------------
-- This is NOT a payout rail and must not grow into one. Nothing here lets the
-- product move money: the wholesaler pays from his own UPI app, to his own
-- supplier, and comes back and says what he paid. The platform never holds a
-- rupee of it and never instructs a bank.
--
-- That matters because a supplier is a private row in ONE wholesaler's book.
-- He has no login, no account, no KYC and has consented to nothing. Pushing
-- money at a name and a phone number somebody typed into a private ledger is
-- what RazorpayX exists for, and it is right that it demands far more than
-- this table has.
--
-- So the payment stays SELF DECLARED, exactly like the buyer side QR: the
-- reference below is what the wholesaler says the bank gave him, and nothing
-- verifies it. The screens say so rather than implying a confirmation the
-- product cannot make.
--
-- ---------------------------------------------------------------------------
-- Private to the wholesaler, like suppliers.notes. A supplier's bank details
-- are his, held here only because his customer needs them to pay him, and are
-- never shown to anybody else.
--
-- Safe to re-run.

DO $$
BEGIN
  IF to_regclass('public.suppliers') IS NOT NULL THEN
    ALTER TABLE suppliers
        ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100),
        ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(30),
        ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(11);
  ELSE
    RAISE NOTICE 'suppliers does not exist yet, run wholesale3_purchases.sql first';
  END IF;
END $$;

-- What the bank called the payment. A UTR for UPI or NEFT, a cheque number
-- otherwise. Kept apart from `note`, which is the wholesaler's own words:
-- "paid at the mill, Diwali advance" is not a reference, and a reconciliation
-- against a bank statement needs the reference on its own.
DO $$
BEGIN
  IF to_regclass('public.supplier_payments') IS NOT NULL THEN
    ALTER TABLE supplier_payments
        ADD COLUMN IF NOT EXISTS reference VARCHAR(50);
  ELSE
    RAISE NOTICE 'supplier_payments does not exist yet, run wholesale3_purchases.sql first';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.suppliers') IS NOT NULL THEN
    EXECUTE $c$
      COMMENT ON COLUMN suppliers.upi_id IS
        'The supplier''s own VPA, used to build a UPI intent the wholesaler pays from his own app. The platform never holds or moves this money.'
    $c$;
  END IF;
END $$;
