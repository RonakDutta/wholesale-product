const PDFDocument = require("pdfkit");
const creditService = require("../services/creditService");

const sendError = (res, error) => {
  const message = error.message || "Credit operation failed";
  const status = /not found/i.test(message) ? 404 : /required|valid|exceed|blocked|active|unsupported|already/i.test(message) ? 400 : 500;
  res.status(status).json({ success: false, message });
};

exports.listAccounts = async (req, res) => {
  try { res.json({ success: true, accounts: await creditService.listAccounts(req.user.id, req.query) }); }
  catch (error) { sendError(res, error); }
};

exports.getAccount = async (req, res) => {
  try {
    const details = await creditService.getDetails(req.user.id, req.params.partyId);
    if (!details) return res.status(404).json({ success: false, message: "Credit account not found" });
    res.json({ success: true, ...details });
  } catch (error) { sendError(res, error); }
};

exports.updateAccount = async (req, res) => {
  try { res.json({ success: true, account: await creditService.updateAccount(req.user.id, req.params.partyId, req.body) }); }
  catch (error) { sendError(res, error); }
};

exports.receivePayment = async (req, res) => {
  try { res.status(201).json({ success: true, ...await creditService.recordPayment(req.user.id, req.body) }); }
  catch (error) { sendError(res, error); }
};

exports.getStatement = async (req, res) => {
  try {
    const details = req.user.role === "buyer"
      ? await creditService.getWalletStatement(req.user.id)
      : await creditService.getStatement(req.user.id, req.params.partyId);
    if (!details) return res.status(404).json({ success: false, message: "Credit account not found" });
    if (req.query.format === "csv") {
      const rows = ["Date,Type,Amount,Balance After,Due Date,Method,Notes", ...details.transactions.map((row) => [row.created_at, row.transaction_type, row.amount, row.balance_after, row.due_date || "", row.payment_method || "", String(row.notes || "").replaceAll(",", " ")].join(","))];
      res.type("text/csv").set("Content-Disposition", "attachment; filename=credit-statement.csv").send(rows.join("\n"));
      return;
    }
    if (req.query.format === "pdf") {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      res.type("application/pdf").set("Content-Disposition", "attachment; filename=credit-statement.pdf");
      doc.pipe(res);
      doc.fontSize(18).text("Credit Account Statement");
      doc.moveDown().fontSize(10).text(`Customer: ${details.account.business_name || details.account.name}`);
      doc.text(`Outstanding: Rs ${Number(details.account.outstanding_balance).toFixed(2)}`);
      doc.moveDown();
      details.transactions.forEach((row) => doc.text(`${new Date(row.created_at).toLocaleDateString("en-IN")}  ${row.transaction_type}  Rs ${Number(row.amount).toFixed(2)}  Balance Rs ${Number(row.balance_after).toFixed(2)}${row.due_date ? `  Due ${row.due_date}` : ""}`));
      doc.end();
      return;
    }
    res.json({ success: true, ...details });
  } catch (error) { sendError(res, error); }
};

exports.getAnalytics = async (req, res) => {
  try { res.json({ success: true, ...(await creditService.analytics(req.user.id)) }); }
  catch (error) { sendError(res, error); }
};

exports.getWallet = async (req, res) => {
  try {
    const result = await require("../config/db").query(
      `SELECT pt.id AS party_id, pt.name, pt.business_name, pt.credit_limit,
              pt.outstanding_balance, pt.available_credit, pt.credit_status,
              pt.overdue_amount, pt.credit_period_days,
              (SELECT MIN(due_date) FROM credit_transactions ct
                WHERE ct.party_id = pt.id AND ct.transaction_type = 'credit_sale'
                  AND ct.due_date >= CURRENT_DATE) AS next_due_date
         FROM parties pt WHERE pt.user_id = $1`,
      [req.user.id],
    );
    res.json({ success: true, wallet: result.rows[0] || null });
  } catch (error) { sendError(res, error); }
};