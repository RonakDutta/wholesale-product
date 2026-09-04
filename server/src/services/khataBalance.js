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
 * Money handed back to the customer.
 *
 * A refund is a payment in reverse, and party_payments cannot hold one: the
 * table has a CHECK that every amount is greater than zero, which is right,
 * because a receipt for minus two thousand rupees is not a receipt.
 *
 * So it is added back here instead. Follow one order through: the customer
 * pays 2,000, which lands in party_payments and is subtracted. The goods come
 * back, the order reaches return_completed, and it stops counting as owed, so
 * his balance is now minus 2,000 and the Overview correctly reports 2,000 of
 * his money sitting in the till. The wholesaler hands it back, and this term
 * adds the 2,000 on again, which cancels the payment exactly and returns him
 * to zero.
 *
 * Only refunds actually paid out count. refund_status is written at the moment
 * the money leaves, and refund_amount is capped at what was received, so this
 * can never add back more than was taken.
 */
const REFUNDED_BACK_SQL = `
    SELECT SUM(o.refund_amount) FROM orders o
     WHERE o.party_id = %REF% AND o.refund_status = 'processed'
       AND o.refund_amount IS NOT NULL`;

const refundedBack = (partyRef) => REFUNDED_BACK_SQL.replace("%REF%", partyRef);

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
  ${hasOrderParty ? `+ COALESCE((${refundedBack(partyRef)}), 0)` : ""}
`;

/**
 * What is billed and what has come in, over a window, for the Overview.
 *
 * These two are plain sums and cannot go wrong on their own. It is the
 * difference between them that used to be reported as "still to collect", and
 * that is the thing that could go negative. See collectionTotals below.
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

/**
 * How much is actually still to collect, and how much is owed back.
 *
 * Everything before this asked one subtraction of the whole business: total
 * billed, less total received. That is the wrong sum, and it is wrong in a way
 * that shows a large minus sign on a card headed "still to collect".
 *
 * Two customers make the point. Ramesh owes 5,000. Suresh paid for an order
 * that was later cancelled and is 2,000 in credit. The old figure said 3,000,
 * which is not a real quantity: there is no 3,000 to go and collect, and
 * nobody is going to hand Ramesh's debt to Suresh. What is true is that 5,000
 * is out there to collect, and 2,000 of somebody else's money is sitting in
 * the till.
 *
 * Netting them also lets one customer's credit hide another's debt, which is
 * the failure that matters: a wholesaler chasing 5,000 is shown 3,000 and
 * stops chasing early.
 *
 * So each customer's balance is worked out on its own and only then added up,
 * the debts into one figure and the credits into another. "Still to collect"
 * becomes structurally incapable of going negative, and the money owed back is
 * reported rather than quietly cancelled out. Neither number is invented and
 * neither is hidden.
 *
 * Scoped by wholesaler_id. Takes $1 as the wholesaler.
 */
const collectionTotals = ({ hasOrderParty, hasBridge }) => `
  SELECT
    COALESCE(SUM(GREATEST(dues.balance, 0)), 0) AS owed_to_you,
    COALESCE(SUM(GREATEST(-dues.balance, 0)), 0) AS owed_by_you
  FROM parties p
  JOIN LATERAL (
    SELECT ${balanceExpression({ hasOrderParty, hasBridge, partyRef: "p.id" })} AS balance
  ) dues ON TRUE
  WHERE p.wholesaler_id = $1
`;

module.exports = {
  ORDER_NOT_OWED,
  NOT_OWED_SQL,
  BILLED_SALE_STATUSES,
  bridgedGuard,
  refundedBack,
  balanceExpression,
  totalsExpression,
  collectionTotals,
};
