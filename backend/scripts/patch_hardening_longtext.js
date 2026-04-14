import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function patch() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL || {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
  });

  try {
    console.log('--- Hardening Database Columns ---');

    console.log('[1/2] Expanding audit_logs.details to LONGTEXT...');
    await connection.query('ALTER TABLE audit_logs MODIFY COLUMN details LONGTEXT;');

    console.log('[2/2] Expanding load_evaluations.notes to LONGTEXT...');
    try {
        await connection.query('ALTER TABLE load_evaluations MODIFY COLUMN notes LONGTEXT;');
    } catch (e) {
        if (e.code === 'ER_NO_SUCH_TABLE') {
            console.log('Skipping load_evaluations (table does not exist yet).');
        } else {
            throw e;
        }
    }

    console.log('✅ Database hardening complete.');
  } catch (error) {
    console.error('❌ Patch failed:', error);
  } finally {
    await connection.end();
    process.exit();
  }
}

patch();
