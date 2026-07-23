const pool = require('./src/config/db');
const fetch = (...args) => {
  if (typeof global.fetch === 'function') return global.fetch(...args);
  throw new Error('global fetch not available');
};
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const email = 'arnavpatel@gmail.com';
const password = 'arnav@123';

async function run() {
  try {
    // get user
    const userRes = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (userRes.rows.length === 0) {
      console.log('User not found');
      process.exit(0);
    }
    const userId = userRes.rows[0].id;
    console.log('userId', userId);

    // find eligible order (delivered/completed)
    const ordRes = await pool.query(
      `SELECT o.id as order_id, si.product_id FROM orders o JOIN supplier_inventory si ON o.inventory_item_id = si.id WHERE o.buyer_id = $1 AND (o.status = ANY($2) OR o.payment_status = ANY($3)) ORDER BY o.created_at DESC LIMIT 1`,
      [userId, ['delivered','Delivered','completed','Completed'], ['paid','Paid','completed','Completed','payment_completed']]
    );

    let order = ordRes.rows[0];
    if (!order) {
      // create a test order: pick any supplier_inventory
      const siRes = await pool.query('SELECT id, product_id FROM supplier_inventory LIMIT 1');
      if (siRes.rows.length === 0) {
        console.log('No supplier_inventory rows found to create order');
        process.exit(0);
      }
      const si = siRes.rows[0];
      const insert = await pool.query(`INSERT INTO orders (buyer_id, inventory_item_id, quantity, total_amount, status, payment_status, created_at) VALUES ($1,$2,1,10.0,'Delivered','Completed',CURRENT_TIMESTAMP) RETURNING id`, [userId, si.id]);
      order = { order_id: insert.rows[0].id, product_id: si.product_id };
      console.log('Created test order', order);
    } else {
      console.log('Using order', order);
    }

    // login to get token
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginJson = await loginRes.json();
    if (!loginRes.ok) {
      console.log('Login failed', loginJson);
      process.exit(1);
    }
    const token = loginJson.token;

    // attempt to submit review
    const payload = {
      productId: order.product_id,
      rating: 5,
      title: 'Debug review',
      comment: 'Submitting review via debug script',
      images: [],
      orderId: order.order_id
    };

    const res = await fetch('http://localhost:5000/api/reviews/product', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log('STATUS', res.status);
    console.log('BODY', text);

    process.exit(0);
  } catch (err) {
    console.error('ERROR', err);
    try { await pool.end(); } catch (e) {}
    process.exit(2);
  }
}

run();
