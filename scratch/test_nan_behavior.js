import pool from './backend/config/db.js';

async function testNaN() {
  try {
    console.log("Testing NaN in placeholder...");
    // If this throws "Unknown column 'NaN'", then placeholders ARE the problem when given NaN
    const [rows] = await pool.query('SELECT * FROM faculty WHERE id = ?', [NaN]);
    console.log("Result for NaN placeholder:", rows);
  } catch (error) {
    console.error("Caught error with NaN placeholder:", error.message);
  } finally {
    process.exit(0);
  }
}

testNaN();
