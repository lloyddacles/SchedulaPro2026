const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// Get all terms
router.get('/', async (req, res) => {
  try {
    // Return all terms. The UI needs to know which one is active globally,
    // though the UI will actually maintain the "selected" term internally per user session.
    const [rows] = await pool.query('SELECT * FROM terms ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new term
router.post('/', async (req, res) => {
  const { name, is_active } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    if (is_active) {
      await connection.query('UPDATE terms SET is_active = false');
    }
    const [result] = await connection.query('INSERT INTO terms (name, is_active) VALUES (?, ?)', [name, is_active || false]);
    await connection.commit();
    res.status(201).json({ id: result.insertId, name, is_active });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Set global active term (optional helper)
router.put('/:id/activate', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('UPDATE terms SET is_active = false');
    await connection.query('UPDATE terms SET is_active = true WHERE id = ?', [req.params.id]);
    await connection.commit();
    res.json({ message: 'Term activated' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
