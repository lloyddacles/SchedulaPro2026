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
  const { schedule_id, request_type, reason_text } = req.body;
  const faculty_id = req.user.faculty_id;

  if (!faculty_id) {
    return res.status(403).json({ message: 'Your account is not linked to a faculty profile. Please contact the administrator.' });
  }

  try {
    await pool.query(
      'INSERT INTO schedule_requests (faculty_id, schedule_id, request_type, reason) VALUES (?, ?, ?, ?)',
      [faculty_id, schedule_id, request_type, reason_text]
    );
    res.status(201).json({ message: 'Request submitted successfully.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Fatal exception registering transaction request.', error: error.message });
  }
});

router.put('/:id/:action', authorizeRoles('admin', 'program_head'), async (req: Request, res: Response) => {
  const { id, action } = req.params as { id: string, action: string };
  
  if (!['approve', 'reject'].includes(action)) return res.status(400).json({ message: 'Invalid administrative execution payload.' });

  const status = action === 'approve' ? 'APPROVED' : 'REJECTED';

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
            await connection.query(`DELETE FROM schedules WHERE id = ?`, [reqObj.schedule_id]);
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
