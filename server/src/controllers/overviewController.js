const pool = require("../config/db");

/**
 * The first screen a wholesaler sees. Everything here is computed from his own
 * rows, so a new account shows zeroes and empty lists rather than a plausible
 * looking number. The marketplace dashboard this replaces reported a buyer
 * rating and a listing count, neither of which means anything now.
 *
 * Deliberately built around what needs doing rather than what has happened.
 * Totals are there, but the lists are the point: who owes you, what has not
 * gone out yet, and who has gone quiet.
 */

// A sale counts towards money owed once it is confirmed. Drafts are not debts
// and cancellations are not either, which matches the customer book.
const BILLED_STATUSES = "('confirmed', 'delivered')";

// How long without a sale before a customer is worth chasing. Nothing hangs
// on the exact number, it is a prompt rather than a rule.
const QUIET_AFTER_DAYS = 60;

exports.getOverview = async (req, res) => {
  const wholesalerId = req.user.id;

  try {
    const [money, counts, toDeliver, topDues, quiet, recentSales] =
      await Promise.all([
        pool.query(
          `SELECT
             COALESCE((SELECT SUM(total) FROM sales
                WHERE wholesaler_id = $1
                  AND status IN ${BILLED_STATUSES}), 0) AS billed_all_time,
             COALESCE((SELECT SUM(amount) FROM party_payments
                WHERE wholesaler_id = $1), 0) AS received_all_time,
             COALESCE((SELECT SUM(total) FROM sales
                WHERE wholesaler_id = $1
                  AND status IN ${BILLED_STATUSES}
                  AND sale_date >= date_trunc('month', CURRENT_DATE)), 0)
               AS billed_this_month,
             COALESCE((SELECT SUM(amount) FROM party_payments
                WHERE wholesaler_id = $1
                  AND paid_on >= date_trunc('month', CURRENT_DATE)), 0)
               AS received_this_month`,
          [wholesalerId],
        ),

        pool.query(
          `SELECT
             (SELECT COUNT(*) FROM parties
               WHERE wholesaler_id = $1 AND status = 'active') AS parties,
             (SELECT COUNT(*) FROM items
               WHERE wholesaler_id = $1 AND status = 'active') AS items,
             (SELECT COUNT(*) FROM sales
               WHERE wholesaler_id = $1
                 AND status <> 'cancelled'
                 AND sale_date >= date_trunc('month', CURRENT_DATE))
               AS sales_this_month`,
          [wholesalerId],
        ),

        // Confirmed but not yet marked delivered: goods he still owes someone.
        pool.query(
          `SELECT s.id, s.sale_number, s.sale_date, s.total, p.name AS party_name
             FROM sales s
             JOIN parties p ON p.id = s.party_id
            WHERE s.wholesaler_id = $1 AND s.status = 'confirmed'
            ORDER BY s.sale_date ASC
            LIMIT 6`,
          [wholesalerId],
        ),

        // Who owes the most. Only rows that actually owe something.
        pool.query(
          `SELECT p.id, p.name, p.business_name, p.phone, dues.outstanding
             FROM parties p
             JOIN LATERAL (
               SELECT
                 COALESCE((SELECT SUM(s.total) FROM sales s
                    WHERE s.party_id = p.id
                      AND s.status IN ${BILLED_STATUSES}), 0)
                 -
                 COALESCE((SELECT SUM(pp.amount) FROM party_payments pp
                    WHERE pp.party_id = p.id), 0) AS outstanding
             ) dues ON TRUE
            WHERE p.wholesaler_id = $1 AND dues.outstanding > 0
            ORDER BY dues.outstanding DESC
            LIMIT 5`,
          [wholesalerId],
        ),

        // Customers who used to buy and have stopped. A party who has never
        // bought is not quiet, he is new, so MAX(sale_date) must exist.
        pool.query(
          `SELECT p.id, p.name, p.business_name, p.phone, last.sale_date
             FROM parties p
             JOIN LATERAL (
               SELECT MAX(s.sale_date) AS sale_date FROM sales s
                WHERE s.party_id = p.id AND s.status <> 'cancelled'
             ) last ON TRUE
            WHERE p.wholesaler_id = $1
              AND p.status = 'active'
              AND last.sale_date IS NOT NULL
              AND last.sale_date < CURRENT_DATE - $2::int
            ORDER BY last.sale_date ASC
            LIMIT 5`,
          [wholesalerId, QUIET_AFTER_DAYS],
        ),

        pool.query(
          `SELECT s.id, s.sale_number, s.sale_date, s.status, s.total,
                  p.name AS party_name
             FROM sales s
             JOIN parties p ON p.id = s.party_id
            WHERE s.wholesaler_id = $1
            ORDER BY s.sale_date DESC, s.created_at DESC
            LIMIT 5`,
          [wholesalerId],
        ),
      ]);

    const m = money.rows[0];
    const c = counts.rows[0];

    res.status(200).json({
      money: {
        outstanding:
          Number(m.billed_all_time) - Number(m.received_all_time),
        billedThisMonth: Number(m.billed_this_month),
        receivedThisMonth: Number(m.received_this_month),
      },
      counts: {
        parties: Number(c.parties),
        items: Number(c.items),
        salesThisMonth: Number(c.sales_this_month),
      },
      toDeliver: toDeliver.rows,
      topDues: topDues.rows,
      quiet: quiet.rows,
      quietAfterDays: QUIET_AFTER_DAYS,
      recentSales: recentSales.rows,
    });
  } catch (err) {
    console.error("Error building the overview:", err);
    res.status(500).json({ message: "Server error" });
  }
};
