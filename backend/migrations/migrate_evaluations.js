import pool from '../config/db.js';

async function run() {
  try {
    console.log('Creating load_evaluations table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS load_evaluations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        teaching_load_id INT NOT NULL,
        evaluator_id INT NOT NULL,
        rating ENUM('Excellent', 'Satisfactory', 'Needs Improvement') NOT NULL,
        notes TEXT,
        evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teaching_load_id) REFERENCES teaching_loads(id) ON DELETE CASCADE,
        UNIQUE KEY uq_tl_eval (teaching_load_id)
      )
    `);
    console.log('load_evaluations table created successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}
run();
