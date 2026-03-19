const express = require('express');
const pool = require('../config/db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.*, p.code as program_code, p.name as program_name 
      FROM subjects s 
      LEFT JOIN programs p ON s.program_id = p.id 
      ORDER BY p.code ASC, s.year_level ASC, s.subject_code ASC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subjects', error: error.message });
  }
});

router.post('/', async (req, res) => {
  const { subject_code, subject_name, units, required_hours, program_id, year_level, room_type } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO subjects (subject_code, subject_name, units, required_hours, program_id, year_level, room_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [subject_code, subject_name, units, required_hours, program_id || null, year_level || null, room_type || 'Any']
    );
    res.status(201).json({ id: result.insertId, subject_code, subject_name, units, required_hours, program_id, year_level, room_type: room_type || 'Any' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Subject code already exists' });
    }
    res.status(500).json({ message: 'Error adding subject', error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  const { subject_code, subject_name, units, required_hours, program_id, year_level, room_type } = req.body;
  try {
    await pool.query(
      'UPDATE subjects SET subject_code = ?, subject_name = ?, units = ?, required_hours = ?, program_id = ?, year_level = ?, room_type = ? WHERE id = ?',
      [subject_code, subject_name, units, required_hours, program_id || null, year_level || null, room_type || 'Any', req.params.id]
    );
    res.json({ message: 'Subject updated successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Subject code already exists' });
    }
    res.status(500).json({ message: 'Error updating subject', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM subjects WHERE id = ?', [req.params.id]);
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting subject', error: error.message });
  }
});

module.exports = router;
