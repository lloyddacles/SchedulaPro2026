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
      
      console.log(`Checking columns for schedule_requests...`);
      const [columns] = await conn.query('SHOW COLUMNS FROM schedule_requests');
      const colNames = columns.map(c => c.Field);

      // 1. Add schedule_id if it doesn't exist
      if (!colNames.includes('schedule_id')) {
        console.log(`Adding column schedule_id...`);
        await conn.query('DELETE FROM schedule_requests');
        await conn.query('ALTER TABLE schedule_requests ADD COLUMN schedule_id INT NOT NULL AFTER faculty_id');
        await conn.query('ALTER TABLE schedule_requests ADD CONSTRAINT fk_sr_schedule FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE');
        console.log(`✅ column schedule_id and FK added.`);
      }

      // 2. Rename reason_text to reason if needed
      if (colNames.includes('reason_text') && !colNames.includes('reason')) {
        console.log(`Renaming reason_text to reason...`);
        await conn.query('ALTER TABLE schedule_requests CHANGE COLUMN reason_text reason TEXT NOT NULL');
        console.log(`✅ column renamed to reason.`);
      }

      // 3. Drop teaching_load_id if it exists - Robust Version
      if (colNames.includes('teaching_load_id')) {
        console.log(`Attempting to drop legacy teaching_load_id column...`);
        
        // Try known constraint name from error message
        try {
           await conn.query('ALTER TABLE schedule_requests DROP FOREIGN KEY schedule_requests_ibfk_1');
           console.log('✅ Dropped schedule_requests_ibfk_1');
        } catch(e) { /* ignore */ }

        // Also try standard name we might have added before
        try {
           await conn.query('ALTER TABLE schedule_requests DROP FOREIGN KEY fk_sr_teaching_load');
           console.log('✅ Dropped fk_sr_teaching_load');
        } catch(e) { /* ignore */ }

        await conn.query('ALTER TABLE schedule_requests DROP COLUMN teaching_load_id');
        console.log(`✅ column teaching_load_id removed.`);
      }

      console.log(`✅ ${config.name} patched successfully.`);
    } catch (err) {
      console.error(`❌ Failed to patch ${config.name}:`, err.message);
    } finally {
      if (conn) await conn.end();
    }
  }
}

patch();
