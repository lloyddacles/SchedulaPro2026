const express = require('express');
const pool = require('../config/db');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM programs ORDER BY type ASC, code ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  const { code, name, type } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO programs (code, name, type) VALUES (?, ?, ?)',
      [code, name, type || 'College']
    );
    res.status(201).json({ id: result.insertId, code, name, type });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  const { code, name, type } = req.body;
  try {
    await pool.query(
      'UPDATE programs SET code = ?, name = ?, type = ? WHERE id = ?',
      [code, name, type, req.params.id]
    );
    res.json({ message: 'Program updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM programs WHERE id = ?', [req.params.id]);
    res.json({ message: 'Program deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
