const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// Get ALL blockouts globally
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM faculty_unavailability');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Get specific faculty's blocked times
router.get('/:facultyId', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM faculty_unavailability WHERE faculty_id = ? ORDER BY FIELD(day_of_week, "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"), start_time ASC',
      [req.params.facultyId]
    );
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Insert new blocked time
router.post('/', async (req, res) => {
  const { faculty_id, day_of_week, start_time, end_time, reason } = req.body;
  
  if (start_time >= end_time) return res.status(400).json({ error: 'End time must be cleanly after start time.' });

  try {
    // Overlap math: IF old.start < new.end AND old.end > new.start => Collision!
    const [existing] = await pool.query(
      `SELECT * FROM faculty_unavailability 
       WHERE faculty_id = ? AND day_of_week = ?
       AND (start_time < ? AND end_time > ?)`,
      [faculty_id, day_of_week, end_time, start_time]
    );
    if (existing.length > 0) return res.status(400).json({ error: 'This blocked time actively physically overlaps with a pre-existing blackout window.' });

    const [result] = await pool.query(
      'INSERT INTO faculty_unavailability (faculty_id, day_of_week, start_time, end_time, reason) VALUES (?, ?, ?, ?, ?)',
      [faculty_id, day_of_week, start_time, end_time, reason || 'Unavailable']
    );
    res.status(201).json({ id: result.insertId, faculty_id, day_of_week, start_time, end_time, reason });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM faculty_unavailability WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch(e) { res.status(500).json({error: e.message}); }
});

module.exports = router;
