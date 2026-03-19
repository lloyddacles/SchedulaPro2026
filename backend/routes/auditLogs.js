const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Retrieve paginated historical footprints exposing literal actions dynamically
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    let query = 'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const [rows] = await db.query(query, [limit, offset]);
    
    const [countResult] = await db.query('SELECT COUNT(*) as total FROM audit_logs');
    const total = countResult[0].total;

    res.json({ logs: rows, total });
  } catch (err) {
    console.error("Audit Pull Fault:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
