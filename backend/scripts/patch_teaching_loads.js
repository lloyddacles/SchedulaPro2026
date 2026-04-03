import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function patch() {
  const configs = [
    { 
      name: 'Aiven (defaultdb)', 
      host: process.env.DB_HOST, 
      user: process.env.DB_USER, 
      password: process.env.DB_PASSWORD, 
      database: 'defaultdb', 
      port: process.env.DB_PORT,
      ssl: { rejectUnauthorized: false }
    }
  ];

  for (const config of configs) {
    if (!config.host) continue;
    console.log(`\n--- Patching ${config.name} ---`);
    let conn;
    try {
      conn = await mysql.createConnection(config);
      
      console.log(`Expanding status ENUM and adding missing columns to teaching_loads...`);
      
      // 1. Expand status ENUM
      await conn.query(`
        ALTER TABLE teaching_loads 
        MODIFY COLUMN status ENUM('draft', 'pending', 'pending_review', 'approved', 'archived', 'rejected') 
        DEFAULT 'draft'
      `);

      // 2. Add co-faculty columns if they don't exist
      const [columns] = await conn.query('SHOW COLUMNS FROM teaching_loads');
      const colNames = columns.map(c => c.Field);

      const addCol = async (name, definition) => {
        if (!colNames.includes(name)) {
          console.log(`Adding column ${name}...`);
          await conn.query(`ALTER TABLE teaching_loads ADD COLUMN ${name} ${definition}`);
        } else {
          console.log(`Column ${name} already exists.`);
        }
      };

      await addCol('co_faculty_id_1', 'INT DEFAULT NULL');
      await addCol('co_faculty_id_2', 'INT DEFAULT NULL');
      await addCol('co_faculty_id_3', 'INT DEFAULT NULL');
      await addCol('reviewed_by', 'INT DEFAULT NULL');
      await addCol('reviewed_at', 'TIMESTAMP NULL DEFAULT NULL');
      await addCol('review_notes', 'TEXT DEFAULT NULL');

      // 3. Add foreign keys
      console.log(`Ensuring foreign keys...`);
      const addFK = async (col, refTable) => {
        try {
          await conn.query(`ALTER TABLE teaching_loads ADD CONSTRAINT fk_tl_${col} FOREIGN KEY (${col}) REFERENCES ${refTable}(id) ON DELETE SET NULL`);
          console.log(`Added foreign key for ${col}.`);
        } catch (e) {
          console.log(`Foreign key for ${col} possibly already exists or failed: ${e.message}`);
        }
      };

      await addFK('reviewed_by', 'users');
      await addFK('co_faculty_id_1', 'faculty');
      await addFK('co_faculty_id_2', 'faculty');
      await addFK('co_faculty_id_3', 'faculty');

      // 4. Update status 'pending' to 'pending_review'
      console.log(`Migrating status values...`);
      await conn.query("UPDATE teaching_loads SET status = 'pending_review' WHERE status = 'pending'");

      console.log(`✅ ${config.name} patched successfully.`);
    } catch (err) {
      console.error(`❌ Failed to patch ${config.name}:`, err.message);
    } finally {
      if (conn) await conn.end();
    }
  }
}

patch();
