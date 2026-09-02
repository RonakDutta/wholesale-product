const { Pool } = require("pg");
require("dotenv").config();

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/wholesale_marketplace";

const isLocalConnection =
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1") ||
  !connectionString.includes("neon.tech");

// Local PostgreSQL does not use TLS, while remote Neon requires SSL. Using the
// same SSL config for both caused the login API to hit the catch block and
// return a generic 500.
const pool = new Pool({
  connectionString,
  ssl: isLocalConnection ? false : { rejectUnauthorized: true },
});

module.exports = pool;
