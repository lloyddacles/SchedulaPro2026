const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'C@RDmr11T',
  database: 'faculty_scheduling',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function check() {
  try {
    console.log('--- ALL RESET LOGS ---');
    const [logs] = await pool.query("SELECT * FROM audit_logs WHERE action = 'RESET' ORDER BY created_at DESC LIMIT 50");
    console.log(JSON.stringify(logs, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
