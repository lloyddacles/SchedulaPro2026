import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function patch() {
  console.log('--- Database Patch: Hierarchical Departments ---');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Creating departments table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        is_archived BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Success: departments table initialized.');

    console.log('Altering programs table to establish constraints...');
    
    // Check if column exists before altering to prevent patch crashing on re-run
    const [cols] = await connection.query("SHOW COLUMNS FROM programs LIKE 'department_id'");
    
    if (cols.length === 0) {
       await connection.query('ALTER TABLE programs ADD COLUMN department_id INT DEFAULT NULL');
       await connection.query('ALTER TABLE programs ADD CONSTRAINT fk_program_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL');
       console.log('Success: programs table perfectly linked against departments.');
    } else {
       console.log('Info: department_id already exists in programs. Skipping alteration.');
    }
    
    console.log('Patch complete.');

  } catch (error) {
    console.error('Error during patch:', error);
  } finally {
    await connection.end();
    console.log('Connection closed.');
  }
}

patch();
