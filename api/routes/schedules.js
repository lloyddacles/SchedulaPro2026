const express = require('express');
const pool = require('../config/db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { faculty_id, term_id } = req.query;
    let query = `
      SELECT sch.id, sch.teaching_load_id, sch.day_of_week, sch.start_time, sch.end_time, sch.room,
             tl.faculty_id, tl.subject_id, tl.term_id, tl.section_id,
             f.full_name as faculty_name,
             s.subject_code, s.subject_name,
             sec.name as section_name, sec.year_level, p.code as program_code
      FROM schedules sch
      JOIN teaching_loads tl ON sch.teaching_load_id = tl.id
      JOIN faculty f ON tl.faculty_id = f.id
      JOIN subjects s ON tl.subject_id = s.id
      JOIN sections sec ON tl.section_id = sec.id
      JOIN programs p ON sec.program_id = p.id
    `;
    const params = [];
    const conditions = [];

    if (faculty_id) { conditions.push('tl.faculty_id = ?'); params.push(faculty_id); }
    if (term_id) { conditions.push('tl.term_id = ?'); params.push(term_id); }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }
    
    query += ` ORDER BY sch.day_of_week ASC, sch.start_time ASC`;
    
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching schedules', error: error.message });
  }
});

router.post('/', async (req, res) => {
  const { teaching_load_id, day_of_week, start_time, end_time, room } = req.body;
  try {
    const [tlRows] = await pool.query('SELECT faculty_id, term_id, section_id FROM teaching_loads WHERE id = ?', [teaching_load_id]);
    if (tlRows.length === 0) return res.status(404).json({ message: 'Teaching load not found' });
    
    const { faculty_id: facultyId, term_id: termId, section_id: sectionId } = tlRows[0];

    // Conflict check explicitly protecting BOTH the faculty AND the student section from double-bookings natively.
    const queryConflicts = `
      SELECT sch.*, s.subject_code, sec.name as section_name, p.code as program_code
      FROM schedules sch
      JOIN teaching_loads tl ON sch.teaching_load_id = tl.id
      JOIN subjects s ON tl.subject_id = s.id
      JOIN sections sec ON tl.section_id = sec.id
      JOIN programs p ON sec.program_id = p.id
      WHERE (tl.faculty_id = ? OR tl.section_id = ?)
        AND tl.term_id = ?
        AND sch.day_of_week = ?
        AND sch.start_time < ? 
        AND sch.end_time > ?
    `;

    const [conflicts] = await pool.query(queryConflicts, [facultyId, sectionId, termId, day_of_week, end_time, start_time]);
    
    if (conflicts.length > 0) {
      const conflict = conflicts[0];
      const isFacultyConflict = conflict.faculty_id === facultyId;
      return res.status(400).json({ 
        message: isFacultyConflict ? 'Faculty Conflict' : 'Cohort Conflict', 
        details: isFacultyConflict 
          ? `Overlap detected with subject ${conflict.subject_code} (${conflict.start_time} - ${conflict.end_time}).`
          : `Students in ${conflict.program_code}-${conflict.section_name} already have ${conflict.subject_code} at this time.`
      });
    }

    // Explicit Blackout Check
    const queryBlockouts = `
      SELECT * FROM faculty_unavailability 
      WHERE faculty_id = ? AND day_of_week = ?
      AND (start_time < ? AND end_time > ?)
    `;
    const [blockouts] = await pool.query(queryBlockouts, [facultyId, day_of_week, end_time, start_time]);
    if (blockouts.length > 0) {
      const b = blockouts[0];
      return res.status(400).json({
        message: 'Faculty Unavailable',
        details: `Instructor explicitly blocked during this block: ${b.reason} (${b.start_time} - ${b.end_time}).`
      });
    }

    const queryRoomConflicts = `
      SELECT sch.*, s.subject_code 
      FROM schedules sch
      JOIN teaching_loads tl ON sch.teaching_load_id = tl.id
      JOIN subjects s ON tl.subject_id = s.id
      WHERE sch.room = ? 
        AND tl.term_id = ?
        AND sch.day_of_week = ?
        AND sch.start_time < ? 
        AND sch.end_time > ?
    `;
    const [roomConflicts] = await pool.query(queryRoomConflicts, [room, termId, day_of_week, end_time, start_time]);
    
    if (roomConflicts.length > 0) {
      const conflict = roomConflicts[0];
      return res.status(400).json({ 
        message: 'Room Conflict', 
        details: `Room ${room} is already booked for ${conflict.subject_code} (${conflict.start_time} - ${conflict.end_time}).`
      });
    }

    const [result] = await pool.query(
      'INSERT INTO schedules (teaching_load_id, day_of_week, start_time, end_time, room) VALUES (?, ?, ?, ?, ?)',
      [teaching_load_id, day_of_week, start_time, end_time, room]
    );

    res.status(201).json({ id: result.insertId, teaching_load_id, day_of_week, start_time, end_time, room });
  } catch (error) {
    res.status(500).json({ message: 'Error adding schedule', error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  const { day_of_week, start_time, end_time, room, teaching_load_id } = req.body;
  try {
    const [existRows] = await pool.query('SELECT teaching_load_id, room FROM schedules WHERE id = ?', [req.params.id]);
    if (existRows.length === 0) return res.status(404).json({ message: 'Schedule not found' });
    
    const targetTeachingLoadId = teaching_load_id || existRows[0].teaching_load_id;
    const targetRoom = room || existRows[0].room;

    const [tlRows] = await pool.query('SELECT faculty_id, term_id, section_id FROM teaching_loads WHERE id = ?', [targetTeachingLoadId]);
    if (tlRows.length === 0) return res.status(404).json({ message: 'Teaching load not found' });
    const { faculty_id: facultyId, term_id: termId, section_id: sectionId } = tlRows[0];

    const queryConflicts = `
      SELECT sch.*, s.subject_code, sec.name as section_name, p.code as program_code
      FROM schedules sch
      JOIN teaching_loads tl ON sch.teaching_load_id = tl.id
      JOIN subjects s ON tl.subject_id = s.id
      JOIN sections sec ON tl.section_id = sec.id
      JOIN programs p ON sec.program_id = p.id
      WHERE (tl.faculty_id = ? OR tl.section_id = ?)
        AND tl.term_id = ?
        AND sch.day_of_week = ?
        AND sch.start_time < ? 
        AND sch.end_time > ?
        AND sch.id != ?
    `;
    const [conflicts] = await pool.query(queryConflicts, [facultyId, sectionId, termId, day_of_week, end_time, start_time, req.params.id]);
    
    if (conflicts.length > 0) {
      const conflict = conflicts[0];
      const isFacultyConflict = conflict.faculty_id === facultyId;
      return res.status(400).json({ 
        message: isFacultyConflict ? 'Faculty Conflict' : 'Cohort Conflict', 
        details: isFacultyConflict 
          ? `Overlap detected with subject ${conflict.subject_code} (${conflict.start_time} - ${conflict.end_time}).`
          : `Students in ${conflict.program_code}-${conflict.section_name} already have ${conflict.subject_code} at this time.`
      });
    }

    const queryBlockouts = `
      SELECT * FROM faculty_unavailability 
      WHERE faculty_id = ? AND day_of_week = ?
      AND (start_time < ? AND end_time > ?)
    `;
    const [blockouts] = await pool.query(queryBlockouts, [facultyId, day_of_week, end_time, start_time]);
    if (blockouts.length > 0) {
      const b = blockouts[0];
      return res.status(400).json({
        message: 'Faculty Unavailable',
        details: `Instructor explicitly blocked during this block: ${b.reason} (${b.start_time} - ${b.end_time}).`
      });
    }

    const queryRoomConflicts = `
      SELECT sch.*, s.subject_code 
      FROM schedules sch
      JOIN teaching_loads tl ON sch.teaching_load_id = tl.id
      JOIN subjects s ON tl.subject_id = s.id
      WHERE sch.room = ? 
        AND tl.term_id = ?
        AND sch.day_of_week = ?
        AND sch.start_time < ? 
        AND sch.end_time > ?
        AND sch.id != ?
    `;
    const [roomConflicts] = await pool.query(queryRoomConflicts, [targetRoom, termId, day_of_week, end_time, start_time, req.params.id]);
    
    if (roomConflicts.length > 0) {
      const conflict = roomConflicts[0];
      return res.status(400).json({ 
        message: 'Room Conflict', 
        details: `Room ${targetRoom} is already booked for ${conflict.subject_code} (${conflict.start_time} - ${conflict.end_time}).`
      });
    }

    await pool.query(
      'UPDATE schedules SET teaching_load_id = ?, day_of_week = ?, start_time = ?, end_time = ?, room = ? WHERE id = ?',
      [targetTeachingLoadId, day_of_week, start_time, end_time, targetRoom, req.params.id]
    );

    res.json({ message: 'Schedule updated' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating schedule', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM schedules WHERE id = ?', [req.params.id]);
    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting schedule', error: error.message });
  }
});

module.exports = router;
