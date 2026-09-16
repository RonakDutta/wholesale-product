/**
 * The transport block, in one place.
 *
 * A sale carries it and an invoice carries it, and when a bill is raised from a
 * sale the block is copied across. Three copies of "trim these eight fields and
 * check the mode" is how two of them end up accepting something the third
 * refuses, which this codebase has been bitten by before.
 *
 * These are the e-way bill fields. They matter beyond printing, because the
 * payload that eventually goes to NIC is built from exactly these.
 */

const { clean } = require("../utils/money");

/**
 * How the goods travel. The e-way bill form numbers these 1 to 4, but the
 * number is an encoding detail of that API and means nothing to a wholesaler
 * reading a screen, so the word is stored and the number can be derived when
 * there is something to send it to.
 */
const TRANSPORT_MODES = ["road", "rail", "air", "ship"];

/** The columns, in one list, so a writer cannot name seven of the eight. */
const TRANSPORT_COLUMNS = [
  "transporter_name",
  "transporter_id",
  "transport_mode",
  "vehicle_number",
  "transport_doc_number",
  "transport_doc_date",
  "gr_number",
  "gr_date",
];

/**
 * Reads the transport block off a request body.
 *
 * Accepts both spellings, camelCase from the client and snake_case from
 * anything reading a row back, because both reach this from somewhere.
 *
 * Returns `{ error }` for a mode that is not one of the four, rather than
 * letting the database CHECK refuse it: the constraint gives a wholesaler a
 * violation message, this gives them the four choices.
 *
 * A date is passed through as whatever was sent, or null. Postgres parses it,
 * and a half parsed date guessed at here is worse than one the database
 * refuses outright.
 */
const parseTransport = (body = {}) => {
  const pick = (camel, snake) => clean(body[camel] ?? body[snake]);

  const mode = (pick("transportMode", "transport_mode") || "").toLowerCase();
  if (mode && !TRANSPORT_MODES.includes(mode)) {
    return {
      error: `How the goods travel has to be one of: ${TRANSPORT_MODES.join(", ")}.`,
    };
  }

  return {
    values: {
      transporter_name: pick("transporterName", "transporter_name"),
      transporter_id: pick("transporterId", "transporter_id"),
      transport_mode: mode || null,
      vehicle_number: pick("vehicleNumber", "vehicle_number"),
      transport_doc_number: pick("transportDocNumber", "transport_doc_number"),
      transport_doc_date: body.transportDocDate ?? body.transport_doc_date ?? null,
      gr_number: pick("grNumber", "gr_number"),
      gr_date: body.grDate ?? body.gr_date ?? null,
    },
  };
};

/** Did the wholesaler actually record any of it? */
const hasAnyTransport = (values = {}) =>
  TRANSPORT_COLUMNS.some((c) => values[c] !== null && values[c] !== undefined && values[c] !== "");

/**
 * The same block, keyed the way invoiceRepository.createInvoice wants it.
 *
 * Used when a bill is raised from a sale, so the lorry the wholesaler recorded
 * once on the sale prints on the invoice without them typing it twice.
 */
const toInvoiceFields = (row = {}) => ({
  transporterName: row.transporter_name || null,
  transporterId: row.transporter_id || null,
  transportMode: row.transport_mode || null,
  vehicleNumber: row.vehicle_number || null,
  transportDocNumber: row.transport_doc_number || null,
  transportDocDate: row.transport_doc_date || null,
  grNumber: row.gr_number || null,
  grDate: row.gr_date || null,
});

module.exports = {
  TRANSPORT_MODES,
  TRANSPORT_COLUMNS,
  parseTransport,
  hasAnyTransport,
  toInvoiceFields,
};
