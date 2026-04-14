import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function patch() {
  const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'defaultdb',
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
  };

  if (!config.host) {
    console.error('❌ DB_HOST not found in .env');
    process.exit(1);
  }

  console.log(`\n--- Patching system_settings table ---`);
  let conn;
  try {
    conn = await mysql.createConnection(config);
    
    console.log(`Altering system_settings.value to LONGTEXT...`);
    await conn.query('ALTER TABLE system_settings MODIFY COLUMN value LONGTEXT NOT NULL');
    console.log(`✅ Table updated successfully.`);

  } catch (err) {
    console.error(`❌ Failed to patch system_settings:`, err.message);
  } finally {
    if (conn) await conn.end();
  }
}

patch();
