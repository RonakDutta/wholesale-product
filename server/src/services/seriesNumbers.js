const invoiceRepository = require("../repositories/invoiceRepository");
const { financialYear } = require("./invoiceNumberService");
const {
  salePrefixFor,
  orderPrefixFor,
  seriesKeyFor,
  getLinkageConfig,
} = require("./salesChannels");

/**
 * Sale and challan numbers, in one place.
 *
 * Each document type and each marketplace/channel linkage maintains its own
 * unbroken run of numbers, restarting on 1 April for each financial year.
 *
 * Must be called inside a transaction: the upsert locks the counter row until
 * commit, which is what stops two documents taking the same number.
 */

class SequenceNumberError extends Error {
  constructor(message) {
    super(message);
    this.name = "SequenceNumberError";
    this.status = 409;
    this.code = "DOCUMENT_NUMBER_INVALID";
  }
}

/**
 * Rule 46(b) of the CGST Rules: a tax invoice number is at most 16 characters
 * and holds only letters, digits, hyphen and slash.
 */
const GST_NUMBER_CHARS = /^[A-Za-z0-9/-]+$/;
const RULE_46B_MAX = 16;

function validateSequenceNumber(number, { statutory = true } = {}) {
  if (!number || typeof number !== "string") {
    throw new SequenceNumberError("A document number could not be generated.");
  }
  if (statutory && number.length > RULE_46B_MAX) {
    throw new SequenceNumberError(
      `Number "${number}" is ${number.length} characters. GST allows at most ` +
        `${RULE_46B_MAX}, so this series needs a shorter prefix before it can ` +
        `be used again.`,
    );
  }
  if (!GST_NUMBER_CHARS.test(number)) {
    throw new SequenceNumberError(
      `Number "${number}" has characters GST does not allow. Only letters, ` +
        `digits, hyphen and slash are permitted.`,
    );
  }
  return true;
}

let hasSaleSeriesCol = null;
let hasOrderSeriesCol = null;

const checkSaleSeriesColumn = async (client) => {
  if (hasSaleSeriesCol !== null) return hasSaleSeriesCol;
  try {
    const res = await client.query(
      `SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sale_sequences' AND column_name = 'series' LIMIT 1`,
    );
    hasSaleSeriesCol = res.rows.length > 0;
  } catch {
    hasSaleSeriesCol = false;
  }
  return hasSaleSeriesCol;
};

const checkOrderSeriesColumn = async (client) => {
  if (hasOrderSeriesCol !== null) return hasOrderSeriesCol;
  try {
    const res = await client.query(
      `SELECT 1 FROM information_schema.columns
        WHERE table_name = 'order_sequences' AND column_name = 'series' LIMIT 1`,
    );
    hasOrderSeriesCol = res.rows.length > 0;
  } catch {
    hasOrderSeriesCol = false;
  }
  return hasOrderSeriesCol;
};

/**
 * Generates the next consecutive sale number.
 *
 * When a marketplace/channel is provided, draws on that linkage's independent
 * counter row and prefix.
 */
const nextSaleNumber = async (client, wholesalerId, channel = "counter", options = {}) => {
  const has = await invoiceRepository.schemaExtras(client);

  // Legacy fallback if financial_year column was not migrated
  if (!has.has_series_fy) {
    const legacy = await client.query(
      `INSERT INTO sale_sequences (wholesaler_id, last_number)
       VALUES ($1, 1)
       ON CONFLICT (wholesaler_id)
       DO UPDATE SET last_number = sale_sequences.last_number + 1
       RETURNING last_number`,
      [wholesalerId],
    );
    const generated = `S-${String(legacy.rows[0].last_number).padStart(4, "0")}`;
    validateSequenceNumber(generated, options);
    return generated;
  }

  const fy = financialYear();
  const seriesKey = seriesKeyFor(channel);
  const linkage = options.linkage || (await getLinkageConfig(wholesalerId, seriesKey, client));
  const prefix = options.prefix || salePrefixFor(seriesKey, linkage);

  const hasSeries = await checkSaleSeriesColumn(client);
  const result = hasSeries
    ? await client.query(
        `INSERT INTO sale_sequences (wholesaler_id, financial_year, series, last_number)
         VALUES ($1, $2, $3, 1)
         ON CONFLICT (wholesaler_id, financial_year, series)
         DO UPDATE SET last_number = sale_sequences.last_number + 1
         RETURNING last_number`,
        [wholesalerId, fy, seriesKey],
      )
    : await client.query(
        `INSERT INTO sale_sequences (wholesaler_id, financial_year, last_number)
         VALUES ($1, $2, 1)
         ON CONFLICT (wholesaler_id, financial_year)
         DO UPDATE SET last_number = sale_sequences.last_number + 1
         RETURNING last_number`,
        [wholesalerId, fy],
      );

  const cleanPrefix = prefix.endsWith("/") || prefix.endsWith("-") ? prefix : `${prefix}/`;
  const generated = `${cleanPrefix}${result.rows[0].last_number}/${fy}`;
  validateSequenceNumber(generated, options);
  return generated;
};

/**
 * SC/1/26-27 for a sale challan, PC/1/26-27 for a purchase challan.
 */
const CHALLAN_PREFIX = { sale: "SC/", purchase: "PC/" };
const CHALLAN_LEGACY = { sale: "SC-", purchase: "PC-" };

const nextChallanNumber = async (client, wholesalerId, kind = "sale") => {
  const key = CHALLAN_PREFIX[kind] ? kind : "sale";
  const has = await invoiceRepository.schemaExtras(client);

  if (!has.has_series_fy) {
    const legacy = await client.query(
      `INSERT INTO delivery_challan_sequences (wholesaler_id, last_number)
       VALUES ($1, 1)
       ON CONFLICT (wholesaler_id)
       DO UPDATE SET last_number = delivery_challan_sequences.last_number + 1
       RETURNING last_number`,
      [wholesalerId],
    );
    const generated = `${CHALLAN_LEGACY[key]}${String(legacy.rows[0].last_number).padStart(4, "0")}`;
    validateSequenceNumber(generated, { statutory: false });
    return generated;
  }

  const fy = financialYear();
  const hasKind = await client
    .query(
      `SELECT 1 FROM information_schema.columns
        WHERE table_name = 'delivery_challan_sequences' AND column_name = 'kind'`,
    )
    .then((r) => r.rows.length > 0)
    .catch(() => false);

  const result = hasKind
    ? await client.query(
        `INSERT INTO delivery_challan_sequences (wholesaler_id, financial_year, kind, last_number)
         VALUES ($1, $2, $3, 1)
         ON CONFLICT (wholesaler_id, financial_year, kind)
         DO UPDATE SET last_number = delivery_challan_sequences.last_number + 1
         RETURNING last_number`,
        [wholesalerId, fy, key],
      )
    : await client.query(
        `INSERT INTO delivery_challan_sequences (wholesaler_id, financial_year, last_number)
         VALUES ($1, $2, 1)
         ON CONFLICT (wholesaler_id, financial_year)
         DO UPDATE SET last_number = delivery_challan_sequences.last_number + 1
         RETURNING last_number`,
        [wholesalerId, fy],
      );

  const generated = `${CHALLAN_PREFIX[key]}${result.rows[0].last_number}/${fy}`;
  validateSequenceNumber(generated, { statutory: false });
  return generated;
};

/**
 * PUR/1/26-27 for purchase vouchers.
 */
const nextPurchaseNumber = async (client, wholesalerId) => {
  const fy = financialYear();
  const result = await client.query(
    `INSERT INTO purchase_sequences (wholesaler_id, financial_year, last_number)
     VALUES ($1, $2, 1)
     ON CONFLICT (wholesaler_id, financial_year)
     DO UPDATE SET last_number = purchase_sequences.last_number + 1
     RETURNING last_number`,
    [wholesalerId, fy],
  );
  const generated = `PUR/${result.rows[0].last_number}/${fy}`;
  validateSequenceNumber(generated, { statutory: false });
  return generated;
};

/**
 * SO/1/26-27, or linkage-specific order run (e.g. SO-AZ/1/26-27).
 *
 * Each marketplace/channel linkage maintains its own independent run of orders.
 */
const nextOrderNumber = async (client, wholesalerId, channel = "shop", options = {}) => {
  const fy = financialYear();
  const seriesKey = seriesKeyFor(channel);
  const linkage = options.linkage || (await getLinkageConfig(wholesalerId, seriesKey, client));
  const prefix = options.prefix || orderPrefixFor(seriesKey, linkage);

  const hasSeries = await checkOrderSeriesColumn(client);
  const result = hasSeries
    ? await client.query(
        `INSERT INTO order_sequences (wholesaler_id, financial_year, series, last_number)
         VALUES ($1, $2, $3, 1)
         ON CONFLICT (wholesaler_id, financial_year, series)
         DO UPDATE SET last_number = order_sequences.last_number + 1
         RETURNING last_number`,
        [wholesalerId, fy, seriesKey],
      )
    : await client.query(
        `INSERT INTO order_sequences (wholesaler_id, financial_year, last_number)
         VALUES ($1, $2, 1)
         ON CONFLICT (wholesaler_id, financial_year)
         DO UPDATE SET last_number = order_sequences.last_number + 1
         RETURNING last_number`,
        [wholesalerId, fy],
      );

  const cleanPrefix = prefix.endsWith("/") || prefix.endsWith("-") ? prefix : `${prefix}/`;
  const generated = `${cleanPrefix}${result.rows[0].last_number}/${fy}`;
  validateSequenceNumber(generated, { statutory: false });
  return generated;
};

module.exports = {
  nextSaleNumber,
  nextOrderNumber,
  nextChallanNumber,
  nextPurchaseNumber,
  validateSequenceNumber,
  SequenceNumberError,
  resetSeriesColumnCache: () => {
    hasSaleSeriesCol = null;
    hasOrderSeriesCol = null;
  },
};
