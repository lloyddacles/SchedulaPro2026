import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const ENUM_VALUES = "'Lecture','Computer Lab','Science Lab','Kitchen','Court','Engineering Lab','Laboratory','Field','Any'";

async function patch() {
  const configs = [
    { name: 'Local', host: 'localhost', user: 'root', password: '', database: 'faculty_scheduling', port: 3306 },
    { 
      name: 'Aiven (defaultdb)', 
      host: process.env.REMOTE_DB_HOST, 
      user: process.env.REMOTE_DB_USER, 
      password: process.env.REMOTE_DB_PASSWORD, 
      database: 'defaultdb', 
      port: process.env.REMOTE_DB_PORT,
      ssl: { rejectUnauthorized: false }
    },
    { 
      name: 'Aiven (faculty_scheduling)', 
      host: process.env.REMOTE_DB_HOST, 
      user: process.env.REMOTE_DB_USER, 
      password: process.env.REMOTE_DB_PASSWORD, 
      database: 'faculty_scheduling', 
      port: process.env.REMOTE_DB_PORT,
      ssl: { rejectUnauthorized: false }
    }
  ];

  for (const config of configs) {
    if (!config.host) continue;
    console.log(`\n--- Patching ${config.name} ---`);
    let conn;
    try {
      conn = await mysql.createConnection(config);
      
      console.log(`Updating rooms.type ENUM...`);
      await conn.query(`ALTER TABLE rooms MODIFY COLUMN type ENUM(${ENUM_VALUES}) NOT NULL DEFAULT 'Lecture'`);
      
      console.log(`Updating subjects.room_type ENUM...`);
      await conn.query(`ALTER TABLE subjects MODIFY COLUMN room_type ENUM(${ENUM_VALUES}) NOT NULL DEFAULT 'Any'`);
      
      console.log(`✅ ${config.name} patched successfully.`);
    } catch (err) {
      console.error(`❌ Failed to patch ${config.name}:`, err.message);
    } finally {
      if (conn) await conn.end();
    }
  }
}

patch();
