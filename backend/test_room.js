const pool = require('./config/db');

async function test() {
  try {
    const [result] = await pool.query(
      'INSERT INTO rooms (name, type, capacity) VALUES (?, ?, ?)',
      ['Test Venue', 'Lecture', 50]
    );
    console.log('Success:', result);
  } catch (error) {
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
  }
  process.exit();
}

test();
