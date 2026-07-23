const fs = require('fs');
const path = require('path');
const pool = require('./src/config/db');

async function run() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'migrations', 'reviews_system.sql'), 'utf8');
    await pool.query(sql);
    console.log('Migrations applied');
    await pool.end();
  } catch (err) {
    console.error('Migration error', err);
    try { await pool.end(); } catch (e) {}
    process.exit(1);
  }
}

run();
