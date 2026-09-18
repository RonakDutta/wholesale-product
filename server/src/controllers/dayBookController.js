const pool = require("../config/db");
const { businessId } = require("../middlewares/businessContext");
const invoiceRepository = require("../repositories/invoiceRepository");

/**
 * The day book: everything that happened on a date, in one list.
 *
 * Marg has Day Book, Tally and Busy have the same thing. It is how a trader
 * checks his day before going home, and it is the one screen that answers
 * "what did we actually do today" without opening six others.
 *
 * READS ONLY. Every row here already exists on some other screen. This adds no
 * table and no figure of its own, which is deliberate: a day book that
 * computed anything could disagree with the screen the entry came from.
 *
 * Scoped by the wholesaler id from the TOKEN, never the query string.
 */

/**
 * Each source is its own SELECT, unioned, rather than one clever query.
 *
 * They have genuinely different shapes, and the failure mode of forcing them
 * together is a join that quietly multiplies rows when a sale has two payments
 * against it. Six small readable queries beat one that nobody can check.
 *
 * Tables that a database may not have yet are left out by the probe rather
 * than guarded in SQL, because Postgres parses the whole statement before it
 * runs any of it: naming purchases in a query is enough to fail on a database
 * without them, whatever the WHERE says.
 */
const buildQuery = (has) => {
  const parts = [];

  parts.push(`
    SELECT 'sale' AS kind, s.id, s.sale_number AS reference, s.sale_date AS on_date,
           p.name AS other_party, s.total AS amount, s.status, s.created_at
      FROM sales s
      LEFT JOIN parties p ON p.id = s.party_id
     WHERE s.wholesaler_id = $1 AND s.sale_date >= $2::date AND s.sale_date <= $3::date`);

  parts.push(`
    SELECT 'payment_in' AS kind, pp.id, NULL AS reference, pp.paid_on AS on_date,
           p.name AS other_party, pp.amount, pp.method AS status, pp.created_at
      FROM party_payments pp
      LEFT JOIN parties p ON p.id = pp.party_id
     WHERE pp.wholesaler_id = $1 AND pp.paid_on >= $2::date AND pp.paid_on <= $3::date`);

  if (has.has_purchases) {
    parts.push(`
      SELECT 'purchase' AS kind, pu.id, pu.purchase_number AS reference,
             pu.purchase_date AS on_date, su.name AS other_party, pu.total AS amount,
             pu.status, pu.created_at
        FROM purchases pu
        LEFT JOIN suppliers su ON su.id = pu.supplier_id
       WHERE pu.wholesaler_id = $1 AND pu.purchase_date >= $2::date
         AND pu.purchase_date <= $3::date`);

    parts.push(`
      SELECT 'payment_out' AS kind, sp.id, NULL AS reference, sp.paid_on AS on_date,
             su.name AS other_party, sp.amount, sp.method AS status, sp.created_at
        FROM supplier_payments sp
        LEFT JOIN suppliers su ON su.id = sp.supplier_id
       WHERE sp.wholesaler_id = $1 AND sp.paid_on >= $2::date AND sp.paid_on <= $3::date`);
  }

  parts.push(`
    SELECT 'invoice' AS kind, i.id, i.invoice_number AS reference,
           i.issue_date AS on_date, i.recipient_name AS other_party,
           i.grand_total AS amount, i.payment_status AS status, i.created_at
      FROM invoices i
     WHERE i.supplier_id = $1 AND i.issue_date >= $2::date AND i.issue_date <= $3::date`);

  if (has.has_challan_kinds) {
    parts.push(`
      SELECT CASE WHEN dc.kind = 'purchase' THEN 'purchase_challan'
                  ELSE 'sale_challan' END AS kind,
             dc.id, dc.challan_number AS reference, dc.issue_date AS on_date,
             dc.recipient_name AS other_party, dc.total_value AS amount,
             dc.status, dc.created_at
        FROM delivery_challans dc
       WHERE dc.wholesaler_id = $1 AND dc.issue_date >= $2::date
         AND dc.issue_date <= $3::date`);
  }

  // Newest first within the range, and by when it was written for two entries
  // on the same day, which is the order he did them in.
  return `${parts.join("\n UNION ALL \n")}\n ORDER BY on_date DESC, created_at DESC`;
};

/** Does this database have the two-kind challan columns? Only a true is cached. */
let challanKinds = false;
const hasChallanKinds = async () => {
  if (challanKinds) return true;
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int n FROM information_schema.columns
        WHERE table_name = 'delivery_challans' AND column_name IN ('kind', 'status')`);
    challanKinds = rows[0].n === 2;
  } catch {
    return false;
  }
  return challanKinds;
};

exports.getDayBook = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const from = String(req.query.from || today).slice(0, 10);
    const to = String(req.query.to || from).slice(0, 10);

    const has = {
      ...(await invoiceRepository.schemaExtras()),
      has_challan_kinds: await hasChallanKinds(),
    };

    const { rows } = await pool.query(
      buildQuery(has), [businessId(req), from, to]);

    // Totalled here rather than on the client so two screens cannot disagree
    // about the same day. Money in and money out are kept apart and never
    // netted: a day with a lakh in and a lakh out is not a quiet day.
    const money = rows.reduce(
      (acc, row) => {
        const amount = Number(row.amount || 0);
        if (row.kind === "payment_in") acc.received += amount;
        if (row.kind === "payment_out") acc.paid += amount;
        if (row.kind === "sale" && row.status !== "cancelled") acc.sold += amount;
        if (row.kind === "purchase" && row.status !== "cancelled") acc.bought += amount;
        return acc;
      },
      { received: 0, paid: 0, sold: 0, bought: 0 },
    );

    res.status(200).json({ from, to, entries: rows, money });
  } catch (err) {
    console.error("Error reading the day book:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * What you OWE, by how old it is.
 *
 * The ageing report has existed since the invoice work, and it reads the
 * `invoices` table, which is the sales side. So a wholesaler could see what
 * his customers owed him by age and had nothing at all for what he owed his
 * mills. The one that gets a trader into trouble is the second one.
 *
 * Buckets match the sales ageing exactly, so the two screens read the same way
 * round. Dated from the SUPPLIER's own bill date where there is one, because
 * that is the date his credit period runs from, falling back to when the
 * purchase was entered.
 */
exports.getPayableAgeing = async (req, res) => {
  try {
    const has = await invoiceRepository.schemaExtras();
    if (!has.has_purchases) {
      return res.status(200).json({ ready: false, buckets: [], total: 0 });
    }

    const { rows } = await pool.query(
      `WITH owed AS (
         SELECT pu.id,
                COALESCE(pu.supplier_invoice_date, pu.purchase_date) AS as_at,
                pu.total - COALESCE((
                  SELECT SUM(sp.amount) FROM supplier_payments sp
                   WHERE sp.purchase_id = pu.id), 0) AS due
           FROM purchases pu
          WHERE pu.wholesaler_id = $1 AND pu.status <> 'cancelled'
       )
       SELECT CASE
                WHEN CURRENT_DATE - as_at <= 0 THEN 'Not due yet'
                WHEN CURRENT_DATE - as_at BETWEEN 1 AND 30 THEN '1-30 days'
                WHEN CURRENT_DATE - as_at BETWEEN 31 AND 60 THEN '31-60 days'
                WHEN CURRENT_DATE - as_at BETWEEN 61 AND 90 THEN '61-90 days'
                ELSE '90+ days'
              END AS bucket,
              COUNT(*)::int AS count,
              COALESCE(SUM(due), 0)::numeric(14,2) AS amount
         FROM owed
        WHERE due > 0
        GROUP BY bucket`,
      [businessId(req)],
    );

    const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    res.status(200).json({ ready: true, buckets: rows, total });
  } catch (err) {
    console.error("Error reading what is payable:", err);
    res.status(500).json({ message: "Server error" });
  }
};
