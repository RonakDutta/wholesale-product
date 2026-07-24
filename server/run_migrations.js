const fs = require('fs');
const path = require('path');
const pool = require('./src/config/db');

async function run() {
  const dir = path.join(__dirname, 'migrations');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let hadError = false;
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    try {
      await pool.query(sql);
      console.log(`Applied migration: ${file}`);
    } catch (err) {
      hadError = true;
      console.error(`Migration error in ${file}:`, err.message);
    }
  }

  await pool.end();
  if (hadError) {
    process.exit(1);
  } else {
    console.log('All migrations applied');
  }
}

run();
