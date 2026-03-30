import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

export async function seed() {
  console.log('Starting TOTAL database restoration and seed...');
  let connection;
  try {
    const connectionConfig = process.env.DATABASE_URL 
      ? process.env.DATABASE_URL 
      : {
          host: (process.env.DB_HOST || 'localhost').trim(),
          user: (process.env.DB_USER || 'root').trim(),
          password: (process.env.DB_PASSWORD || '').trim(),
          ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
          connectTimeout: 20000,
        };

    connection = await mysql.createConnection(connectionConfig);

    const dbName = (process.env.DB_NAME || 'faculty_scheduling').trim();
    
    // On Aiven/Cloud, don't try to create 'defaultdb', just use it.
    if (dbName !== 'defaultdb') {
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
      await connection.query(`USE \`${dbName}\``);
    }
    
    console.log(`Using database '${dbName}'. Rebuilding institutional schema...`);

    // --- 1. CORE TABLES ---
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'viewer', 'program_head', 'faculty') DEFAULT 'admin',
        faculty_id INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS campuses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE,
        is_archived BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS programs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL,
        type ENUM('College', 'SHS', 'JHS', 'Other') DEFAULT 'College',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS sections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        program_id INT NOT NULL,
        year_level INT NOT NULL,
        name VARCHAR(50) NOT NULL,
        campus_id INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        type ENUM('Lecture', 'Laboratory', 'Field') NOT NULL DEFAULT 'Lecture',
        capacity INT DEFAULT 40,
        campus_id INT DEFAULT NULL,
        notes TEXT
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS terms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT false,
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
        program_id INT DEFAULT NULL,
        campus_id INT DEFAULT NULL,
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
        room_type ENUM('Lecture', 'Laboratory', 'Field', 'Any') NOT NULL DEFAULT 'Any',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS teaching_loads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        faculty_id INT NOT NULL,
        subject_id INT NOT NULL,
        section_id INT NOT NULL DEFAULT 1,
        term_id INT NOT NULL DEFAULT 1,
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

    // --- 2. SYSTEM TABLES ---
    await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(255) NOT NULL,
        entity_id INT,
        user_name VARCHAR(255) DEFAULT 'System Admin',
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        link VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        \`key\` VARCHAR(255) PRIMARY KEY,
        \`value\` TEXT NOT NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS faculty_unavailability (
        id INT AUTO_INCREMENT PRIMARY KEY,
        faculty_id INT NOT NULL,
        day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday') NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        reason VARCHAR(255) DEFAULT 'Unavailable',
        FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS schedule_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        schedule_id INT NOT NULL,
        faculty_id INT NOT NULL,
        request_type ENUM('DROP', 'SWAP') NOT NULL,
        reason_text TEXT NOT NULL,
        status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
        FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ All 15+ institutional tables verified/created successfully.');

    // --- 3. SEEDING DEFAULTS ---
    // 1. Admin user
    const [rows] = await connection.query(`SELECT * FROM users WHERE username = 'admin'`);
    if (rows.length === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await connection.query(`INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)`, ['admin', hash, 'admin']);
      console.log('Admin user created.');
    }

    // 2. Default Term
    await connection.query('INSERT IGNORE INTO terms (id, name, is_active) VALUES (1, "1st Semester 2026", true)');

    // 3. Default Campus
    await connection.query('INSERT IGNORE INTO campuses (id, name, code) VALUES (1, "Main Campus", "MAIN")');

    // 4. Default Program
    await connection.query('INSERT IGNORE INTO programs (id, code, name) VALUES (1, "BSA", "Bachelor of Science in Accountancy")');

    // 5. Default Section
    await connection.query('INSERT IGNORE INTO sections (id, program_id, year_level, name, campus_id) VALUES (1, 1, 1, "Section 1A", 1)');

    // 6. Default Settings
    await connection.query('INSERT IGNORE INTO system_settings (\`key\`, \`value\`) VALUES ("app_name", "SchedulaPro"), ("institution_name", "Golden Minds Colleges")');

    console.log('🎉 Super-Seed completed successfully!');
    return { success: true, message: 'All tables restored and dummy data seeded!' };
  } catch (error) {
    console.error('Fatal Seeding Failure:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

const isMain = process.argv[1] && (process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1].endsWith('seed.js'));
if (isMain) {
  seed().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}
