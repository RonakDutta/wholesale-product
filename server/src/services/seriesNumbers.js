const invoiceRepository = require("../repositories/invoiceRepository");
const { financialYear } = require("./invoiceNumberService");

/**
 * Sale and delivery challan numbers, in one place.
 *
 * There were two copies of the sale numbering, one in saleController for a
 * sale the wholesaler types and one in orderSaleService for a sale written
 * when an order is accepted. Changing the shape in one of them and not the
 * other is exactly what happened on 12 Sept: sales from the sales book got the
 * new number and sales from an accepted order crashed on an ON CONFLICT that
 * no longer matched. Two copies of a rule is how this codebase has been bitten
 * repeatedly, so there is one now.
 *
 * THE SHAPE. S/1/26-27 and DC/1/26-27, restarting each 1 April, which is the
 * same shape the invoice uses. All three used to differ:
 *
 *   invoice   INV-000001   restarts yearly
 *   sale      S-0001       never restarts
 *   challan   DC-0001      never restarts
 *
 * Three documents describing the same goods, three shapes, three padding
 * widths, and no year on any of them.
 *
 * Unlike the invoice this is not a legal requirement. Rule 46(b) constrains a
 * tax invoice; a sale is the wholesaler's own record and a challan under this
 * product's rule is explicitly not a tax document. The reason is legibility,
 * not law.
 *
 * BOTH FALL BACK. Until wholesale3_series_financial_year.sql is run the old
 * shapes are produced, because migrations here are applied by hand and a sale
 * that cannot be written is far worse than one numbered the old way.
 *
 * Must be called inside a transaction: the upsert locks the counter row until
 * commit, which is what stops two sales taking the same number.
 */

const take = async (client, wholesalerId, table, legacyPrefix, prefix) => {
  const has = await invoiceRepository.schemaExtras();

  if (!has.has_series_fy) {
    const legacy = await client.query(
      `INSERT INTO ${table} (wholesaler_id, last_number)
       VALUES ($1, 1)
       ON CONFLICT (wholesaler_id)
       DO UPDATE SET last_number = ${table}.last_number + 1
       RETURNING last_number`,
      [wholesalerId],
    );
    return `${legacyPrefix}${String(legacy.rows[0].last_number).padStart(4, "0")}`;
  }

  const fy = financialYear();
  const result = await client.query(
    `INSERT INTO ${table} (wholesaler_id, financial_year, last_number)
     VALUES ($1, $2, 1)
     ON CONFLICT (wholesaler_id, financial_year)
     DO UPDATE SET last_number = ${table}.last_number + 1
     RETURNING last_number`,
    [wholesalerId, fy],
  );
  return `${prefix}${result.rows[0].last_number}/${fy}`;
};

/** S/1/26-27, or S-0001 before the migration. */
const nextSaleNumber = (client, wholesalerId) =>
  take(client, wholesalerId, "sale_sequences", "S-", "S/");

/** DC/1/26-27, or DC-0001 before the migration. */
const nextChallanNumber = (client, wholesalerId) =>
  take(client, wholesalerId, "delivery_challan_sequences", "DC-", "DC/");

module.exports = { nextSaleNumber, nextChallanNumber };
