const db = require('./config/db');

async function migrate() {
  try {
    await db.query(`
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
    console.log("✅ Audit Logs table created successfully");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    process.exit();
  }
}

migrate();
