const pool = require("../config/db");
const { enqueueNotification, NOTIFICATION_CHANNELS, NOTIFICATION_TYPES } = require("./notificationManager");

const PAYMENT_METHODS = ["upi", "cash", "bank", "cheque", "other"];
const CREDIT_STATUSES = ["inactive", "active", "warning", "blocked"];

const money = (value) => Number(Number(value || 0).toFixed(2));

const statusFor = (limit, outstanding, current = null) => {
  if (current === "blocked") return "blocked";
  if (limit <= 0) return "inactive";
  if (outstanding > limit) return "blocked";
  return outstanding >= limit * 0.8 ? "warning" : "active";
};

const accountSelect = `
  SELECT pt.id AS party_id, pt.wholesaler_id AS seller_id, pt.name,
         pt.business_name, pt.phone, pt.credit_limit, pt.credit_period_days,
         pt.outstanding_balance, pt.available_credit, pt.credit_status,
         pt.last_payment_date, pt.overdue_amount,
         (SELECT MIN(ct.due_date) FROM credit_transactions ct
           WHERE ct.party_id = pt.id AND ct.transaction_type = 'credit_sale'
             AND ct.due_date >= CURRENT_DATE
             AND ct.balance_after > 0) AS next_due_date
    FROM parties pt`;

const refreshAccount = async (client, partyId, sellerId) => {
  const result = await client.query(
    `SELECT id, credit_limit, outstanding_balance, credit_status
       FROM parties WHERE id = $1 AND wholesaler_id = $2 FOR UPDATE`,
    [partyId, sellerId],
  );
  if (!result.rows.length) return null;
  const party = result.rows[0];
  const limit = Number(party.credit_limit);
  const outstanding = Math.max(0, money(party.outstanding_balance));
  const available = Math.max(0, money(limit - outstanding));
  const creditStatus = statusFor(limit, outstanding, party.credit_status);
  const overdue = await client.query(
    `SELECT GREATEST(0, COALESCE(SUM(ct.amount) FILTER
       (WHERE ct.transaction_type = 'credit_sale' AND ct.due_date < CURRENT_DATE), 0)
       - COALESCE(SUM(ct.amount) FILTER
       (WHERE ct.transaction_type IN ('payment_received', 'refund')), 0)) AS overdue
       FROM credit_transactions ct
      WHERE ct.party_id = $1 AND ct.seller_id = $2`,
    [partyId, sellerId],
  );
  const overdueAmount = Math.min(outstanding, money(overdue.rows[0].overdue));
  const updated = await client.query(
    `UPDATE parties
        SET available_credit = $3, credit_status = $4, overdue_amount = $5,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND wholesaler_id = $2
      RETURNING id AS party_id, credit_limit, credit_period_days,
                outstanding_balance, available_credit, credit_status,
                last_payment_date, overdue_amount`,
    [partyId, sellerId, available, creditStatus, overdueAmount],
  );
  return updated.rows[0];
};

const loadAccount = async (client, partyId, sellerId, lock = false) => {
  const result = await client.query(
    `${accountSelect} WHERE pt.id = $1 AND pt.wholesaler_id = $2 ${lock ? "FOR UPDATE" : ""}`,
    [partyId, sellerId],
  );
  return result.rows[0] || null;
};

const addTransaction = async (client, values) => {
  const result = await client.query(
    `INSERT INTO credit_transactions
       (seller_id, party_id, order_id, invoice_id, transaction_type, amount,
        balance_after, due_date, payment_method, notes, idempotency_key)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (seller_id, idempotency_key) WHERE idempotency_key IS NOT NULL
     DO NOTHING RETURNING *`,
    [values.sellerId, values.partyId, values.orderId || null, values.invoiceId || null,
      values.transactionType, values.amount, values.balanceAfter,
      values.dueDate || null, values.paymentMethod || null, values.notes || null,
      values.idempotencyKey || null],
  );
  return result.rows[0] || null;
};

const createCreditSale = async ({ client, sellerId, buyerId, orderId, amount, invoiceId, idempotencyKey }) => {
  const account = await client.query(
    `SELECT pt.* FROM parties pt
      WHERE pt.wholesaler_id = $1 AND pt.user_id = $2 FOR UPDATE`,
    [sellerId, buyerId],
  );
  if (!account.rows.length) throw new Error("Pay on Credit is only available to an approved customer.");
  const party = account.rows[0];
  const limit = Number(party.credit_limit);
  const outstanding = Number(party.outstanding_balance);
  const value = money(amount);
  if (party.credit_status === "blocked" || party.credit_limit <= 0) {
    throw new Error("This customer does not have an active credit account.");
  }
  if (money(limit - outstanding) < value) {
    throw new Error("This order exceeds the customer's available credit.");
  }
  const nextBalance = money(outstanding + value);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + Number(party.credit_period_days || 30));
  const transaction = await addTransaction(client, {
    sellerId, partyId: party.id, orderId, invoiceId,
    transactionType: "credit_sale", amount: value, balanceAfter: nextBalance,
    dueDate: dueDate.toISOString().slice(0, 10), idempotencyKey,
  });
  if (!transaction) throw new Error("This credit order has already been recorded.");
  await client.query(
    `UPDATE parties SET outstanding_balance = $3,
       available_credit = GREATEST(credit_limit - $3, 0),
       credit_status = CASE WHEN $3 > credit_limit THEN 'blocked'
         WHEN $3 >= credit_limit * 0.8 THEN 'warning' ELSE 'active' END,
       updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND wholesaler_id = $2`,
    [party.id, sellerId, nextBalance],
  );
  return { partyId: party.id, dueDate: dueDate.toISOString().slice(0, 10), transaction };
};

const listAccounts = async (sellerId, query = {}) => {
  const params = [sellerId];
  const filters = ["pt.wholesaler_id = $1"];
  if (query.search) { params.push(`%${query.search}%`); filters.push(`(pt.name ILIKE $${params.length} OR pt.business_name ILIKE $${params.length} OR pt.phone ILIKE $${params.length})`); }
  if (CREDIT_STATUSES.includes(query.status)) { params.push(query.status); filters.push(`pt.credit_status = $${params.length}`); }
  const result = await pool.query(`${accountSelect} WHERE ${filters.join(" AND ")} ORDER BY pt.name ASC`, params);
  return result.rows;
};

const getDetails = async (sellerId, partyId) => {
  const account = await pool.query(`${accountSelect} WHERE pt.id = $1 AND pt.wholesaler_id = $2`, [partyId, sellerId]);
  if (!account.rows.length) return null;
  const ledger = await pool.query(
    `SELECT * FROM credit_transactions WHERE party_id = $1 AND seller_id = $2 ORDER BY created_at DESC LIMIT 200`,
    [partyId, sellerId],
  );
  return { account: account.rows[0], transactions: ledger.rows };
};

const updateAccount = async (sellerId, partyId, changes) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const current = await loadAccount(client, partyId, sellerId, true);
    if (!current) throw new Error("Customer not found");
    const limit = changes.creditLimit == null ? Number(current.credit_limit) : Number(changes.creditLimit);
    const period = changes.creditPeriodDays == null ? Number(current.credit_period_days) : Number(changes.creditPeriodDays);
    if (!Number.isFinite(limit) || limit < 0 || !Number.isFinite(period) || period < 1 || period > 3650) throw new Error("Enter a valid credit limit and period.");
    const requestedStatus = changes.creditStatus || current.credit_status;
    if (!CREDIT_STATUSES.includes(requestedStatus)) throw new Error("Unknown credit status.");
    await client.query(`UPDATE parties SET credit_limit = $3, credit_period_days = $4, credit_status = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND wholesaler_id = $2`, [partyId, sellerId, limit, period, requestedStatus]);
    await client.query(
      `INSERT INTO credit_account_audit
         (seller_id, party_id, action, old_values, new_values)
       VALUES ($1, $2, 'account_updated', $3::jsonb, $4::jsonb)`,
      [
        sellerId,
        partyId,
        JSON.stringify({ creditLimit: current.credit_limit, creditPeriodDays: current.credit_period_days, creditStatus: current.credit_status }),
        JSON.stringify({ creditLimit: limit, creditPeriodDays: period, creditStatus: requestedStatus }),
      ],
    );
    const refreshed = await refreshAccount(client, partyId, sellerId);
    if (balanceAfter === 0) {
      await client.query(
        `UPDATE invoices SET payment_status = 'Paid', invoice_status = 'Paid',
                updated_at = CURRENT_TIMESTAMP
           WHERE party_id = $1 AND supplier_id = $2
             AND invoice_status <> 'Cancelled'`,
        [partyId, sellerId],
      );
    }
    await client.query("COMMIT");
    return refreshed;
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
};

const recordPayment = async (sellerId, { partyId, amount, method, notes, idempotencyKey }) => {
  const value = Number(amount);
  if (!partyId || !Number.isFinite(value) || value <= 0) throw new Error("Customer and a positive amount are required.");
  if (!PAYMENT_METHODS.includes(method)) throw new Error("Unsupported payment method.");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const account = await loadAccount(client, partyId, sellerId, true);
    if (!account) throw new Error("Customer not found");
    const outstanding = Number(account.outstanding_balance);
    if (value > outstanding) throw new Error("Payment cannot exceed the outstanding balance.");
    const balanceAfter = money(outstanding - value);
    const transaction = await addTransaction(client, { sellerId, partyId, transactionType: "payment_received", amount: value, balanceAfter, paymentMethod: method, notes, idempotencyKey });
    if (!transaction) { await client.query("COMMIT"); return transaction; }
    await client.query(`INSERT INTO party_payments (wholesaler_id, party_id, amount, method, note) VALUES ($1,$2,$3,$4,$5)`, [sellerId, partyId, value, method, notes || null]);
    await client.query(`UPDATE parties SET outstanding_balance = $3, last_payment_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND wholesaler_id = $2`, [partyId, sellerId, balanceAfter]);
    const refreshed = await refreshAccount(client, partyId, sellerId);
    await client.query("COMMIT");
    return { transaction, account: refreshed };
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
};

const getStatement = async (sellerId, partyId) => {
  const details = await getDetails(sellerId, partyId);
  return details;
};

const getWalletStatement = async (buyerId) => {
  const party = await pool.query("SELECT id, wholesaler_id FROM parties WHERE user_id = $1", [buyerId]);
  if (!party.rows.length) return null;
  return getDetails(party.rows[0].wholesaler_id, party.rows[0].id);
};

const analytics = async (sellerId) => {
  const summary = await pool.query(`SELECT COALESCE(SUM(outstanding_balance),0) AS total_outstanding, COALESCE(SUM(overdue_amount),0) AS total_overdue, COUNT(*) FILTER (WHERE outstanding_balance > 0) AS customers_on_credit FROM parties WHERE wholesaler_id = $1`, [sellerId]);
  const aging = await pool.query(`SELECT COALESCE(SUM(ct.amount) FILTER (WHERE CURRENT_DATE - ct.due_date BETWEEN 0 AND 30),0) AS days_0_30, COALESCE(SUM(ct.amount) FILTER (WHERE CURRENT_DATE - ct.due_date BETWEEN 31 AND 60),0) AS days_31_60, COALESCE(SUM(ct.amount) FILTER (WHERE CURRENT_DATE - ct.due_date BETWEEN 61 AND 90),0) AS days_61_90, COALESCE(SUM(ct.amount) FILTER (WHERE CURRENT_DATE - ct.due_date > 90),0) AS days_90_plus FROM credit_transactions ct WHERE ct.seller_id = $1 AND ct.transaction_type = 'credit_sale' AND ct.due_date < CURRENT_DATE`, [sellerId]);
  return { summary: summary.rows[0], aging: aging.rows[0] };
};

const sendDueReminders = async () => {
  const result = await pool.query(
    `SELECT pt.id, pt.user_id, pt.name, pt.phone, pt.wholesaler_id,
            u.email, wp.company_name,
            MIN(ct.due_date) AS due_date,
            SUM(ct.amount) AS amount
       FROM parties pt
       JOIN users u ON u.id = pt.user_id
       LEFT JOIN wholesaler_profiles wp ON wp.user_id = pt.wholesaler_id
       JOIN credit_transactions ct ON ct.party_id = pt.id
      WHERE ct.transaction_type = 'credit_sale'
        AND ct.due_date IN (CURRENT_DATE + 3, CURRENT_DATE,
                            CURRENT_DATE - 3, CURRENT_DATE - 7)
      GROUP BY pt.id, u.email, wp.company_name`,
  );
  for (const row of result.rows) {
    const days = Math.round((new Date(`${row.due_date}T00:00:00`) - new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00`)) / 86400000);
    const window = days === 3 ? "before" : days === 0 ? "today" : `${Math.abs(days)}_overdue`;
    const referenceType = `credit_due_${window}`;
    const alreadySent = await pool.query(
      `SELECT 1 FROM notifications WHERE user_id = $1 AND reference_id = $2
         AND reference_type = $3 AND created_at::date = CURRENT_DATE LIMIT 1`,
      [row.user_id, row.id, referenceType],
    );
    if (alreadySent.rows.length) continue;
    const message = days > 0
      ? `Your credit payment of ₹${Number(row.amount).toLocaleString("en-IN")} is due in ${days} days.`
      : days === 0
        ? `Your credit payment of ₹${Number(row.amount).toLocaleString("en-IN")} is due today.`
        : `Your credit payment of ₹${Number(row.amount).toLocaleString("en-IN")} is ${Math.abs(days)} days overdue.`;
    await enqueueNotification({
      userId: row.user_id,
      title: days < 0 ? "Credit payment overdue" : "Credit payment reminder",
      message,
      notificationType: NOTIFICATION_TYPES.credit,
      referenceId: row.id,
      referenceType,
      channels: [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.EMAIL, NOTIFICATION_CHANNELS.SMS, NOTIFICATION_CHANNELS.WHATSAPP],
      emailPayload: { to: row.email, subject: "Vyapari credit payment reminder", templateName: "credit_due_reminder", variables: { name: row.name, amount: row.amount, companyName: row.company_name } },
      smsPayload: { to: row.phone, message },
      whatsappPayload: { to: row.phone, message },
    }).catch((error) => console.warn("Credit reminder skipped:", error.message));
  }
};

module.exports = { PAYMENT_METHODS, createCreditSale, listAccounts, getDetails, updateAccount, recordPayment, getStatement, getWalletStatement, analytics, refreshAccount, sendDueReminders };