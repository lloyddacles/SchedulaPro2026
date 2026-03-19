const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/faculty-loads', async (req, res) => {
  try {
    const term_id = req.query.term_id;
    let query = `
      SELECT f.full_name, f.department, f.specialization,
             s.subject_code, s.subject_name, s.units, s.required_hours,
             p.code as program, sec.year_level, sec.name as section
      FROM teaching_loads tl
      JOIN faculty f ON tl.faculty_id = f.id
      JOIN subjects s ON tl.subject_id = s.id
      JOIN sections sec ON tl.section_id = sec.id
      JOIN programs p ON sec.program_id = p.id
    `;
    const params = [];
    if (term_id) {
       query += ' WHERE tl.term_id = ?';
       params.push(term_id);
    }
    
    query += ' ORDER BY f.full_name ASC';

    const [rows] = await pool.query(query, params);

    // Build CSV organically natively evading third-party memory leaks natively
    const headers = ['Faculty Name', 'Department', 'Specialization', 'Subject Code', 'Subject Name', 'Units', 'Hours', 'Program', 'YearLevel', 'Section'];
    
    const csvRows = [headers.join(',')];
    
    for (const r of rows) {
      const row = [
        `"${r.full_name}"`,
        `"${r.department}"`,
        `"${r.specialization}"`,
        `"${r.subject_code}"`,
        `"${r.subject_name}"`,
        r.units,
        r.required_hours,
        `"${r.program}"`,
        r.year_level,
        `"${r.section}"`
      ];
      csvRows.push(row.join(','));
    }

    const csvData = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=faculty-loads.csv');
    
    res.status(200).send(csvData);

  } catch (error) {
    console.error('Export Data Leak Fault:', error);
    res.status(500).json({ message: 'Failed to deploy physical CSV strings securely.' });
  }
});

module.exports = router;
