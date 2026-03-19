const express = require('express');
const pool = require('../config/db');
const { sendEmail } = require('../utils/mailer');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { term_id } = req.query;
    let query = `
      SELECT tl.*, f.full_name as faculty_name, f.department, f.max_teaching_hours,
             s.subject_code, s.subject_name, s.units, s.required_hours,
             sec.name as section_name, sec.year_level, p.code as program_code
      FROM teaching_loads tl
      JOIN faculty f ON tl.faculty_id = f.id
      JOIN subjects s ON tl.subject_id = s.id
      JOIN sections sec ON tl.section_id = sec.id
      JOIN programs p ON sec.program_id = p.id
    `;
    const params = [];
    if (term_id) {
       query += ' WHERE tl.term_id = ? ';
       params.push(term_id);
    }
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching teaching loads', error: error.message });
  }
});

router.post('/', async (req, res) => {
  const { faculty_id, subject_id, term_id, section_id } = req.body;
  const targetTermId = term_id || 1;
  const targetSectionId = section_id || 1;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [facultyRows] = await connection.query('SELECT max_teaching_hours, full_name FROM faculty WHERE id = ?', [faculty_id]);
    if (facultyRows.length === 0) return res.status(404).json({ message: 'Faculty not found' });
    const maxHours = Number(facultyRows[0].max_teaching_hours);

    const [subjectRows] = await connection.query('SELECT required_hours, subject_code FROM subjects WHERE id = ?', [subject_id]);
    if (subjectRows.length === 0) return res.status(404).json({ message: 'Subject not found' });
    const subjectHours = Number(subjectRows[0].required_hours);

    const [currentLoads] = await connection.query(`
      SELECT SUM(s.required_hours) as total_hours 
      FROM teaching_loads tl
      JOIN subjects s ON tl.subject_id = s.id
      WHERE tl.faculty_id = ? AND tl.term_id = ?
    `, [faculty_id, targetTermId]);

    const currentTotal = Number(currentLoads[0].total_hours) || 0;

    if (currentTotal + subjectHours > maxHours) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Overload Error', 
        details: `Assigning this subject exceeds the maximum teaching hours (${maxHours} hrs) for this faculty member in the selected term.` 
      });
    }

    const [result] = await connection.query(
      'INSERT INTO teaching_loads (faculty_id, subject_id, term_id, section_id) VALUES (?, ?, ?, ?)',
      [faculty_id, subject_id, targetTermId, targetSectionId]
    );

    await connection.commit();
    
    // Background SMTP Dispatch Hook
    try {
       const facName = facultyRows[0]?.full_name || 'Faculty Member';
       const subCode = subjectRows[0]?.subject_code || 'Academic Course';
       sendEmail(
          `${facName.replace(/\s+/g, '.').toLowerCase()}@university.edu`,
          `New Teaching Load Assigned: ${subCode}`,
          `
            <div style="font-family: 'Inter', sans-serif; padding: 30px; border: 1px solid #e5e7eb; border-radius: 12px; max-width: 600px; margin: 0 auto; background-color: #f8fafc;">
              <h2 style="color: #4f46e5; margin-bottom: 5px;">Schedule Configuration Updated</h2>
              <p style="color: #475569; font-size: 16px;">Hello <b>${facName}</b>,</p>
              <p style="color: #334155; font-size: 15px; line-height: 1.6;">You have explicitly been assigned to instruct <strong>${subCode}</strong> for the upcoming academic bounds.</p>
              <p style="color: #334155; font-size: 15px; line-height: 1.6;">Please log into the Faculty Scheduling Portal to visually parse your updated <i>My Schedule</i> synchronization grids.</p>
              <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;"/>
              <p style="color: #94a3b8; font-size: 12px;">This is an automated dispatch from the Academic Layout Matrix.</p>
            </div>
          `
       );
    } catch(err) { console.error("SMTP hook failed non-fatally", err); }

    res.status(201).json({ id: result.insertId, faculty_id, subject_id, term_id: targetTermId, section_id: targetSectionId });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: 'Error assigning teaching load', error: error.message });
  } finally {
    connection.release();
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM teaching_loads WHERE id = ?', [req.params.id]);
    res.json({ message: 'Teaching load deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting load', error: error.message });
  }
});

module.exports = router;
