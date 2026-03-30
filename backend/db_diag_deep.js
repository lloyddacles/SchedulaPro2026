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
    console.log('--- ALL SCHEDULES ---');
    const [allSch] = await pool.query(`
      SELECT sch.id, sch.teaching_load_id, sch.room, sch.day_of_week, 
             tl.term_id, tl.status as load_status,
             rm.campus_id as room_campus_id, rm.id as room_id
      FROM schedules sch
      LEFT JOIN teaching_loads tl ON sch.teaching_load_id = tl.id
      LEFT JOIN rooms rm ON sch.room = rm.name
    `);
    console.log(JSON.stringify(allSch, null, 2));

    console.log('--- ALL ROOMS ---');
    const [allRooms] = await pool.query('SELECT name, campus_id FROM rooms');
    console.log(JSON.stringify(allRooms, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
