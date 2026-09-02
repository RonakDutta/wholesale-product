const pool = require("../config/db");
const creditService = require("../services/creditService");

const sellerId = (req) => req.user.id;

exports.eligibility = async (req, res) => {
  try {
    const result = await creditService.getBuyerEligibility(req.user.id, req.query.supplierId);
    res.json({ success: true, ...result });
  } catch (error) { console.error("Credit eligibility:", error); res.status(500).json({ success: false, message: "Could not check credit eligibility" }); }
};

exports.wallet = async (req, res) => {
  try {
    const result = await pool.query(`${creditService.accountSelect} WHERE p.user_id = $1 ORDER BY p.updated_at DESC LIMIT 1`, [req.user.id]);
    if (!result.rows[0]) return res.json({ success: true, account: null, transactions: [] });
    const transactions = await pool.query("SELECT * FROM credit_transactions WHERE party_id = $1 ORDER BY created_at DESC LIMIT 20", [result.rows[0].id]);
    res.json({ success: true, account: result.rows[0], transactions: transactions.rows });
  } catch (error) { console.error("Credit wallet:", error); res.status(500).json({ success: false, message: "Could not load credit wallet" }); }
};

exports.listAccounts = async (req, res) => {
  try {
    const params = [sellerId(req)];
    let where = "p.wholesaler_id = $1";
    if (req.query.search) {
      params.push(`%${String(req.query.search).trim()}%`);
      where += ` AND (p.name ILIKE $2 OR p.business_name ILIKE $2 OR p.phone ILIKE $2)`;
    }
    const result = await pool.query(
      `${creditService.accountSelect} WHERE ${where} ORDER BY p.name ASC`, params,
    );
    res.json({ success: true, accounts: result.rows });
  } catch (error) { console.error("Credit accounts:", error); res.status(500).json({ success: false, message: "Could not load credit accounts" }); }
};

exports.getAccount = async (req, res) => {
  try {
    const client = await pool.connect();
    const account = await creditService.getOwnedParty(client, sellerId(req), req.params.partyId);
    if (!account) { client.release(); return res.status(404).json({ success: false, message: "Credit account not found" }); }
    const ledger = await client.query(
      `SELECT * FROM credit_transactions WHERE seller_id = $1 AND party_id = $2 ORDER BY created_at DESC LIMIT 100`,
      [sellerId(req), req.params.partyId],
    );
    client.release();
    res.json({ success: true, account, transactions: ledger.rows });
  } catch (error) { console.error("Credit account:", error); res.status(500).json({ success: false, message: "Could not load credit account" }); }
};

exports.updateLimit = async (req, res) => {
  try {
    const result = await creditService.configureAccount({ sellerId: sellerId(req), partyId: req.params.partyId, creditLimit: req.body.creditLimit, creditPeriodDays: req.body.creditPeriodDays, creditStatus: req.body.creditStatus });
    if (result.error === "not_found") return res.status(404).json({ success: false, message: "Customer not found" });
    if (result.error) return res.status(400).json({ success: false, message: "Enter a valid limit and credit period" });
    res.json({ success: true, account: result.account });
  } catch (error) { console.error("Credit settings:", error); res.status(500).json({ success: false, message: "Could not update credit settings" }); }
};

exports.receivePayment = async (req, res) => {
  try {
    const result = await creditService.receivePayment({ sellerId: sellerId(req), partyId: req.body.partyId, amount: req.body.amount, paymentMethod: req.body.paymentMethod, notes: req.body.notes, idempotencyKey: req.get("Idempotency-Key") || req.body.idempotencyKey });
    if (result.error === "not_found") return res.status(404).json({ success: false, message: "Customer not found" });
    if (result.error === "invalid_method") return res.status(400).json({ success: false, message: "Payment method is invalid" });
    if (result.error === "invalid_amount") return res.status(400).json({ success: false, message: "Payment amount is invalid" });
    if (result.error === "no_balance") return res.status(400).json({ success: false, message: "This customer has no outstanding balance" });
    res.status(result.duplicate ? 200 : 201).json({ success: true, ...result });
  } catch (error) { console.error("Credit payment:", error); res.status(500).json({ success: false, message: "Could not record payment" }); }
};

exports.statement = async (req, res) => {
  try {
    const client = await pool.connect();
    const account = await creditService.getOwnedParty(client, sellerId(req), req.params.partyId);
    if (!account) { client.release(); return res.status(404).json({ success: false, message: "Credit account not found" }); }
    const result = await client.query(`SELECT * FROM credit_transactions WHERE seller_id = $1 AND party_id = $2 ORDER BY created_at ASC`, [sellerId(req), req.params.partyId]);
    client.release();
    res.json({ success: true, account, transactions: result.rows });
  } catch (error) { console.error("Credit statement:", error); res.status(500).json({ success: false, message: "Could not load statement" }); }
};

exports.analytics = async (req, res) => {
  try {
    const result = await pool.query(`SELECT COUNT(*) FILTER (WHERE credit_limit > 0) AS customers_on_credit, COALESCE(SUM(outstanding_balance), 0) AS total_outstanding, COALESCE(SUM(overdue_amount), 0) AS total_overdue, COALESCE(SUM(outstanding_balance) FILTER (WHERE outstanding_balance > 0), 0) AS active_receivables FROM parties WHERE wholesaler_id = $1`, [sellerId(req)]);
    res.json({ success: true, analytics: result.rows[0] });
  } catch (error) { console.error("Credit analytics:", error); res.status(500).json({ success: false, message: "Could not load credit analytics" }); }
};
