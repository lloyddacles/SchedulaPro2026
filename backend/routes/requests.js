const express = require('express');
const pool = require('../config/db');
const { sendEmail } = require('../utils/mailer');
const router = express.Router();

// [GET] Master fetch isolating administrative polling or specific faculty tickets
router.get('/', async (req, res) => {
  const { faculty_id } = req.query;
  try {
    let query = `
      SELECT sr.*, f.full_name as faculty_name, s.day_of_week, s.start_time, s.end_time, 
             s.room, sub.subject_code, tl.section_id
      FROM schedule_requests sr
      JOIN faculty f ON sr.faculty_id = f.id
      JOIN schedules s ON sr.schedule_id = s.id
      JOIN teaching_loads tl ON s.teaching_load_id = tl.id
      JOIN subjects sub ON tl.subject_id = sub.id
    `;
    let params = [];
    
    // Bound the result explicitly if faculty_id is passed implicitly via portal
    if (faculty_id) {
      query += ` WHERE sr.faculty_id = ? `;
      params.push(faculty_id);
    }
    
    query += ` ORDER BY sr.status = 'PENDING' DESC, sr.created_at DESC`;

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Fatal exception capturing staging requests', error: error.message });
  }
});

// [POST] Faculty-initiated submission directly mapping interaction strings 
router.post('/', async (req, res) => {
  const { schedule_id, faculty_id, request_type, reason_text } = req.body;
  
  if (!schedule_id || !faculty_id || !request_type || !reason_text) {
    return res.status(400).json({ message: 'Incomplete API structures requested.' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO schedule_requests (schedule_id, faculty_id, request_type, reason_text) VALUES (?, ?, ?, ?)`,
      [schedule_id, faculty_id, request_type, reason_text]
    );
    res.status(201).json({ message: 'Request rigorously mapped into staging queues.', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Fatal exception registering transaction request.', error: error.message });
  }
});

// [PUT] Administrator approval mapping structurally finalizing the queues
router.put('/:id/:action', async (req, res) => {
  const { id, action } = req.params; // action mapping = 'approve' | 'reject'
  
  if (!['approve', 'reject'].includes(action)) return res.status(400).json({ message: 'Invalid administrative execution payload.' });

  const status = action === 'approve' ? 'APPROVED' : 'REJECTED';

  try {
    // Explicit Transaction Block
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. Physically bind the new status flag over the queue array
      await connection.query(`UPDATE schedule_requests SET status = ? WHERE id = ?`, [status, id]);

          // 2. Resolve structural dependencies mathematically
      let targetSubject = "Unknown Class";
      let targetFaculty = "Faculty";
      
      if (status === 'APPROVED' || status === 'REJECTED') {
        const [requests] = await connection.query(`
          SELECT sr.schedule_id, sr.request_type, f.full_name, sub.subject_code 
          FROM schedule_requests sr 
          JOIN faculty f ON sr.faculty_id = f.id
          JOIN schedules s ON sr.schedule_id = s.id
          JOIN teaching_loads tl ON s.teaching_load_id = tl.id
          JOIN subjects sub ON tl.subject_id = sub.id
          WHERE sr.id = ?`, [id]);
          
        if (requests.length > 0) {
           const reqObj = requests[0];
           targetSubject = reqObj.subject_code;
           targetFaculty = reqObj.full_name;
           
           if (status === 'APPROVED') {
              await connection.query(`DELETE FROM schedules WHERE id = ?`, [reqObj.schedule_id]);
           }
           
           // Background Email Dispatch
           try {
              const statusColor = status === 'APPROVED' ? '#10b981' : '#f43f5e';
              sendEmail(
                 `${targetFaculty.replace(/\s+/g, '.').toLowerCase()}@university.edu`,
                 `Swap Request ${status}: ${targetSubject}`,
                 `
                   <div style="font-family: 'Inter', sans-serif; padding: 30px; border: 1px solid #e5e7eb; border-radius: 12px; max-width: 600px; margin: 0 auto; background-color: #f8fafc;">
                     <h2 style="color: ${statusColor}; margin-bottom: 5px;">Request Officially ${status}</h2>
                     <p style="color: #475569; font-size: 16px;">Hello <b>${targetFaculty}</b>,</p>
                     <p style="color: #334155; font-size: 15px; line-height: 1.6;">Your official mapping request to natively ${reqObj.request_type} <strong>${targetSubject}</strong> has been strictly reviewed by the Administration.</p>
                     <p style="color: #334155; font-size: 15px; line-height: 1.6;">The current status of this transaction bounds is natively locked as: <b style="color: ${statusColor};">${status}</b>.</p>
                     <p style="color: #334155; font-size: 15px; line-height: 1.6;">${status === 'APPROVED' ? 'The UI schedule has visually successfully executed the drop transaction dynamically.' : 'The payload was logically denied. Your schedule constraints remain actively bound.'}</p>
                     <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;"/>
                     <p style="color: #94a3b8; font-size: 12px;">This is an automated dispatch from the Academic Layout Matrix.</p>
                   </div>
                 `
              );
           } catch(e) { console.error("SMTP Hook fail:", e); }
        }
      }

      await connection.commit();
      res.json({ message: `Transaction logically finalized: Status mapped to ${status}` });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ message: 'Fatal exception processing request configuration boundaries.', error: error.message });
  }
});

module.exports = router;
