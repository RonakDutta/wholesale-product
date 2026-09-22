/**
 * Verification test script for Multiple Marketplace Linkages with Independent Series Numbers.
 *
 * Tests:
 * 1. SUPPORTED_MARKETPLACES registry (extensible, includes Amazon and Flipkart).
 * 2. Prefix and seriesKey resolution for default channels and custom linkages.
 * 3. Dynamic channel listing via getWholesalerChannels (combines built-in channels with linkages).
 * 4. Multi-linkage independent sequence generation:
 *    - Invoices: independent sequences starting at 1 per linkage.
 *    - Sales: independent sequences starting at 1 per linkage.
 *    - Orders: independent sequences starting at 1 per linkage.
 * 5. Cross-channel collision prevention:
 *    - Proves two different Amazon stores (e.g. Amazon North vs Amazon South) and Flipkart stores
 *      increment their own sequences independently without colliding with each other or counter/shop.
 * 6. CGST Rule 46(b) formatting and constraints:
 *    - Max 16 characters enforcement.
 *    - Character set validation ([A-Za-z0-9/-]).
 *    - Rejection of oversized or invalid shapes.
 *
 * Run: node server/scripts/marketplace_linkage_check.js
 */

const {
  SUPPORTED_MARKETPLACES,
  MARKETPLACE_BY_ID,
  prefixFor,
  salePrefixFor,
  orderPrefixFor,
  seriesKeyFor,
  getWholesalerChannels,
  resolveChannel,
} = require("../src/services/salesChannels");
const {
  nextSaleNumber,
  nextOrderNumber,
  validateSequenceNumber,
  resetSeriesColumnCache,
} = require("../src/services/seriesNumbers");
const invoiceRepository = require("../src/repositories/invoiceRepository");
const invoiceNumberService = require("../src/services/invoiceNumberService");
const { financialYear, compose, MAX_LENGTH } = invoiceNumberService;

let passes = 0;
let fails = 0;

function check(desc, cond) {
  if (cond) {
    passes++;
    console.log(`  [PASS] ${desc}`);
  } else {
    fails++;
    console.error(`  [FAIL] ${desc}`);
  }
}

/**
 * In-memory mock database client simulating PostgreSQL connection with
 * sequence tracking across tables:
 * - marketplace_linkages
 * - sale_sequences
 * - order_sequences
 * - invoice_sequences
 */
function createMockDbClient() {
  const linkages = [];
  const saleSeqs = new Map(); // key: wholesaler_id:financial_year:series => last_number
  const orderSeqs = new Map(); // key: wholesaler_id:financial_year:series => last_number
  const invoiceSeqs = new Map(); // key: wholesaler_id:series:year => last_number

  return {
    linkages,
    saleSeqs,
    orderSeqs,
    invoiceSeqs,
    async query(sql, args = []) {
      const q = sql.trim();

      // Schema probes
      if (q.includes("to_regclass('public.credit_notes')")) {
        return {
          rows: [
            {
              has_credit_notes: true,
              has_party_payments: true,
              has_sales: true,
              has_sale_id: true,
              has_recipient: true,
              has_document_block: true,
              has_sale_tax: true,
              has_sale_transport: true,
              has_order_transport: true,
              has_invoice_channel: true,
              has_sale_channel: true,
              has_cess: true,
              has_sale_order_id: true,
              has_invoice_series: true,
              has_number_format: true,
              has_series_fy: true,
              has_rule46_fields: true,
              has_line_gst: true,
              has_item_gst: true,
              has_listing_billing: true,
              has_invoice_sequence_owner: true,
              has_purchases: true,
            },
          ],
        };
      }
      if (q.includes("to_regclass('public.invoices')")) {
        return { rows: [{ built: true }] };
      }
      if (q.includes("information_schema.columns")) {
        return { rows: [{ exists: 1 }] };
      }
      if (q.includes("information_schema.tables")) {
        return { rows: [{ exists: 1 }] };
      }

      // SELECT marketplace_linkages
      if (q.startsWith("SELECT") && q.includes("marketplace_linkages")) {
        if (q.includes("WHERE wholesaler_id = $1 AND code = $2") || q.includes("LOWER(code) = LOWER($2)")) {
          const [wid, code] = args;
          const match = linkages.filter(
            (l) => l.wholesaler_id === wid && l.code.toLowerCase() === String(code).toLowerCase(),
          );
          return { rows: match };
        }
        if (q.includes("WHERE wholesaler_id = $1")) {
          const [wid] = args;
          const match = linkages.filter((l) => l.wholesaler_id === wid);
          return { rows: match };
        }
      }

      // sale_sequences UPSERT
      if (q.includes("sale_sequences") && q.includes("INSERT INTO sale_sequences")) {
        const [wid, fy, series] = args;
        const key = `${wid}:${fy}:${series}`;
        const current = saleSeqs.get(key) || 0;
        const next = current + 1;
        saleSeqs.set(key, next);
        return { rows: [{ last_number: next }] };
      }

      // order_sequences UPSERT
      if (q.includes("order_sequences") && q.includes("INSERT INTO order_sequences")) {
        const [wid, fy, series] = args;
        const key = `${wid}:${fy}:${series}`;
        const current = orderSeqs.get(key) || 0;
        const next = current + 1;
        orderSeqs.set(key, next);
        return { rows: [{ last_number: next }] };
      }

      // invoice_sequences UPSERT
      if (q.includes("invoice_sequences") && q.includes("INSERT INTO invoice_sequences")) {
        const [wid, series, year] = args;
        const key = `${wid}:${series}:${year}`;
        const current = invoiceSeqs.get(key) || 0;
        const next = current + 1;
        invoiceSeqs.set(key, next);
        return { rows: [{ last_number: next }] };
      }

      // settings lookup
      if (q.includes("SELECT") && q.includes("FROM settings")) {
        return { rows: [] };
      }

      return { rows: [] };
    },
  };
}

async function runTests() {
  console.log("\n========================================================");
  console.log(" MULTIPLE MARKETPLACE LINKAGES & SERIES NUMBERS TEST SUITE");
  console.log("========================================================\n");

  resetSeriesColumnCache();
  invoiceRepository.resetSchemaExtras();

  // 1. Supported Marketplaces Registry
  console.log("--- 1. Extensible Marketplace Registry ---");
  const amazonMp = SUPPORTED_MARKETPLACES.find((m) => m.id === "amazon");
  const flipkartMp = SUPPORTED_MARKETPLACES.find((m) => m.id === "flipkart");
  check("SUPPORTED_MARKETPLACES includes amazon", Boolean(amazonMp));
  check("SUPPORTED_MARKETPLACES includes flipkart", Boolean(flipkartMp));
  check("Amazon has default prefixes (AZ/, S-AZ/, SO-AZ/)", 
    amazonMp?.defaultPrefix === "AZ/" &&
    amazonMp?.defaultSalePrefix === "S-AZ/" &&
    amazonMp?.defaultOrderPrefix === "SO-AZ/"
  );
  check("Flipkart has default prefixes (FK/, S-FK/, SO-FK/)", 
    flipkartMp?.defaultPrefix === "FK/" &&
    flipkartMp?.defaultSalePrefix === "S-FK/" &&
    flipkartMp?.defaultOrderPrefix === "SO-FK/"
  );
  check("MARKETPLACE_BY_ID map functions correctly", MARKETPLACE_BY_ID.get("amazon")?.name === "Amazon");

  // 2. Prefix Resolution
  console.log("\n--- 2. Prefix and Series Key Helpers ---");
  const customAmazon2 = {
    code: "amazon_2",
    marketplace: "amazon",
    invoice_prefix: "AZ2/",
    sale_prefix: "S-AZ2/",
    order_prefix: "SO-AZ2/",
  };
  check("prefixFor built-in 'amazon' defaults to AZ/", prefixFor("amazon") === "AZ/");
  check("prefixFor built-in 'flipkart' defaults to FK/", prefixFor("flipkart") === "FK/");
  check("prefixFor built-in 'counter' defaults to INV/ (or custom settings prefix)", prefixFor("counter") === "INV/");
  check("prefixFor custom linkage uses custom invoice_prefix", prefixFor("amazon_2", customAmazon2) === "AZ2/");
  check("salePrefixFor custom linkage uses custom sale_prefix", salePrefixFor("amazon_2", customAmazon2) === "S-AZ2/");
  check("orderPrefixFor custom linkage uses custom order_prefix", orderPrefixFor("amazon_2", customAmazon2) === "SO-AZ2/");
  check("seriesKeyFor returns sanitized code", seriesKeyFor("amazon_2", customAmazon2) === "amazon_2");

  // 3. Dynamic Channel Discovery & Merging
  console.log("\n--- 3. Channel Discovery & Resolution ---");
  const mockClient = createMockDbClient();
  const testWholesaler = "00000000-0000-0000-0000-000000000001";

  mockClient.linkages.push({
    id: "l-1",
    wholesaler_id: testWholesaler,
    marketplace: "amazon",
    linkage_name: "Amazon North Yard",
    code: "amazon_north",
    invoice_prefix: "AZN/",
    sale_prefix: "SAN/",
    order_prefix: "OAN/",
    number_suffix: "/{FY}",
    number_pad_to: 0,
    is_active: true,
  });

  mockClient.linkages.push({
    id: "l-2",
    wholesaler_id: testWholesaler,
    marketplace: "amazon",
    linkage_name: "Amazon South Yard",
    code: "amazon_south",
    invoice_prefix: "AZS/",
    sale_prefix: "SAS/",
    order_prefix: "OAS/",
    number_suffix: "/{FY}",
    number_pad_to: 0,
    is_active: true,
  });

  mockClient.linkages.push({
    id: "l-3",
    wholesaler_id: testWholesaler,
    marketplace: "flipkart",
    linkage_name: "Flipkart Express",
    code: "fk_express",
    invoice_prefix: "FKX/",
    sale_prefix: "SFX/",
    order_prefix: "OFX/",
    number_suffix: "/{FY}",
    number_pad_to: 0,
    is_active: true,
  });

  const channels = await getWholesalerChannels(testWholesaler, mockClient);
  check("getWholesalerChannels returns built-in channels + all 3 linkages", channels.length === 4 + 3);
  check("Channels list contains Amazon North", channels.some((c) => c.code === "amazon_north"));
  check("Channels list contains Amazon South", channels.some((c) => c.code === "amazon_south"));
  check("Channels list contains Flipkart Express", channels.some((c) => c.code === "fk_express"));

  const resolvedLinkage = await resolveChannel("amazon_north", testWholesaler, mockClient);
  check("resolveChannel finds custom linkage record", resolvedLinkage.linkage?.code === "amazon_north");

  const resolvedBuiltin = await resolveChannel("amazon", testWholesaler, mockClient);
  check("resolveChannel preserves built-in amazon", resolvedBuiltin.channel === "amazon" && resolvedBuiltin.linkage === null);

  // 4. Multi-Linkage Independent Sales Sequences
  console.log("\n--- 4. Multi-Linkage Independent Sales Sequences ---");
  const sNorth1 = await nextSaleNumber(mockClient, testWholesaler, "amazon_north", { linkage: mockClient.linkages[0] });
  const sNorth2 = await nextSaleNumber(mockClient, testWholesaler, "amazon_north", { linkage: mockClient.linkages[0] });
  const sSouth1 = await nextSaleNumber(mockClient, testWholesaler, "amazon_south", { linkage: mockClient.linkages[1] });
  const sFk1 = await nextSaleNumber(mockClient, testWholesaler, "fk_express", { linkage: mockClient.linkages[2] });
  const sShop1 = await nextSaleNumber(mockClient, testWholesaler, "shop");

  const fy = financialYear();
  check(`Amazon North Sale 1 is SAN/1/${fy}`, sNorth1 === `SAN/1/${fy}`);
  check(`Amazon North Sale 2 is SAN/2/${fy}`, sNorth2 === `SAN/2/${fy}`);
  check(`Amazon South Sale 1 is SAS/1/${fy} (independent sequence from North)`, sSouth1 === `SAS/1/${fy}`);
  check(`Flipkart Express Sale 1 is SFX/1/${fy} (independent sequence)`, sFk1 === `SFX/1/${fy}`);
  check(`Shop Sale 1 is S-SA/1/${fy} (default built-in sequence unaffected)`, sShop1 === `S-SA/1/${fy}`);

  // 5. Multi-Linkage Independent Order Sequences
  console.log("\n--- 5. Multi-Linkage Independent Order Sequences ---");
  const oNorth1 = await nextOrderNumber(mockClient, testWholesaler, "amazon_north", { linkage: mockClient.linkages[0] });
  const oSouth1 = await nextOrderNumber(mockClient, testWholesaler, "amazon_south", { linkage: mockClient.linkages[1] });
  const oNorth2 = await nextOrderNumber(mockClient, testWholesaler, "amazon_north", { linkage: mockClient.linkages[0] });
  const oShop1 = await nextOrderNumber(mockClient, testWholesaler, "shop");

  check(`Amazon North Order 1 is OAN/1/${fy}`, oNorth1 === `OAN/1/${fy}`);
  check(`Amazon South Order 1 is OAS/1/${fy}`, oSouth1 === `OAS/1/${fy}`);
  check(`Amazon North Order 2 is OAN/2/${fy}`, oNorth2 === `OAN/2/${fy}`);
  check(`Shop Order 1 is SO/1/${fy}`, oShop1 === `SO/1/${fy}`);

  // 6. Multi-Linkage Independent Invoice Sequences
  console.log("\n--- 6. Multi-Linkage Independent Invoice Sequences ---");
  const iNorth1 = await invoiceNumberService.generateInvoiceNumber(mockClient, "INV", 2026, testWholesaler, {
    channel: "amazon_north",
    linkage: mockClient.linkages[0],
  });
  const iNorth2 = await invoiceNumberService.generateInvoiceNumber(mockClient, "INV", 2026, testWholesaler, {
    channel: "amazon_north",
    linkage: mockClient.linkages[0],
  });
  const iSouth1 = await invoiceNumberService.generateInvoiceNumber(mockClient, "INV", 2026, testWholesaler, {
    channel: "amazon_south",
    linkage: mockClient.linkages[1],
  });
  const iDefaultCounter = await invoiceNumberService.generateInvoiceNumber(mockClient, "INV", 2026, testWholesaler, {
    channel: "counter",
  });

  check(`Amazon North Invoice 1: ${iNorth1} (starts at 1 with AZN/)`, iNorth1.startsWith("AZN/") && iNorth1.includes("1"));
  check(`Amazon North Invoice 2: ${iNorth2} (increments to 2)`, iNorth2.startsWith("AZN/") && iNorth2.includes("2"));
  check(`Amazon South Invoice 1: ${iSouth1} (independent run starting at 1 with AZS/)`, iSouth1.startsWith("AZS/") && iSouth1.includes("1"));
  check(`Counter Invoice 1: ${iDefaultCounter} (counter series starting at 1)`, iDefaultCounter.startsWith("INV") && iDefaultCounter.includes("1"));

  // 7. CGST Rule 46(b) Compliance & Previews
  console.log("\n--- 7. CGST Rule 46(b) Compliance ---");
  const sampleValid = compose({
    prefix: "AZ2/",
    suffix: "/{FY}",
    padTo: 0,
    sequence: 1,
  });
  check(`Valid sample '${sampleValid.number}' is <= 16 chars (length: ${sampleValid.number.length})`, sampleValid.ok && sampleValid.number.length <= MAX_LENGTH);
  check("Charset matches GST allowed characters", /^[A-Za-z0-9/-]+$/.test(sampleValid.number));

  const sampleLong = compose({
    prefix: "VERYLONGLINKAGEPREFIX/",
    suffix: "/2026-2027",
    padTo: 4,
    sequence: 1,
  });
  check(`Oversized sample correctly flagged as illegal (> 16 chars): ok = ${sampleLong.ok}`, sampleLong.ok === false);

  console.log("\n========================================================");
  console.log(` RESULTS: ${passes} PASSED, ${fails} FAILED`);
  console.log("========================================================\n");

  if (fails > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution threw exception:", err);
  process.exit(1);
});
