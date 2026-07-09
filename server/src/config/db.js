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
//     is_verified BOOLEAN DEFAULT false,
//     upi_id VARCHAR(100),
//     city VARCHAR(100) DEFAULT 'Delhi',
//     country VARCHAR(100) DEFAULT 'India';
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

// CREATE TABLE orders (
//     id SERIAL PRIMARY KEY,
//     buyer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
//     inventory_item_id INTEGER REFERENCES supplier_inventory(id) ON DELETE CASCADE,
//     quantity INTEGER NOT NULL,
//     total_amount DECIMAL(12, 2) NOT NULL,
//     status VARCHAR(50) DEFAULT 'Processing', -- 'Processing', 'Shipped', 'Delivered', 'Cancelled'
//     payment_status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Completed', 'Failed'
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );

// CREATE TABLE messages (
//     id SERIAL PRIMARY KEY,
//     sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
//     receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
//     message_text TEXT NOT NULL,
//     is_read BOOLEAN DEFAULT false,
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );
