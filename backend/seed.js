import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

export async function seed() {
  console.log('Starting TOTAL database restoration and seed...');
  let connection;
  try {
    const rawHost = (process.env.DB_HOST || 'localhost').trim();
    const hostParts = rawHost.split(':');

    const connectionConfig = process.env.DATABASE_URL 
      ? process.env.DATABASE_URL 
      : {
          host: hostParts[0],
          port: hostParts[1] ? Number(hostParts[1]) : Number(process.env.DB_PORT || 3306),
          user: (process.env.DB_USER || 'root').trim(),
          password: (process.env.DB_PASSWORD || '').trim(),
          ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
          connectTimeout: 20000,
        };

    connection = await mysql.createConnection(connectionConfig);

    const dbName = (process.env.DB_NAME || 'faculty_scheduling').trim();
    
    // Always select the database
    if (dbName !== 'defaultdb') {
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    }
    await connection.query(`USE \`${dbName}\``);
    
    console.log(`Using database '${dbName}'. Rebuilding institutional schema...`);

    // --- 0. CLEAN SLATE (Ensures schema sync) ---
    console.log('🧹 Clearing old table structures...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    const tablesToDrop = [
      'faculty_specializations', 'schedule_requests', 'schedules', 'teaching_loads', 
      'faculty_unavailability', 'notifications', 'audit_logs', 'sections', 'faculty', 
      'rooms', 'subjects', 'programs', 'campuses', 'users', 'system_settings', 'terms'
    ];
    for (const table of tablesToDrop) {
      await connection.query(`DROP TABLE IF EXISTS \`${table}\``);
    }

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
        is_archived BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        employment_type VARCHAR(50) DEFAULT 'Regular',
        max_teaching_hours INT NOT NULL DEFAULT 24,
        is_archived BOOLEAN DEFAULT FALSE,
        program_id INT NOT NULL DEFAULT 1,
        campus_id INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
        FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE SET NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subject_code VARCHAR(100) UNIQUE NOT NULL,
        subject_name VARCHAR(255) NOT NULL,
        units INT NOT NULL,
        required_hours INT NOT NULL,
        year_level INT DEFAULT NULL,
        room_type ENUM('Lecture', 'Laboratory', 'Field', 'Any') NOT NULL DEFAULT 'Any',
        is_archived BOOLEAN DEFAULT FALSE,
        program_id INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS sections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        program_id INT NOT NULL,
        year_level INT NOT NULL,
        name VARCHAR(50) NOT NULL,
        adviser_id INT DEFAULT NULL,
        is_archived BOOLEAN DEFAULT FALSE,
        campus_id INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
        FOREIGN KEY (adviser_id) REFERENCES faculty(id) ON DELETE SET NULL,
        FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE SET NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        type ENUM('Lecture', 'Laboratory') NOT NULL DEFAULT 'Lecture',
        capacity INT DEFAULT 40,
        campus_id INT DEFAULT NULL,
        is_archived BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE SET NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS teaching_loads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        faculty_id INT NOT NULL,
        subject_id INT NOT NULL,
        term_id INT NOT NULL,
        section_id INT NOT NULL,
        status ENUM('draft', 'pending', 'approved', 'archived', 'rejected') DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE,
        FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
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

    await connection.query(`
      CREATE TABLE IF NOT EXISTS faculty_specializations (
        faculty_id INT NOT NULL,
        subject_id INT NOT NULL,
        PRIMARY KEY (faculty_id, subject_id),
        FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
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
        teaching_load_id INT NOT NULL,
        faculty_id INT NOT NULL,
        request_type ENUM('DROP', 'SWAP') NOT NULL,
        reason_text TEXT NOT NULL,
        status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teaching_load_id) REFERENCES teaching_loads(id) ON DELETE CASCADE,
        FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ All institutional tables synchronized and verified.');

    // --- 3. SEEDING DEFAULTS ---
    console.log('🌱 Adding bootstrap records...');
    const [rows] = await connection.query(`SELECT * FROM users WHERE username = 'admin'`);
    if (rows.length === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await connection.query(`INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)`, ['admin', hash, 'admin']);
    }

    await connection.query('INSERT IGNORE INTO terms (id, name, is_active) VALUES (1, \'1st Semester 2026\', true)');
    await connection.query('INSERT IGNORE INTO campuses (id, name, code) VALUES (1, \'Main Campus\', \'MAIN\')');
    await connection.query('INSERT IGNORE INTO programs (id, code, name) VALUES (1, \'BSA\', \'Bachelor of Science in Accountancy\')');
    await connection.query('INSERT IGNORE INTO system_settings (`key`, `value`) VALUES (\'app_name\', \'SchedulaPro\'), (\'institution_name\', \'Golden Minds Colleges\')');

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
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
