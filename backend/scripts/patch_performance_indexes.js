
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function patch() {
  console.log('--- Database Patch: Performance Indexing ---');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Adding performance indexes to optimization core...');

    const queries = [
      // Indexing 'room' in schedules as it's a VARCHAR used for heavy filtering
      'CREATE INDEX idx_schedules_room ON schedules(room)',
      
      // Compound index for time-slot performance
      'CREATE INDEX idx_schedules_time ON schedules(day_of_week, start_time, end_time)',
      
      // Indexing status and term for dashboard counters
      'CREATE INDEX idx_tl_status_term ON teaching_loads(status, term_id)',
      
      // Indexing faculty_id on unavailability for conflict checks
      'CREATE INDEX idx_unavailability_faculty ON faculty_unavailability(faculty_id)',

      // Indexing archive status for global filters
      'CREATE INDEX idx_faculty_archived ON faculty(is_archived)',
      'CREATE INDEX idx_subjects_archived ON subjects(is_archived)',
      'CREATE INDEX idx_sections_archived ON sections(is_archived)',
      'CREATE INDEX idx_rooms_archived ON rooms(is_archived)'
    ];

    for (const q of queries) {
      try {
        await connection.query(q);
        console.log(`Success: ${q}`);
      } catch (e) {
        if (e.code === 'ER_DUP_KEYNAME') {
          console.log(`Info: Index already exists for query: ${q}`);
        } else {
          console.error(`Error on query [${q}]:`, e.message);
        }
      }
    }

    console.log('Indexing phase complete.');

  } catch (error) {
    console.error('Error during patch:', error);
  } finally {
    await connection.end();
    console.log('Connection closed.');
  }
}

patch();
