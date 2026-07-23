const pool = require('./src/config/db');

async function run(){
  const tables = ['users','products','orders','supplier_inventory'];
  for(const t of tables){
    try{
      const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1`, [t]);
      console.log('Table', t);
      console.table(res.rows);
    }catch(e){
      console.error('Error for', t, e.message);
    }
  }
  await pool.end();
}
run();
