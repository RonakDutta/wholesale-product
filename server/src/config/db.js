const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;

// CREATE TABLE users (
//     id SERIAL PRIMARY KEY,
//     first_name VARCHAR(100) NOT NULL,
//     last_name VARCHAR(100) NOT NULL,
//     email VARCHAR(255) UNIQUE NOT NULL,
//     password_hash VARCHAR(255) NOT NULL,
//     phone VARCHAR(20) NOT NULL,
//     role VARCHAR(20) NOT NULL, -- 'buyer', 'seller', 'both'
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );

// CREATE TABLE wholesaler_profiles (
//     id SERIAL PRIMARY KEY,
//     user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
//     company_name VARCHAR(255),
//     gstin VARCHAR(50),
//     trust_score VARCHAR(10) DEFAULT '0%',
//     response_rate VARCHAR(10) DEFAULT '0%',
//     is_verified BOOLEAN DEFAULT false
// );

// CREATE TABLE products (
//     id SERIAL PRIMARY KEY,
//     name VARCHAR(255) NOT NULL,
//     category VARCHAR(100) NOT NULL,
//     description TEXT,
//     global_image_url TEXT,
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );

// CREATE TABLE supplier_inventory (
//     id SERIAL PRIMARY KEY,
//     supplier_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
//     product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
//     price DECIMAL(10, 2) NOT NULL,
//     discount_price DECIMAL(10, 2),
//     moq INTEGER NOT NULL,
//     stock INTEGER NOT NULL,
//     shipping_days INTEGER NOT NULL
// );
