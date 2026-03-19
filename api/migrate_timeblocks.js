const pool = require('./config/db');

async function migrate() {
  try {
    console.log('Creating faculty_unavailability table...');
    await pool.query(`
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

    // Add indexes to vastly speed up overlap queries during schedule assignment dragging.
    await pool.query(`CREATE INDEX idx_unavailability_validation ON faculty_unavailability (faculty_id, day_of_week, start_time, end_time)`);

    console.log('Migration complete.');
    process.exit();
  } catch(e) {
    if (e.code === 'ER_DUP_KEYNAME') console.log('Indexes already attached.');
    else console.error(e);
    process.exit();
  }
}

migrate();
