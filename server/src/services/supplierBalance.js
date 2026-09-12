/**
 * What the wholesaler owes a supplier, defined once.
 *
 * The deliberate mirror of khataBalance.js, and written as its own file for
 * the reason that one exists at all: the customer balance was worked out in
 * two places, the two disagreed, and a wholesaler was shown a negative amount
 * to collect. One rule, one file, every screen reads it.
 *
 * The rule:
 *
 *   billed   purchases in a received state
 *   less     every payment in supplier_payments
 *
 * Positive means he owes the supplier, which is the opposite sign to a party
 * balance, where positive means the customer owes him. That flip is the whole
 * reason suppliers are not parties: the same number on the same screen would
 * mean opposite things depending on a column.
 *
 * There is no marketplace side here. A purchase is always something the
 * wholesaler typed in off a bill he was handed, so there is no equivalent of
 * the orders term that khataBalance has to carry, and no equivalent of the
 * "an accepted order has already written itself a sale" exclusion.
 */

/**
 * A purchase is a debt once it is received. A draft is somebody part way
 * through typing, and a cancelled purchase is not owed.
 *
 * Same shape as BILLED_SALE_STATUSES for the same reason: written as the list
 * that IS owed rather than the list that is not, because the purchase spine is
 * three states and unlikely to grow more ways of dying.
 */
const OWED_PURCHASE_STATUSES = "('received')";

/**
 * The balance for one supplier, as a SQL expression.
 *
 * `supplierRef` is how the surrounding query names the supplier's id column,
 * so the same fragment works whether the caller wrote `sup` or `s`.
 */
const balanceExpression = ({ supplierRef = "sup.id" } = {}) => `
  COALESCE((
    SELECT SUM(pu.total) FROM purchases pu
     WHERE pu.supplier_id = ${supplierRef}
       AND pu.status IN ${OWED_PURCHASE_STATUSES}
  ), 0)
  -
  COALESCE((
    SELECT SUM(sp.amount) FROM supplier_payments sp
     WHERE sp.supplier_id = ${supplierRef}
  ), 0)
`;

/**
 * What has been paid against ONE purchase.
 *
 * Deliberately much simpler than the sale side. saleSettlement.js has to
 * reconcile hand entered payments against orders.amount_paid, because a sale
 * written from a shop order carries money in two places and the khata holds a
 * mirror of one of them. A purchase has one source of money, so this really is
 * just the sum, and the sale side's warning about it being neither the sum nor
 * the greater does not apply here.
 */
const receivedExpression = (purchaseRef = "pu.id") => `
  COALESCE((
    SELECT SUM(sp.amount) FROM supplier_payments sp
     WHERE sp.purchase_id = ${purchaseRef}
  ), 0)
`;

/**
 * Totals across every supplier, for the overview.
 *
 * Each supplier is settled on his own and only then added up, exactly as
 * collectionTotals does on the customer side, and for the same reason: netting
 * them lets an advance sitting with one mill hide a bill overdue at another,
 * so a wholesaler who owes 80,000 to one and has 30,000 on account with a
 * second is told he owes 50,000 and pays the wrong man.
 *
 * Takes $1 as the wholesaler.
 */
const payableTotals = () => `
  SELECT
    COALESCE(SUM(GREATEST(dues.balance, 0)), 0) AS owed_by_you,
    COALESCE(SUM(GREATEST(-dues.balance, 0)), 0) AS on_account
  FROM suppliers sup
  JOIN LATERAL (
    SELECT ${balanceExpression({ supplierRef: "sup.id" })} AS balance
  ) dues ON TRUE
  WHERE sup.wholesaler_id = $1
`;

module.exports = {
  OWED_PURCHASE_STATUSES,
  balanceExpression,
  receivedExpression,
  payableTotals,
};
