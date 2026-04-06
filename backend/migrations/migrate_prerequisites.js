import pool from '../config/db.js';

async function run() {
  try {
    console.log('Creating subject_prerequisites table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subject_prerequisites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subject_id INT NOT NULL,
        prerequisite_id INT NOT NULL,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (prerequisite_id) REFERENCES subjects(id) ON DELETE CASCADE,
        UNIQUE KEY uq_subject_prereq (subject_id, prerequisite_id)
      )
    `);
    console.log('subject_prerequisites table created successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}
run();
