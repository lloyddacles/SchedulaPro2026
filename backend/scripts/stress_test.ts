
import pool from '../config/db.js';
import { ScheduleService } from '../services/ScheduleService.js';
import dotenv from 'dotenv';

dotenv.config();

async function runStressTest() {
  console.log('🚀 Starting Final Stress Test...');
  
  const connection = await pool.getConnection();
  try {
    // 1. Get an active term and campus
    const [terms]: [any[], any] = await connection.query('SELECT id FROM terms WHERE is_active = 1 LIMIT 1');
    const [campuses]: [any[], any] = await connection.query('SELECT id FROM campuses LIMIT 1');
    
    if (terms.length === 0 || campuses.length === 0) {
      console.error('❌ Error: No active terms or campuses found to test with.');
      return;
    }
    
    const termId = terms[0].id;
    const campusId = campuses[0].id;
    
    // 2. Clear existing schedules for this term to have a clean slate
    console.log(`🧹 Clearing existing schedules for Term ${termId}...`);
    await connection.query('DELETE sch FROM schedules sch JOIN teaching_loads tl ON sch.teaching_load_id = tl.id WHERE tl.term_id = ?', [termId]);
    
    // 3. Ensure we have enough "approved" teaching loads (500+)
    const [loadCount]: [any[], any] = await connection.query('SELECT COUNT(*) as count FROM teaching_loads WHERE term_id = ? AND status = "approved"', [termId]);
    console.log(`📊 Current Approved Loads: ${loadCount[0].count}`);
    
    if (loadCount[0].count < 500) {
      console.log(`🌱 Seeding ${500 - loadCount[0].count} more approved loads for stress testing...`);
      const [subs]: [any[], any] = await connection.query('SELECT id FROM subjects LIMIT 50');
      const [facs]: [any[], any] = await connection.query('SELECT id FROM faculty LIMIT 50');
      const [secs]: [any[], any] = await connection.query('SELECT id FROM sections LIMIT 50');
      
      console.log(`📊 Found ${subs.length} subjects, ${facs.length} faculty, ${secs.length} sections for seeding.`);

      if (subs.length > 0 && facs.length > 0 && secs.length > 0) {
        for (let i = 0; i < (500 - loadCount[0].count); i++) {
          const sId = subs[i % subs.length].id;
          const fId = facs[i % facs.length].id;
          const secId = secs[i % secs.length].id;
          await connection.query(
            'INSERT INTO teaching_loads (faculty_id, subject_id, section_id, term_id, status) VALUES (?, ?, ?, ?, "approved")',
            [fId, sId, secId, termId]
          );
        }
        console.log(`✅ Successfully seeded loads.`);
      } else {
        console.warn('⚠️ Seeding skipped due to missing subjects, faculty, or sections.');
      }
    }
    
    // 4. Run Auto-Generation (Institution-Wide)
    console.log(`⚙️ Running Auto-Scheduler [Institution-Wide] with ConflictManager Optimization...`);
    const start = Date.now();
    const result = await ScheduleService.autoGenerate(connection, termId);
    const end = Date.now();
    
    console.log('✅ Stress Test Results:');
    console.log(`   - Total Loads Processed: ${result.scheduled + result.failed}`);
    console.log(`   - Successfully Scheduled: ${result.scheduled}`);
    console.log(`   - Failed: ${result.failed}`);
    console.log(`   - Time Elapsed: ${(end - start) / 1000}s`);
    
    if (result.scheduled > 0) {
      console.log('📝 Saving generated schedules...');
      const values = result.newlyMapped.map(m => [
        m.teaching_load_id, m.day_of_week, m.start_time, m.end_time, m.room
      ]);
      await connection.query(
        'INSERT INTO schedules (teaching_load_id, day_of_week, start_time, end_time, room) VALUES ?',
        [values]
      );
    }
    
    console.log('✨ All operations completed successfully.');
  } catch (err) {
    console.error('❌ Stress Test Failed:', err);
  } finally {
    connection.release();
    process.exit(0);
  }
}

runStressTest();
