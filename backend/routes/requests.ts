import express, { Request, Response } from 'express';
import pool from '../config/db.js';
import { sendEmail } from '../utils/mailer.js';
import { notifyFaculty } from '../utils/notify.js';
import { authenticateToken, authorizeRoles } from '../utils/auth.js';
import { validate, scheduleRequestSchema } from '../middleware/validator.js';

const router = express.Router();

router.use(authenticateToken); // Ensure all routes are protected

router.get('/', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(`
      SELECT sr.*, f.full_name, s.day_of_week, s.start_time, s.end_time, s.room, sub.subject_code
      FROM schedule_requests sr
      JOIN faculty f ON sr.faculty_id = f.id
      JOIN schedules s ON sr.schedule_id = s.id
      JOIN teaching_loads tl ON s.teaching_load_id = tl.id
      JOIN subjects sub ON tl.subject_id = sub.id
      ORDER BY sr.created_at DESC
    `);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', validate(scheduleRequestSchema), async (req: any, res: Response) => {
  const { 
    schedule_id, 
    request_type, 
    reason_text, 
    target_day, 
    target_start_time, 
    target_end_time, 
    target_room, 
    is_recurring, 
    event_date 
  } = req.body;
  const faculty_id = req.user.faculty_id;

  if (!faculty_id) {
    return res.status(403).json({ message: 'Your account is not linked to a faculty profile. Please contact the administrator.' });
  }

  try {
    const query = `
      INSERT INTO schedule_requests (
        faculty_id, schedule_id, request_type, reason, 
        target_day, target_start_time, target_end_time, target_room, 
        is_recurring, event_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      faculty_id, schedule_id, request_type, reason_text,
      target_day || null, target_start_time || null, target_end_time || null, target_room || null,
      is_recurring === undefined ? true : is_recurring, event_date || null
    ];
    
    await pool.query(query, params);
    res.status(201).json({ message: 'Recovery matrix request submitted for endorsement.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Fatal exception registering transaction request.', error: error.message });
  }
});

router.put('/:id/:action', authorizeRoles('admin', 'program_head', 'program_assistant'), async (req: any, res: Response) => {
  const { id, action } = req.params as { id: string, action: string };
  
  if (!['approve', 'reject', 'endorse'].includes(action)) {
    return res.status(400).json({ message: 'Invalid administrative execution payload.' });
  }

  // Role validation for 'approve' (only admin/head)
  if (action === 'approve' && req.user.role === 'program_assistant') {
    return res.status(403).json({ message: 'Access denied: Program Assistants can only endorse, not approve.' });
  }

  // Role validation for 'endorse' (assistant or above)
  const statusMap: Record<string, string> = {
    approve: 'APPROVED',
    reject: 'REJECTED',
    endorse: 'ENDORSED'
  };
  const status = statusMap[action];

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(`UPDATE schedule_requests SET status = ? WHERE id = ?`, [status, id]);

    let targetSubject = "Unknown Class";
    let targetFaculty = "Faculty";
    
    if (status === 'APPROVED' || status === 'REJECTED') {
      const [requests]: [any[], any] = await connection.query(`
        SELECT sr.schedule_id, sr.request_type, sr.faculty_id, f.full_name, sub.subject_code 
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
            if (reqObj.request_type === 'MAKEUP') {
               // Execute the recommended slot insertion
               const [srDetails]: [any[], any] = await connection.query(`
                 SELECT target_day, target_start_time, target_end_time, target_room, is_recurring, event_date, schedule_id 
                 FROM schedule_requests WHERE id = ?`, [id]);
               
               if (srDetails.length > 0) {
                  const det = srDetails[0];
                  // Get teaching_load_id from the original schedule
                  const [origSch]: [any[], any] = await connection.query(`SELECT teaching_load_id FROM schedules WHERE id = ?`, [det.schedule_id]);
                  if (origSch.length > 0) {
                     await connection.query(
                        'INSERT INTO schedules (teaching_load_id, day_of_week, start_time, end_time, room, is_makeup, event_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [origSch[0].teaching_load_id, det.target_day, det.target_start_time, det.target_end_time, det.target_room, 1, det.event_date]
                     );
                  }
               }
            } else {
               // Standard DROP logic
               await connection.query(`DELETE FROM schedules WHERE id = ?`, [reqObj.schedule_id]);
            }
         }
                  try {
             // System Notification
             await notifyFaculty(
                requests[0].faculty_id, 
                `Schedule Request ${status}`, 
                `Your request to ${requests[0].request_type} ${targetSubject} has been ${status.toLowerCase()}.`,
                status === 'APPROVED' ? 'success' : 'error',
                status === 'APPROVED' ? '/my-schedule' : '/requests'
             );

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
          } catch(e) { console.error("Notification Hook fail:", e); }
      }
    }

    await connection.commit();
    res.json({ message: `Transaction logically finalized: Status mapped to ${status}` });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ message: 'Fatal exception processing request configuration boundaries.', error: error.message });
  } finally {
    connection.release();
  }
});

export default router;
