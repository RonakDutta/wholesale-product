const pool = require("../config/db");

/**
 * Where a sale came from, and which run of invoice numbers it draws on.
 *
 * Rule 46(b) wants an invoice number that is consecutive WITHIN ITS SERIES and
 * unique within the financial year. A wholesaler selling over the counter, on
 * this marketplace, on Flipkart and on Amazon is running multiple books, and each
 * marketplace reconciles against its own. One shared counter means Flipkart's
 * run reads 4, 9, 11, with the gaps filled by counter sales, and their
 * settlement report cannot be matched against it.
 *
 * THIS FILE DOES NOT IMPORT ANYTHING FROM FLIPKART OR AMAZON. It records which
 * book a sale belongs to, because somebody said so on the form.
 *
 * THE PREFIX BUDGET. Rule 46(b) allows at most 16 characters.
 * With /{FY} (5 chars) and /1/ (3 chars), 8 chars remain for the prefix and digits.
 * A 3-4 char prefix leaves 4-5 digits, room for up to 99,999 documents in a year.
 */

/**
 * Extensible registry of supported external marketplaces.
 * Adding a new marketplace in the future is as simple as adding an entry here.
 */
const SUPPORTED_MARKETPLACES = [
  {
    id: "amazon",
    name: "Amazon",
    defaultPrefix: "AZ/",
    defaultSalePrefix: "S-AZ/",
    defaultOrderPrefix: "SO-AZ/",
    description: "Amazon Marketplace",
  },
  {
    id: "flipkart",
    name: "Flipkart",
    defaultPrefix: "FK/",
    defaultSalePrefix: "S-FK/",
    defaultOrderPrefix: "SO-FK/",
    description: "Flipkart Marketplace",
  },
];

const MARKETPLACE_BY_ID = new Map(
  SUPPORTED_MARKETPLACES.map((m) => [m.id.toLowerCase(), m]),
);

/**
 * Built-in default channels that exist without any custom configuration.
 */
const CHANNELS = [
  {
    code: "counter",
    label: "Counter or phone",
    hint: "A sale you made yourself. Uses the invoice prefix from your settings.",
    prefix: null,
    salePrefix: "S/",
    orderPrefix: "SO/",
  },
  {
    code: "shop",
    label: "This shop",
    hint: "An order placed through your shop page here.",
    prefix: "SA/",
    salePrefix: "S-SA/",
    orderPrefix: "SO/",
  },
  {
    code: "flipkart",
    label: "Flipkart",
    hint: "Recorded by you. Nothing is pulled from Flipkart.",
    prefix: "FK/",
    salePrefix: "S-FK/",
    orderPrefix: "SO-FK/",
    marketplace: "flipkart",
  },
  {
    code: "amazon",
    label: "Amazon",
    hint: "Recorded by you. Nothing is pulled from Amazon.",
    prefix: "AZ/",
    salePrefix: "S-AZ/",
    orderPrefix: "SO-AZ/",
    marketplace: "amazon",
  },
];

const BY_CODE = new Map(CHANNELS.map((c) => [c.code, c]));
const DEFAULT_CHANNEL = "counter";

/**
 * Fetch all configured active marketplace linkages for a wholesaler from the database.
 */
const getWholesalerLinkages = async (wholesalerId, client = null) => {
  if (!wholesalerId) return [];
  const db = client || pool;
  try {
    const res = await db.query(
      `SELECT id, marketplace, linkage_name, code, invoice_prefix, sale_prefix, order_prefix,
              number_suffix, number_pad_to, is_active, created_at, updated_at
         FROM marketplace_linkages
        WHERE wholesaler_id = $1 AND is_active = TRUE
        ORDER BY created_at ASC`,
      [wholesalerId],
    );
    return res.rows;
  } catch (err) {
    // Graceful fallback if marketplace_linkages table does not exist yet
    return [];
  }
};

/**
 * Returns the full list of available channels for a wholesaler, merging
 * built-in channels with their configured marketplace linkages.
 */
const getWholesalerChannels = async (wholesalerId, client = null) => {
  const linkages = await getWholesalerLinkages(wholesalerId, client);
  if (!linkages.length) {
    return CHANNELS;
  }

  // Start with counter and shop
  const list = [BY_CODE.get("counter"), BY_CODE.get("shop")];

  const linkageCodeSet = new Set(linkages.map((l) => l.code.toLowerCase()));

  // Include default Flipkart and Amazon if the wholesaler hasn't created custom linkages for them
  for (const defaultMarketplace of ["flipkart", "amazon"]) {
    if (!linkageCodeSet.has(defaultMarketplace)) {
      list.push(BY_CODE.get(defaultMarketplace));
    }
  }

  // Add all custom linkages
  for (const l of linkages) {
    list.push({
      code: l.code,
      label: l.linkage_name,
      hint: `Marketplace linkage: ${l.marketplace}. Independent series.`,
      prefix: l.invoice_prefix,
      salePrefix: l.sale_prefix,
      orderPrefix: l.order_prefix,
      numberSuffix: l.number_suffix,
      numberPadTo: l.number_pad_to,
      marketplace: l.marketplace,
      linkageId: l.id,
      isCustom: true,
    });
  }

  return list;
};

/**
 * Look up a specific linkage config for a wholesaler.
 */
const getLinkageConfig = async (wholesalerId, channelCode, client = null) => {
  if (!wholesalerId || !channelCode) return null;
  const db = client || pool;
  try {
    const res = await db.query(
      `SELECT id, marketplace, linkage_name, code, invoice_prefix, sale_prefix, order_prefix,
              number_suffix, number_pad_to, is_active
         FROM marketplace_linkages
        WHERE wholesaler_id = $1 AND LOWER(code) = LOWER($2) AND is_active = TRUE
        LIMIT 1`,
      [wholesalerId, channelCode],
    );
    return res.rows[0] || null;
  } catch {
    return null;
  }
};

/**
 * Synchronous channel parse against built-in channels or an optional pre-loaded list of linkages.
 */
const parseChannel = (value, extraChannels = []) => {
  const code = String(value ?? "").trim().toLowerCase();
  if (!code) return { channel: DEFAULT_CHANNEL };

  if (BY_CODE.has(code)) {
    return { channel: code, config: BY_CODE.get(code) };
  }

  const foundExtra = extraChannels.find(
    (c) => (c.code || "").toLowerCase() === code,
  );
  if (foundExtra) {
    return { channel: code, config: foundExtra };
  }

  const validOptions = [
    ...CHANNELS.map((c) => c.code),
    ...extraChannels.map((c) => c.code),
  ];
  return {
    error: `Unknown sales channel "${code}". It is one of: ${validOptions.join(", ")}.`,
  };
};

/**
 * Asynchronous channel resolver that validates against both built-in channels
 * and the wholesaler's active linkages in the database.
 */
const resolveChannel = async (value, wholesalerId = null, client = null) => {
  const code = String(value ?? "").trim().toLowerCase();
  if (!code) return { channel: DEFAULT_CHANNEL };

  if (BY_CODE.has(code)) {
    // If it's a built-in channel, check if there is an active linkage overriding its prefix
    if (wholesalerId) {
      const linkage = await getLinkageConfig(wholesalerId, code, client);
      if (linkage) return { channel: code, linkage };
    }
    return { channel: code, linkage: null, config: BY_CODE.get(code) };
  }

  if (wholesalerId) {
    const linkage = await getLinkageConfig(wholesalerId, code, client);
    if (linkage) {
      return { channel: code, linkage };
    }
    const all = await getWholesalerChannels(wholesalerId, client);
    return {
      error: `Unknown sales channel "${code}". It is one of: ${all.map((c) => c.code).join(", ")}.`,
    };
  }

  return {
    error: `Unknown sales channel "${code}". It is one of: ${CHANNELS.map((c) => c.code).join(", ")}.`,
  };
};

/**
 * The prefix to number this channel's invoices with.
 */
const prefixFor = (channel, settingsPrefix = null, linkage = null) => {
  const link = settingsPrefix && typeof settingsPrefix === "object" ? settingsPrefix : linkage;
  const settingsPref = typeof settingsPrefix === "string" ? settingsPrefix : null;
  if (link && link.invoice_prefix) {
    return link.invoice_prefix;
  }
  const found = BY_CODE.get(channel) || BY_CODE.get(DEFAULT_CHANNEL);
  return found?.prefix || settingsPref || "INV/";
};

/**
 * The prefix to number this channel's sales with.
 */
const salePrefixFor = (channel, linkage = null) => {
  if (linkage && linkage.sale_prefix) {
    return linkage.sale_prefix;
  }
  const found = BY_CODE.get(channel);
  if (found?.salePrefix) return found.salePrefix;
  if (channel === "counter") return "S/";
  if (channel === "shop") return "S-SA/";
  if (channel === "flipkart") return "S-FK/";
  if (channel === "amazon") return "S-AZ/";
  return "S/";
};

/**
 * The prefix to number this channel's orders with.
 */
const orderPrefixFor = (channel, linkage = null) => {
  if (linkage && linkage.order_prefix) {
    return linkage.order_prefix;
  }
  const found = BY_CODE.get(channel);
  if (found?.orderPrefix) return found.orderPrefix;
  if (channel === "shop" || channel === "manual" || channel === "counter") return "SO/";
  if (channel === "flipkart") return "SO-FK/";
  if (channel === "amazon") return "SO-AZ/";
  return "SO/";
};

/**
 * The key the counter is kept under in sequence tables.
 */
const seriesKeyFor = (channel) => {
  const clean = String(channel ?? "").trim().toLowerCase();
  return clean || DEFAULT_CHANNEL;
};

module.exports = {
  CHANNELS,
  DEFAULT_CHANNEL,
  SUPPORTED_MARKETPLACES,
  MARKETPLACE_BY_ID,
  getWholesalerLinkages,
  getWholesalerChannels,
  getLinkageConfig,
  parseChannel,
  resolveChannel,
  prefixFor,
  salePrefixFor,
  orderPrefixFor,
  seriesKeyFor,
  isChannel: (code) => BY_CODE.has(String(code ?? "").toLowerCase()),
};
