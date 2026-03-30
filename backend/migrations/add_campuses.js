const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../config/db');

async function migrate() {
  const connection = await pool.getConnection();
  try {
    console.log('Starting migration: Add Campuses...');

    // 1. Create campuses table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS campuses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE,
        is_archived BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Table "campuses" created.');

    // 2. Seed initial campuses
    const initialCampuses = [
      ['Main Campus', 'MAIN'],
      ['Bay 2 Campus', 'BAY2'],
      ['San Pablo Campus', 'SPAB']
    ];
    for (const [name, code] of initialCampuses) {
      await connection.query(
        'INSERT IGNORE INTO campuses (name, code) VALUES (?, ?)',
        [name, code]
      );
    }
    console.log('Initial campuses seeded.');

    // 3. Add campus_id to existing tables
    const tablesToAlter = ['faculty', 'rooms', 'sections'];
    for (const table of tablesToAlter) {
      const [columns] = await connection.query(`SHOW COLUMNS FROM ${table} LIKE 'campus_id'`);
      if (columns.length === 0) {
        await connection.query(`ALTER TABLE ${table} ADD COLUMN campus_id INT DEFAULT NULL`);
        await connection.query(`ALTER TABLE ${table} ADD FOREIGN KEY (campus_id) REFERENCES campuses(id)`);
        console.log(`Added campus_id to table "${table}".`);
        
        // Set default campus (Main Campus) for existing records
        const [[mainCampus]] = await connection.query('SELECT id FROM campuses WHERE code = "MAIN"');
        if (mainCampus) {
          await connection.query(`UPDATE ${table} SET campus_id = ? WHERE campus_id IS NULL`, [mainCampus.id]);
          console.log(`Set default campus for existing records in "${table}".`);
        }
      } else {
        console.log(`Column "campus_id" already exists in table "${table}".`);
      }
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    connection.release();
    process.exit();
  }
}

migrate();
