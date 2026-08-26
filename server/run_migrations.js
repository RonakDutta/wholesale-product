const fs = require("fs");
const path = require("path");
const pool = require("./src/config/db");

/**
 * Applies every .sql file in migrations/ against DATABASE_URL.
 *
 * Ordering is the whole problem here. The files are named by subject, not by
 * sequence, so alphabetical order puts wholesale3_credit_notes.sql ahead of
 * the file that creates the tables it points at. That fails with "relation
 * sales does not exist", which is loud and harmless, but it also means a
 * single pass can leave a database half migrated and a person wondering
 * whether it worked.
 *
 * Rather than encode a dependency order that would go stale the moment
 * somebody adds a file, this makes passes until nothing new succeeds. Every
 * migration in this directory is written to be safe to run twice, which is
 * what makes that legitimate: a file that failed only because its dependency
 * had not run yet will succeed on the next pass, and a file that already
 * applied is a no op.
 *
 * A file that fails for a real reason fails on every pass, and is reported at
 * the end with its error rather than buried in the middle of the log.
 */
async function run() {
  const dir = path.join(__dirname, "migrations");
  const all = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  // z_fix_order_payment_status_constraint.sql is named to sort last on
  // purpose: it re-applies a CHECK constraint that earlier files drop. Keep
  // it last on every pass.
  let pending = all;
  const applied = [];
  let failures = new Map();

  for (let pass = 1; pending.length > 0 && pass <= 5; pass++) {
    const stillPending = [];
    failures = new Map();

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(dir, file), "utf8");
      try {
        await pool.query(sql);
        applied.push(file);
        console.log(`  applied  ${file}`);
      } catch (err) {
        stillPending.push(file);
        failures.set(file, err.message);
      }
    }

    if (stillPending.length === pending.length) {
      // Nothing moved, so another pass will not help either.
      break;
    }
    if (stillPending.length > 0) {
      console.log(
        `  ${stillPending.length} file(s) not ready on pass ${pass}, retrying`,
      );
    }
    pending = stillPending;
  }

  await pool.end();

  console.log(`\n${applied.length} of ${all.length} migrations applied.`);
  if (failures.size > 0) {
    console.error("\nStill failing:");
    for (const [file, message] of failures) {
      console.error(`  ${file}\n    ${message}`);
    }
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Migration run failed:", err.message);
  process.exit(1);
});
