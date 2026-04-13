import pool from './backend/config/db.js';

async function testConnection() {
  console.log(' [DIAGNOSTIC]: Attempting raw connection to institutional database...');
  try {
    const [rows]: any = await pool.query('SELECT 1 + 1 AS result');
    console.log(' [DIAGNOSTIC]: Connection Successful! Result:', rows[0].result);
    process.exit(0);
  } catch (error: any) {
    console.error(' [DIAGNOSTIC]: !!! CONNECTION FAILED !!!');
    console.error(' Error Code:', error.code);
    console.error(' Error Message:', error.message);
    console.error(' Details:', JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

testConnection();
