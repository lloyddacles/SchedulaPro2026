const express = require('express');
const pool = require('../config/db');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM rooms ORDER BY type ASC, name ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  const { name, type, capacity } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO rooms (name, type, capacity) VALUES (?, ?, ?)',
      [name, type || 'Lecture', capacity || 40]
    );
    res.status(201).json({ id: result.insertId, name, type: type || 'Lecture', capacity });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Room name already in use' });
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM rooms WHERE id = ?', [req.params.id]);
    res.json({ message: 'Room removed.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
