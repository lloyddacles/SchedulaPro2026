import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'faculty_scheduling',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function migrate() {
  try {
    console.log('Adding adviser_id to sections table...');
    await pool.query(`
      ALTER TABLE sections 
      ADD COLUMN adviser_id INT DEFAULT NULL;
    `);

    console.log('Adding foreign key constraint for adviser_id...');
    await pool.query(`
      ALTER TABLE sections 
      ADD CONSTRAINT fk_sections_adviser
      FOREIGN KEY (adviser_id) REFERENCES faculty(id) ON DELETE SET NULL;
    `);

    console.log('Migration successful.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('adviser_id column already exists. Skipping.');
    } else {
      console.error('Migration failed:', err.message);
    }
  } finally {
    process.exit(0);
  }
}

migrate();
