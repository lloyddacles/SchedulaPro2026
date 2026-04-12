const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    // Create the staging queue explicitly tying requests symmetrically to schedules
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schedule_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        schedule_id INT NOT NULL,
        faculty_id INT NOT NULL,
        request_type ENUM('DROP', 'SWAP', 'CHANGE_ROOM', 'CHANGE_TIME', 'OTHER', 'MAKEUP') NOT NULL,
        reason_text TEXT NOT NULL,
        target_day VARCHAR(20) DEFAULT NULL,
        target_start_time TIME DEFAULT NULL,
        target_end_time TIME DEFAULT NULL,
        target_room VARCHAR(50) DEFAULT NULL,
        is_recurring BOOLEAN DEFAULT 1,
        event_date DATE DEFAULT NULL,
        status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
        FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Phase 8 Migration Complete: schedule_requests transaction boundaries explicitly mapped.");
  } catch (error) {
    console.error("Fatal Migration Error:", error);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
