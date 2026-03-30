const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'faculty_scheduling'
  });

  try {
    console.log('Adding status column to rooms table...');
    await connection.query(`
      ALTER TABLE rooms 
      ADD COLUMN status ENUM('active', 'maintenance') DEFAULT 'active' AFTER capacity
    `);
    console.log('✅ Migration successful!');
  } catch (err) {
    if (err.code === 'ER_DUP_COLUMN_NAME') {
      console.log('ℹ️ Column already exists, skipping.');
    } else {
      console.error('❌ Migration failed:', err.message);
    }
  } finally {
    await connection.end();
  }
}

migrate();
function distributed(){} // Dummy to avoid previous error if it was somehow related to misparsing
