const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function test() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'faculty_scheduling'
  });

  try {
    // 1. Get a random approved teaching load
    const [tlRows] = await conn.query('SELECT id, section_id FROM teaching_loads WHERE status = "approved" LIMIT 1');
    if (tlRows.length === 0) {
      console.log('No approved teaching loads found to test with.');
      return;
    }
    const tlId = tlRows[0].id;
    const sectionId = tlRows[0].section_id;

    // 2. Get a room
    const [roomRows] = await conn.query('SELECT name, capacity FROM rooms LIMIT 1');
    const roomName = roomRows[0].name;
    const roomCapacity = roomRows[0].capacity;

    // 3. Get section count
    const [secRows] = await conn.query('SELECT student_count FROM sections WHERE id = ?', [sectionId]);
    const studentCount = secRows[0].student_count;

    console.log(`Testing TL:${tlId}, Section:${sectionId} (Seats:${studentCount}), Room:${roomName} (Cap:${roomCapacity})`);

    // we don't need to import ScheduleService if we just test the logic here
    const sCheck = studentCount > roomCapacity;
    console.log(`Initial Logic Check (studentCount > roomCapacity): ${sCheck}`);

    if (sCheck) {
      console.log('❌ Logic confirmed: Student count exceeds room capacity.');
    } else {
      console.log('✅ Logic confirmed: Student count fits in room.');
    }

  } catch (err) {
    console.error(err);
  } finally {
    await conn.end();
  }
}

test();
