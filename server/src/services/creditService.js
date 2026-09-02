const pool = require("../config/db");

const PAYMENT_METHODS = new Set(["upi", "cash", "bank", "cheque"]);
const ACTIVE_STATUSES = new Set(["active", "warning"]);

const statusFor = (limit, outstanding, forcedStatus) => {
  if (forcedStatus === "blocked") return "blocked";
  if (Number(limit) <= 0) return "inactive";
  if (Number(outstanding) > Number(limit)) return "blocked";
  if (Number(outstanding) >= Number(limit) * 0.8) return "warning";
  return "active";
};

const accountSelect = `
  SELECT p.*, p.credit_limit - p.outstanding_balance AS calculated_available_credit,
    (SELECT MIN(ct.due_date) FROM credit_transactions ct
      WHERE ct.party_id = p.id AND ct.seller_id = p.wholesaler_id
        AND ct.transaction_type = 'credit_sale' AND ct.balance_after > 0
        AND ct.due_date IS NOT NULL) AS next_due_date
  FROM parties p`;

async function getOwnedParty(client, sellerId, partyId, lock = false) {
  const result = await client.query(
    `${accountSelect} WHERE p.id = $1 AND p.wholesaler_id = $2${lock ? " FOR UPDATE" : ""}`,
    [partyId, sellerId],
  );
  return result.rows[0] || null;
}

async function configureAccount({ sellerId, partyId, creditLimit, creditPeriodDays, creditStatus }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const current = await getOwnedParty(client, sellerId, partyId, true);
    if (!current) {
      await client.query("ROLLBACK");
      return { error: "not_found" };
    }
    const nextLimit = creditLimit === undefined ? Number(current.credit_limit) : Number(creditLimit);
    const nextPeriod = creditPeriodDays === undefined ? Number(current.credit_period_days) : Number(creditPeriodDays);
    if (!Number.isFinite(nextLimit) || nextLimit < 0 || !Number.isFinite(nextPeriod) || nextPeriod < 1 || nextPeriod > 365) {
      await client.query("ROLLBACK");
      return { error: "invalid" };
    }
    const nextStatus = statusFor(nextLimit, current.outstanding_balance, creditStatus);
    const updated = await client.query(
      `UPDATE parties SET credit_limit = $1, credit_period_days = $2,
         available_credit = GREATEST($1 - outstanding_balance, 0), credit_status = $3,
         updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *`,
      [nextLimit, nextPeriod, nextStatus, partyId],
    );
    await client.query(
      `INSERT INTO credit_account_audit (seller_id, party_id, action, old_values, new_values)
       VALUES ($1, $2, 'settings_updated', $3::jsonb, $4::jsonb)`,
      [sellerId, partyId, JSON.stringify(current), JSON.stringify(updated.rows[0])],
    );
    await client.query("COMMIT");
    return { account: updated.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

async function recordCreditSale(client, { sellerId, partyId, orderId, amount }) {
  const account = await getOwnedParty(client, sellerId, partyId, true);
  if (!account || !ACTIVE_STATUSES.has(account.credit_status)) throw new Error("This customer is not eligible for credit.");
  const total = Number(amount);
  if (!Number.isFinite(total) || total <= 0) throw new Error("Invalid credit amount.");
  const available = Number(account.credit_limit) - Number(account.outstanding_balance);
  if (total > available) throw new Error("This order exceeds the customer's available credit.");
  const outstanding = Number(account.outstanding_balance) + total;
  const dueDate = new Date(Date.now() + Number(account.credit_period_days) * 86400000).toISOString().slice(0, 10);
  const nextStatus = statusFor(account.credit_limit, outstanding);
  await client.query(
    `UPDATE parties SET outstanding_balance = $1, available_credit = GREATEST(credit_limit - $1, 0), credit_status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
    [outstanding, nextStatus, partyId],
  );
  await client.query(
    `INSERT INTO credit_transactions (seller_id, party_id, order_id, transaction_type, amount, balance_after, due_date, notes)
     VALUES ($1, $2, $3, 'credit_sale', $4, $5, $6, 'Pay on Credit order')`,
    [sellerId, partyId, orderId, total, outstanding, dueDate],
  );
  return { dueDate, outstanding, availableCredit: Math.max(Number(account.credit_limit) - outstanding, 0) };
}

  async function getBuyerEligibility(buyerId, supplierId) {
    const result = await pool.query(
      `${accountSelect} WHERE p.user_id = $1 AND p.wholesaler_id = $2`,
      [buyerId, supplierId],
    );
    const account = result.rows[0];
    if (!account) return { eligible: false, reason: "No credit account with this wholesaler." };
    const eligible = ACTIVE_STATUSES.has(account.credit_status);
    return { eligible, reason: eligible ? null : "Your credit account is not active.", account };
  }
module.exports = { accountSelect, getOwnedParty, configureAccount, recordCreditSale, receivePayment, getBuyerEligibility, statusFor };

async function receivePayment({ sellerId, partyId, amount, paymentMethod, notes, idempotencyKey }) {
  if (!PAYMENT_METHODS.has(paymentMethod)) return { error: "invalid_method" };
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return { error: "invalid_amount" };
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (idempotencyKey) {
      const duplicate = await client.query("SELECT * FROM credit_transactions WHERE idempotency_key = $1", [idempotencyKey]);
      if (duplicate.rows[0]) { await client.query("COMMIT"); return { transaction: duplicate.rows[0], duplicate: true }; }
    }
    const account = await getOwnedParty(client, sellerId, partyId, true);
    if (!account) {
      await client.query("ROLLBACK");
      return { error: "not_found" };
    }
    const outstanding = Math.max(Number(account.outstanding_balance) - value, 0);
    const received = Number(account.outstanding_balance) - outstanding;
    if (received <= 0) {
      await client.query("ROLLBACK");
      return { error: "no_balance" };
    }
    const status = statusFor(account.credit_limit, outstanding, account.credit_status === "blocked" && Number(account.credit_limit) === 0 ? "blocked" : undefined);
    await client.query(
      `UPDATE parties SET outstanding_balance = $1, available_credit = GREATEST(credit_limit - $1, 0), credit_status = $2, last_payment_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [outstanding, status, partyId],
    );
    const result = await client.query(
      `INSERT INTO credit_transactions (seller_id, party_id, transaction_type, amount, balance_after, payment_method, notes, idempotency_key)
       VALUES ($1, $2, 'payment_received', $3, $4, $5, $6, $7) RETURNING *`,
      [sellerId, partyId, received, outstanding, paymentMethod, notes || null, idempotencyKey || null],
    );
    await client.query("COMMIT");
    return { transaction: result.rows[0], account: { ...account, outstanding_balance: outstanding, available_credit: Math.max(Number(account.credit_limit) - outstanding, 0) } };
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

module.exports = { accountSelect, getOwnedParty, configureAccount, recordCreditSale, receivePayment, statusFor };
