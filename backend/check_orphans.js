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
    console.log('--- ALL RECORDS IN SCHEDULES TABLE ---');
    const [rows] = await pool.query('SELECT * FROM schedules');
    console.log(JSON.stringify(rows, null, 2));

    console.log('--- JOIN CHECK ---');
    const [joined] = await pool.query('SELECT sch.id, tl.status FROM schedules sch LEFT JOIN teaching_loads tl ON sch.teaching_load_id = tl.id');
    console.log(JSON.stringify(joined, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
