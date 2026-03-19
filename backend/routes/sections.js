const express = require('express');
const pool = require('../config/db');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT sec.*, p.code as program_code, p.name as program_name, p.type as program_type 
      FROM sections sec
      JOIN programs p ON sec.program_id = p.id
      ORDER BY p.code ASC, sec.year_level ASC, sec.name ASC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  const { program_id, year_level, name } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO sections (program_id, year_level, name) VALUES (?, ?, ?)',
      [program_id, year_level, name]
    );
    res.status(201).json({ id: result.insertId, program_id, year_level, name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM sections WHERE id = ?', [req.params.id]);
    res.json({ message: 'Section deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
