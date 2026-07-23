const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const email = 'arnavpatel@gmail.com';
const password = 'arnav@123';

async function run() {
  try {
    const result = await pool.query(
      'SELECT id, email, password_hash, role, first_name, last_name FROM users WHERE email = $1',
      [email],
    );

    if (result.rows.length === 0) {
      console.log(JSON.stringify({ found: false }));
      await pool.end();
      return;
    }

    const row = result.rows[0];
    const match = await bcrypt.compare(password, row.password_hash);

    console.log(JSON.stringify({
      found: true,
      id: row.id,
      email: row.email,
      role: row.role,
      firstName: row.first_name,
      lastName: row.last_name,
      password_match: match,
    }));

    await pool.end();
  } catch (err) {
    console.error('ERROR', err.message || err);
    try { await pool.end(); } catch (e) {}
    process.exit(2);
  }
}

run();
