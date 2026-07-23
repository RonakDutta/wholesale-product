const pool = require('./src/config/db');

(async () => {
  try {
    const t = await pool.query("SELECT to_regclass('public.product_reviews') AS regclass");
    console.log('product_reviews regclass:', t.rows);
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%product%'");
    console.log('product-like tables:', tables.rows);
    const sample = await pool.query('SELECT * FROM product_reviews LIMIT 1').catch((e) => ({ error: e.message }));
    console.log('product_reviews sample:', sample);
  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    await pool.end();
  }
})();
