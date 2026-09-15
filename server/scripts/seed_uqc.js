/**
 * Idempotent seed script to map master_units to official GST UQC codes.
 * Conforms strictly to CBIC / GST Portal Unique Quantity Code standards.
 *
 * Usage:
 *   node server/scripts/seed_uqc.js
 *   node server/scripts/seed_uqc.js <DATABASE_URL>
 */

const { Pool } = require("pg");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const customUrl = process.argv[2];
const pool = customUrl
  ? new Pool({
      connectionString: customUrl,
      ...(/localhost|127\.0\.0\.1/.test(customUrl) ? {} : { ssl: { rejectUnauthorized: false } }),
    })
  : require("../src/config/db");

const UQC_MAP = [
  { uqc: "PCS", pattern: /^(pcs|pc|piece|pieces)$/i },
  { uqc: "NOS", pattern: /^(nos|no|number|numbers|quantity|qty)$/i },
  { uqc: "KGS", pattern: /^(kg|kgs|kilogram|kilograms)$/i },
  { uqc: "GMS", pattern: /^(gm|gms|gram|grams)$/i },
  { uqc: "MTR", pattern: /^(mtr|meter|meters|metre|metres)$/i },
  { uqc: "BOX", pattern: /^(box|boxes|case)$/i },
  { uqc: "BAG", pattern: /^(bag|bags)$/i },
  { uqc: "CTN", pattern: /^(ctn|carton|cartons)$/i },
  { uqc: "DOZ", pattern: /^(doz|dozen)$/i },
  { uqc: "BDL", pattern: /^(bdl|bundle|bundles)$/i },
  { uqc: "ROL", pattern: /^(rol|roll|rolls)$/i },
  { uqc: "PRS", pattern: /^(prs|pair|pairs)$/i },
  { uqc: "SET", pattern: /^(set|sets)$/i },
  { uqc: "QTL", pattern: /^(qtl|quintal|quintals)$/i },
  { uqc: "MTS", pattern: /^(mts|ton|tons|tonne|tonnes)$/i },
  { uqc: "MLT", pattern: /^(ml|mlt|millilitre|millilitres)$/i },
  { uqc: "KLR", pattern: /^(klr|ltr|litre|litres|liter|liters|kilolitre)$/i },
  { uqc: "OTH", pattern: /^(oth|other|others|misc|miscellaneous|default)$/i },
];

function resolveUqc(code, name) {
  const c = String(code || "").trim();
  const n = String(name || "").trim();

  for (const entry of UQC_MAP) {
    if (entry.pattern.test(c) || entry.pattern.test(n)) {
      return entry.uqc;
    }
  }
  return "OTH";
}

async function seed() {
  const client = await pool.connect();
  try {
    console.log("Ensuring uqc column on master_units...");
    await client.query(`
      ALTER TABLE master_units
        ADD COLUMN IF NOT EXISTS uqc VARCHAR(10);
    `);

    const { rows } = await client.query("SELECT code, name, uqc FROM master_units");
    let updatedCount = 0;

    for (const unit of rows) {
      const targetUqc = resolveUqc(unit.code, unit.name);
      if (unit.uqc !== targetUqc) {
        await client.query(
          "UPDATE master_units SET uqc = $1 WHERE code = $2",
          [targetUqc, unit.code]
        );
        updatedCount++;
        console.log(`Updated unit '${unit.code}' (${unit.name}): ${unit.uqc || "NULL"} -> ${targetUqc}`);
      }
    }

    console.log(`UQC standardization seed completed. ${updatedCount} unit(s) updated.`);
  } finally {
    client.release();
    if (customUrl) {
      await pool.end();
    }
  }
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seed error:", err);
      process.exit(1);
    });
}

module.exports = { seed, resolveUqc, UQC_MAP };
