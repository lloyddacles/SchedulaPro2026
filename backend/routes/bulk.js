const express = require('express');
const pool = require('../config/db');
const router = express.Router();

router.post('/:entity', async (req, res) => {
  const { entity } = req.params;
  const dataArray = req.body;
  
  // Guard Clauses intercepting invalid mathematical objects
  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    return res.status(400).json({ message: 'Payload must be a populated JSON array.' });
  }

  // Explicit Whitelist preventing destructive arbitrary table injections
  const allowedEntities = ['faculty', 'subjects', 'rooms', 'sections', 'programs'];
  if (!allowedEntities.includes(entity)) {
     return res.status(400).json({ message: 'Target entity is outside allowed parameter scope.' });
  }

  try {
    const keys = Object.keys(dataArray[0]);
    if (keys.length === 0) return res.status(400).json({ message: 'Invalid object mapping bounds.' });

    const cols = keys.join(', ');
    // Flatten 2D array format precisely required by mysql2 'bulk insert' syntax parameters
    const values = dataArray.map(obj => keys.map(k => obj[k] !== undefined && obj[k] !== '' ? obj[k] : null));

    // Dynamic SQL string securely bounding dynamic columns using parameterized grids
    const query = `INSERT IGNORE INTO ${entity} (${cols}) VALUES ?`;
    
    // MySQL expects an array enveloping an array of rows: [[ [row1], [row2] ]]
    const [result] = await pool.query(query, [values]);

    res.status(201).json({ 
       message: 'Bulk configuration natively mapped successfully!', 
       inserted_objects: result.affectedRows,
       total_submitted: dataArray.length 
    });
  } catch (error) {
    console.error("Bulk Matrix Error:", error);
    res.status(500).json({ message: 'Fatal exception parsing mass data arrays.', error: error.message });
  }
});

module.exports = router;
