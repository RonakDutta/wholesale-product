/**
 * Where a sale came from, and which run of invoice numbers it draws on.
 *
 * Rule 46(b) wants an invoice number that is consecutive WITHIN ITS SERIES and
 * unique within the financial year. A wholesaler selling over the counter, on
 * this marketplace, on Flipkart and on Amazon is running four books, and each
 * marketplace reconciles against its own. One shared counter means Flipkart's
 * run reads 4, 9, 11, with the gaps filled by counter sales, and their
 * settlement report cannot be matched against it.
 *
 * THIS FILE DOES NOT IMPORT ANYTHING FROM FLIPKART OR AMAZON. It records which
 * book a sale belongs to, because somebody said so on the form. Pulling orders
 * out of those marketplaces is a separate piece of work: a CSV parser per
 * marketplace, or their APIs, which need a developer account and a seller
 * authorisation that cannot be arranged from inside this codebase. Saying
 * "Flipkart" on a dropdown is not an integration and the screen does not
 * pretend otherwise.
 *
 * THE PREFIX BUDGET. `PREFIX/1/26-27` spends 9 characters before the prefix
 * and Rule 46(b) allows 16, so there is room for a short one and a sequence
 * that can still grow. Two characters plus a slash leaves five digits, which
 * is 99,999 bills in a year on one channel.
 */

/**
 * The counter channel keeps the wholesaler's OWN configured prefix rather than
 * being given one here, so nothing changes for a wholesaler who has been
 * running on `invoice_settings.prefix` all along. Their existing run carries
 * on, and the three new channels start their own at 1, which is exactly what a
 * new series is allowed to do.
 */
const CHANNELS = [
  {
    code: "counter",
    label: "Counter or phone",
    hint: "A sale you made yourself. Uses the invoice prefix from your settings.",
    prefix: null,
  },
  {
    code: "shop",
    label: "This shop",
    hint: "An order placed through your shop page here.",
    prefix: "SA/",
  },
  {
    code: "flipkart",
    label: "Flipkart",
    hint: "Recorded by you. Nothing is pulled from Flipkart.",
    prefix: "FK/",
  },
  {
    code: "amazon",
    label: "Amazon",
    hint: "Recorded by you. Nothing is pulled from Amazon.",
    prefix: "AZ/",
  },
];

const BY_CODE = new Map(CHANNELS.map((c) => [c.code, c]));
const DEFAULT_CHANNEL = "counter";

/**
 * The channel a request asked for, or the default.
 *
 * Returns `{ error }` for anything else rather than quietly falling back,
 * because a sale silently filed in the wrong book is a run of numbers that
 * cannot be reconciled and nobody was told.
 */
const parseChannel = (value) => {
  const code = String(value ?? "").trim().toLowerCase();
  if (!code) return { channel: DEFAULT_CHANNEL };
  if (!BY_CODE.has(code)) {
    return {
      error: `Unknown sales channel "${code}". It is one of: ${CHANNELS.map((c) => c.code).join(", ")}.`,
    };
  }
  return { channel: code };
};

/**
 * The prefix to number this channel's invoices with.
 *
 * `settingsPrefix` is the wholesaler's own, and it wins for the counter
 * channel. For the others the channel's prefix is used, because the point of a
 * separate series is that it is tellable apart at a glance.
 */
const prefixFor = (channel, settingsPrefix) => {
  const found = BY_CODE.get(channel) || BY_CODE.get(DEFAULT_CHANNEL);
  return found.prefix || settingsPrefix || "INV";
};

/** The key the counter is kept under. One run per wholesaler, channel and year. */
const seriesKeyFor = (channel) => (BY_CODE.has(channel) ? channel : DEFAULT_CHANNEL);

module.exports = {
  CHANNELS,
  DEFAULT_CHANNEL,
  parseChannel,
  prefixFor,
  seriesKeyFor,
  isChannel: (code) => BY_CODE.has(String(code ?? "").toLowerCase()),
};
