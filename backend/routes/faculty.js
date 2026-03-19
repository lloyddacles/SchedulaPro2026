const express = require('express');
const pool = require('../config/db');
const logAudit = require('../utils/auditLogger');

const router = express.Router();

// Get all faculty
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM faculty ORDER BY full_name ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching faculty', error: error.message });
  }
});

// Add new faculty
router.post('/', async (req, res) => {
  const { full_name, department, specialization, max_teaching_hours } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      'INSERT INTO faculty (full_name, department, specialization, max_teaching_hours) VALUES (?, ?, ?, ?)',
      [full_name, department, specialization, max_teaching_hours]
    );
    const facultyId = result.insertId;

    // Automatically create a viewer account
    const username = full_name.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 100);
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('faculty123', 10);
    await connection.query(
      'INSERT INTO users (username, password_hash, role, faculty_id) VALUES (?, ?, ?, ?)',
      [username, hash, 'viewer', facultyId]
    );

    await connection.commit();
    await logAudit('CREATE', 'Faculty', facultyId, { name: full_name, temp_account: username });
    res.status(201).json({ id: facultyId, full_name, department, specialization, max_teaching_hours, temp_username: username });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: 'Error adding faculty', error: error.message });
  } finally {
    connection.release();
  }
});

// Update faculty
router.put('/:id', async (req, res) => {
  const { full_name, department, specialization, max_teaching_hours } = req.body;
  try {
    await pool.query(
      'UPDATE faculty SET full_name = ?, department = ?, specialization = ?, max_teaching_hours = ? WHERE id = ?',
      [full_name, department, specialization, max_teaching_hours, req.params.id]
    );
    await logAudit('UPDATE', 'Faculty', req.params.id, { full_name, department, max_teaching_hours });
    res.json({ message: 'Faculty updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating faculty', error: error.message });
  }
});

// Delete faculty
router.delete('/:id', async (req, res) => {
  try {
    const [[fac]] = await pool.query('SELECT full_name FROM faculty WHERE id = ?', [req.params.id]);
    await pool.query('DELETE FROM faculty WHERE id = ?', [req.params.id]);
    await logAudit('DELETE', 'Faculty', req.params.id, { removed_name: fac?.full_name });
    res.json({ message: 'Faculty deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting faculty', error: error.message });
  }
});

module.exports = router;
