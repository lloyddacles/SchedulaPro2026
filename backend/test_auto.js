const axios = require('axios');

async function testAuto() {
  try {
    console.log('--- TRIGGERING AUTO-SCHEDULE FOR TERM 3 ---');
    const res = await axios.post('http://localhost:5001/api/schedules/auto-schedule', {
      term_id: 3
    });
    console.log('Result:', JSON.stringify(res.data, null, 2));
    
    // Check if blocks were actually created
    const mysql = require('mysql2/promise');
    const pool = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: 'C@RDmr11T',
      database: 'faculty_scheduling'
    });
    const [counts] = await pool.query('SELECT count(*) as count FROM schedules sch JOIN teaching_loads tl ON sch.teaching_load_id = tl.id WHERE tl.term_id = 3');
    console.log('Schedules for Term 3 after Auto:', counts[0].count);
    
    process.exit(0);
  } catch (err) {
    console.error('Auto-Schedule Fail:', err.response?.data || err.message);
    process.exit(1);
  }
}
testAuto();
