
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function patch() {
  console.log('--- Database Patch: Adding student_count to sections ---');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // 1. Check if column exists
    const [columns] = await connection.query("SHOW COLUMNS FROM sections LIKE 'student_count'");
    
    if (columns.length === 0) {
      console.log('Adding student_count column to sections table...');
      await connection.query('ALTER TABLE sections ADD COLUMN student_count INT DEFAULT 30 AFTER name');
      console.log('Success: student_count added.');
    } else {
      console.log('Info: student_count column already exists.');
    }

    // 2. Update existing nulls to 30
    await connection.query('UPDATE sections SET student_count = 30 WHERE student_count IS NULL');
    console.log('Success: Updated existing sections to default 30 students.');

  } catch (error) {
    console.error('Error during patch:', error);
  } finally {
    await connection.end();
    console.log('Connection closed.');
  }
}

patch();
