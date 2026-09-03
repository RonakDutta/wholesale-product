/**
 * What a customer owes, defined once.
 *
 * This used to live in partyController alone, and overviewController answered
 * the same question its own way. The two disagreed, and not harmlessly: the
 * Overview billed from sales but subtracted every payment including the ones
 * taken through the shop, so a wholesaler whose customers had paid through
 * the marketplace was shown a NEGATIVE amount still to collect. The money was
 * taken off the total and the debt behind it was never added on.
 *
 * So the rule lives here now and both screens read it. If a third screen ever
 * needs a balance, it reads it from here too.
 *
 * The rule itself:
 *
 *   billed   confirmed and delivered sales,
 *            plus marketplace orders that are genuinely owed and have not
 *            yet produced a sale of their own
 *   less     every payment in party_payments, whichever way it came in
 *
 * An accepted order writes itself a sale, and from that moment the sale is
 * the commercial record. Counting both would bill the same goods twice, so an
 * order that has produced a sale is skipped on the orders side.
 */

/**
 * The order statuses that do NOT mean money is owed.
 *
 * An order is a request before it is a debt. A basket abandoned at the payment
 * screen must not appear in a customer's khata, and neither must one that was
 * cancelled, refunded, or whose goods have come back.
 *
 * return_rejected is deliberately absent: the wholesaler refused the return,
 * so the customer still has the goods and still owes for them.
 *
 * Kept as a list of what is NOT owed rather than what is, because a status
 * added later is far more likely to be another step of a live order than
 * another way for one to die, and the safer default is to count it.
 */
const ORDER_NOT_OWED = [
  "pending",
  "payment_pending",
  "payment_failed",
  "cancelled",
  "refunded",
  "return_completed",
];

const NOT_OWED_SQL = ORDER_NOT_OWED.map((s) => `'${s}'`).join(", ");

// A sale counts as a debt once it is confirmed. Drafts are not debts and
// cancelled sales are not either.
const BILLED_SALE_STATUSES = "('confirmed', 'delivered')";

/**
 * sales.order_id only exists once the bridge migration has run, and
 * orders.party_id only once the customer book migration has. Naming either
 * before then takes a whole screen down with a 500, which is how this has
 * broken more than once. Callers pass what the schema actually has.
 */
const bridgedGuard = (hasBridge) =>
  hasBridge
    ? "AND NOT EXISTS (SELECT 1 FROM sales s2 WHERE s2.order_id = o.id)"
    : "";

/**
 * The balance for one party, as a SQL expression.
 *
 * `partyRef` is how the surrounding query names the party's id column, so the
 * same fragment works whether the caller wrote `pt` or `p`.
 */
const balanceExpression = ({ hasOrderParty, hasBridge, partyRef = "pt.id" }) => `
  COALESCE((
    SELECT SUM(s.total) FROM sales s
     WHERE s.party_id = ${partyRef} AND s.status IN ${BILLED_SALE_STATUSES}
  ), 0)
  ${
    hasOrderParty
      ? `+ COALESCE((
    SELECT SUM(o.total_amount) FROM orders o
     WHERE o.party_id = ${partyRef} AND o.status NOT IN (${NOT_OWED_SQL})
       ${bridgedGuard(hasBridge)}
  ), 0)`
      : ""
  }
  -
  COALESCE((
    SELECT SUM(pp.amount) FROM party_payments pp WHERE pp.party_id = ${partyRef}
  ), 0)
`;

/**
 * The same sum across a whole wholesaler, for the Overview.
 *
 * Not a SUM of the per party figure, because a wholesaler can have payments
 * against a customer who has since been deleted, and because summing one
 * correlated subquery per party over a large book is slow. Scoped by
 * wholesaler_id on every term.
 */
const totalsExpression = ({ hasOrderParty, hasBridge, since = null }) => {
  const salesWindow = since ? `AND s.sale_date >= ${since}` : "";
  const ordersWindow = since ? `AND o.created_at >= ${since}` : "";
  const paymentsWindow = since ? `AND pp.paid_on >= ${since}` : "";

  return {
    billed: `
      COALESCE((SELECT SUM(s.total) FROM sales s
         WHERE s.wholesaler_id = $1
           AND s.status IN ${BILLED_SALE_STATUSES} ${salesWindow}), 0)
      ${
        hasOrderParty
          ? `+ COALESCE((SELECT SUM(o.total_amount) FROM orders o
         WHERE o.supplier_id = $1
           AND o.party_id IS NOT NULL
           AND o.status NOT IN (${NOT_OWED_SQL})
           ${bridgedGuard(hasBridge)} ${ordersWindow}), 0)`
          : ""
      }`,
    received: `
      COALESCE((SELECT SUM(pp.amount) FROM party_payments pp
         WHERE pp.wholesaler_id = $1 ${paymentsWindow}), 0)`,
  };
};

module.exports = {
  ORDER_NOT_OWED,
  NOT_OWED_SQL,
  BILLED_SALE_STATUSES,
  bridgedGuard,
  balanceExpression,
  totalsExpression,
};
