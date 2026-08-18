const { Pool } = require("pg");
require("dotenv").config();

// The live schema is defined by the files in server/migrations, which are the
// only authority on it.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
  },
});

module.exports = pool;
