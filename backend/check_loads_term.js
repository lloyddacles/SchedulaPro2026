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
    console.log('--- LOADS BY TERM ---');
    const [counts] = await pool.query('SELECT term_id, status, count(*) as count FROM teaching_loads GROUP BY term_id, status');
    console.log(JSON.stringify(counts, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
