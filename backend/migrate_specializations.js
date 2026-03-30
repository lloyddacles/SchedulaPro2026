const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'faculty_scheduler',
  port: process.env.DB_PORT || 3306
});

async function migrate() {
  try {
    console.log('Connecting to database...');
    const connection = await pool.getConnection();

    console.log('Creating faculty_specializations table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS faculty_specializations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        faculty_id INT NOT NULL,
        subject_id INT NOT NULL,
        CONSTRAINT fk_facspec_faculty FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
        CONSTRAINT fk_facspec_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        UNIQUE KEY uq_faculty_subject (faculty_id, subject_id)
      )
    `);
    console.log('faculty_specializations created.');

    console.log('Checking teaching_loads for co_faculty columns...');
    const [columns] = await connection.query(`SHOW COLUMNS FROM teaching_loads LIKE 'co_faculty_id_1'`);
    
    if (columns.length === 0) {
      console.log('Adding co_faculty_id_1 and co_faculty_id_2 to teaching_loads...');
      await connection.query(`
        ALTER TABLE teaching_loads 
        ADD COLUMN co_faculty_id_1 INT NULL,
        ADD COLUMN co_faculty_id_2 INT NULL,
        ADD CONSTRAINT fk_tl_cofaculty1 FOREIGN KEY (co_faculty_id_1) REFERENCES faculty(id) ON DELETE SET NULL,
        ADD CONSTRAINT fk_tl_cofaculty2 FOREIGN KEY (co_faculty_id_2) REFERENCES faculty(id) ON DELETE SET NULL
      `);
      console.log('co_faculty columns added successfully.');
    } else {
      console.log('co_faculty columns already exist. Skipping ALTER TABLE.');
    }

    connection.release();
    console.log('Migrations completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
