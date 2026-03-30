
import pool from './config/db.js';

async function checkSchema() {
  try {
    const [rows] = await pool.query('DESCRIBE subjects');
    console.log('--- SUBJECTS SCHEMA ---');
    console.table(rows);
    
    const [rowsSec] = await pool.query('DESCRIBE sections');
    console.log('--- SECTIONS SCHEMA ---');
    console.table(rowsSec);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkSchema();
