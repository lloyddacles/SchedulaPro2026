const express = require('express');
const pool = require('../config/db');

const router = express.Router();

router.get('/summary', async (req, res) => {
  try {
    const { term_id } = req.query;
    const termFilter = term_id ? 'WHERE term_id = ?' : '';
    const termParams = term_id ? [term_id] : [];

    // Counters
    const [facultyCount] = await pool.query('SELECT COUNT(*) as count FROM faculty');
    const [subjectCount] = await pool.query('SELECT COUNT(*) as count FROM subjects');
    const [loadCount] = await pool.query(`SELECT COUNT(*) as count FROM teaching_loads ${termFilter}`, termParams);

    // Fetch faculty load distribution specific to the term
    const queryFacultyLoads = `
      SELECT f.id, f.full_name, f.department, f.max_teaching_hours,
             COUNT(tl.id) as subjects_count,
             COALESCE(SUM(s.required_hours), 0) as total_assigned_hours
      FROM faculty f
      LEFT JOIN teaching_loads tl ON f.id = tl.faculty_id ${term_id ? `AND tl.term_id = ?` : ''}
      LEFT JOIN subjects s ON tl.subject_id = s.id
      GROUP BY f.id
    `;
    const [facultyData] = await pool.query(queryFacultyLoads, termParams);

    // Department Stats (Global to the physical faculty database, unaffected by terms)
    const [deptStats] = await pool.query(`
      SELECT department, COUNT(*) as value 
      FROM faculty 
      WHERE department IS NOT NULL AND department != ''
      GROUP BY department
    `);
    // Unassigned Subjects Array (Critical Analytics)
    const queryUnassigned = `
      SELECT s.id, s.subject_code, s.subject_name, s.units, s.required_hours, p.code as program_code, s.year_level
      FROM subjects s
      LEFT JOIN programs p ON s.program_id = p.id
      WHERE s.id NOT IN (
        SELECT subject_id FROM teaching_loads ${term_id ? ' WHERE term_id = ?' : ''}
      )
    `;
    const [unassignedSubjects] = await pool.query(queryUnassigned, term_id ? [term_id] : []);

    // Room Utilization Array
    // Total functional hours assumed = 7am to 9pm (14 hr) * 6 days = 84 hrs total max ceiling per week.
    const queryRooms = `
      SELECT r.id, r.name, r.type, r.capacity,
             COALESCE(SUM(TIME_TO_SEC(TIMEDIFF(sch.end_time, sch.start_time))/3600), 0) as utilized_hours
      FROM rooms r
      LEFT JOIN schedules sch ON r.name = sch.room
      LEFT JOIN teaching_loads tl ON sch.teaching_load_id = tl.id ${term_id ? 'AND tl.term_id = ?' : ''}
      GROUP BY r.id
      ORDER BY utilized_hours DESC
    `;
    const [roomUtilization] = await pool.query(queryRooms, term_id ? [term_id] : []);

    res.json({
      summary: {
        total_faculty: facultyCount[0].count,
        total_subjects: subjectCount[0].count,
        total_assigned_loads: loadCount[0].count,
        total_unassigned_subjects: unassignedSubjects.length
      },
      unassigned_subjects: unassignedSubjects,
      room_utilization: roomUtilization,
      faculty_loads: facultyData,
      department_stats: deptStats
    });

  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard summary', error: error.message });
  }
});

module.exports = router;
