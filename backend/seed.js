import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

async function seed() {
  console.log('Starting database setup and seed...');
  let connection;
  try {
    // Connect without database first to create it if it doesn't exist
    const connectionConfig = process.env.DATABASE_URL 
      ? process.env.DATABASE_URL 
      : {
          host: process.env.DB_HOST || 'localhost',
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
          ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
        };

    connection = await mysql.createConnection(connectionConfig);

    const dbName = process.env.DB_NAME || 'faculty_scheduling';
    
    // On Aiven/Cloud, don't try to create 'defaultdb', just use it.
    if (dbName !== 'defaultdb') {
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    }
    
    await connection.query(`USE \`${dbName}\``);
    console.log(`Using database '${dbName}'.`);

    // Create Tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'viewer') DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS faculty (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        department VARCHAR(255) NOT NULL,
        specialization VARCHAR(255),
        max_teaching_hours INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subject_code VARCHAR(100) UNIQUE NOT NULL,
        subject_name VARCHAR(255) NOT NULL,
        units INT NOT NULL,
        required_hours INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS teaching_loads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        faculty_id INT NOT NULL,
        subject_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        teaching_load_id INT NOT NULL,
        day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday') NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        room VARCHAR(255) NOT NULL,
        FOREIGN KEY (teaching_load_id) REFERENCES teaching_loads(id) ON DELETE CASCADE
      )
    `);

    console.log('Tables created successfully.');

    // Seed dummy data
    // 1. Admin user
    const [rows] = await connection.query(`SELECT * FROM users WHERE username = 'admin'`);
    if (rows.length === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await connection.query(`INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)`, ['admin', hash, 'admin']);
      console.log('Admin user created (username: admin, password: admin123).');
    }

    // 2. Faculty
    const [facultyRows] = await connection.query(`SELECT COUNT(*) as count FROM faculty`);
    if (facultyRows[0].count === 0) {
      await connection.query(`
        INSERT INTO faculty (full_name, department, specialization, max_teaching_hours) VALUES 
        ('Dr. Alan Turing', 'Computer Science', 'Artificial Intelligence', 20),
        ('Dr. Grace Hopper', 'Computer Science', 'Software Engineering', 18),
        ('Dr. Ada Lovelace', 'Mathematics', 'Discrete Math', 15)
      `);
      console.log('Dummy faculty inserted.');
    }

    // 3. Subjects
    const [subjectsRows] = await connection.query(`SELECT COUNT(*) as count FROM subjects`);
    if (subjectsRows[0].count === 0) {
      await connection.query(`
        INSERT INTO subjects (subject_code, subject_name, units, required_hours) VALUES 
        ('CS101', 'Introduction to Programming', 3, 4),
        ('CS102', 'Data Structures and Algorithms', 4, 5),
        ('MATH201', 'Discrete Mathematics', 3, 3)
      `);
      console.log('Dummy subjects inserted.');
    }

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seed();
