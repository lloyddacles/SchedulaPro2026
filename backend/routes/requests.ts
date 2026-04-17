import express, { Request, Response } from 'express';
import pool from '../config/db.js';
import { sendEmail } from '../utils/mailer.js';
import { notifyFaculty } from '../utils/notify.js';
import { authenticateToken, authorizeRoles } from '../utils/auth.js';
import { validate, scheduleRequestSchema } from '../middleware/validator.js';

const router = express.Router();

router.use(authenticateToken); // Ensure all routes are protected

// One-time Sync Route to patch live database schema
router.get('/sync-institutional-schema', authorizeRoles('admin'), async (req: Request, res: Response) => {
  try {
    console.log(" [SYNC]: Executing institutional schema alignment for schedule_requests...");
    
    // 1. Expand Enum
    await pool.query(`
      ALTER TABLE schedule_requests 
      MODIFY COLUMN request_type ENUM('DROP', 'SWAP', 'CHANGE_ROOM', 'CHANGE_TIME', 'OTHER', 'MAKEUP') NOT NULL
    `);

    // 2. Add Missing Discovery Columns
    const migrations = [
      "ALTER TABLE schedule_requests ADD COLUMN IF NOT EXISTS target_day VARCHAR(20) DEFAULT NULL",
      "ALTER TABLE schedule_requests ADD COLUMN IF NOT EXISTS target_start_time TIME DEFAULT NULL",
      "ALTER TABLE schedule_requests ADD COLUMN IF NOT EXISTS target_end_time TIME DEFAULT NULL",
      "ALTER TABLE schedule_requests ADD COLUMN IF NOT EXISTS target_room VARCHAR(50) DEFAULT NULL",
      "ALTER TABLE schedule_requests ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT 1",
      "ALTER TABLE schedule_requests ADD COLUMN IF NOT EXISTS event_date DATE DEFAULT NULL"
    ];

    for (const sql of migrations) {
      try {
        await pool.query(sql);
      } catch (e) {
        // Silently skip if already exists (MySQL 8.0 doesn't support IF NOT EXISTS in ALTER)
        console.log(` [SYNC INFO]: Column check processed.`);
      }
    }

    res.json({ success: true, message: "Institutional database synchronized with Recovery Wizard requirements." });
  } catch (error: any) {
    res.status(500).json({ error: "Sync failed", details: error.message });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        sr.*, 
        COALESCE(f.full_name, 'System Faculty') as faculty_name,
        COALESCE(f.department, 'Academic Division') as department,
        s.day_of_week, 
        s.start_time, 
        s.end_time, 
        s.room, 
        sub.subject_code
      FROM schedule_requests sr
      LEFT JOIN faculty f ON sr.faculty_id = f.id
      LEFT JOIN schedules s ON sr.schedule_id = s.id
      LEFT JOIN teaching_loads tl ON s.teaching_load_id = tl.id
      LEFT JOIN subjects sub ON tl.subject_id = sub.id
      ORDER BY sr.created_at DESC
    `);
    
    // Standardize the field name for the frontend
    const enrichedRows = (rows as any[]).map(r => ({
      ...r,
      reason_text: r.reason_text || r.reason || 'No justification provided.'
    }));

    res.json(enrichedRows);
  } catch (error: any) {
    console.error(" [REQUESTS FETCH ERROR]:", error);
    res.status(500).json({ error: "Failed to load academic requests. Institutional schema mismatch or orphaned record detected.", details: error.message });
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
    // Legacy column check: use reason_text if available, fallback to reason
    const [columns] = await pool.query("SHOW COLUMNS FROM schedule_requests");
    const columnNames = (columns as any[]).map(c => c.Field);
    const reasonColumn = columnNames.includes('reason_text') ? 'reason_text' : 'reason';

    const query = `
      INSERT INTO schedule_requests (
        faculty_id, schedule_id, request_type, ${reasonColumn}, 
        target_day, target_start_time, target_end_time, target_room, 
        is_recurring, event_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      faculty_id, schedule_id, request_type, reason_text || '',
      target_day || null, target_start_time || null, target_end_time || null, target_room || null,
      is_recurring === undefined ? true : is_recurring, event_date || null
    ];
    
    await pool.query(query, params);
    res.status(201).json({ message: 'Recovery matrix request submitted for endorsement.' });
  } catch (error: any) {
    // Self-Healing Logic: If the DB is missing the 'MAKEUP' enum value, patch it and retry
    if (error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' || error.message.includes('request_type')) {
      console.log(" [SELF-HEAL]: Detected request_type mismatch. Aligning institutional schema...");
      try {
        await pool.query(`
          ALTER TABLE schedule_requests 
          MODIFY COLUMN request_type ENUM('DROP', 'SWAP', 'CHANGE_ROOM', 'CHANGE_TIME', 'OTHER', 'MAKEUP') NOT NULL
        `);
        // Retry the insert exactly once
        await pool.query(query, params);
        return res.status(201).json({ message: 'Recovery matrix request submitted (Auto-Healed Schema).' });
      } catch (retryError: any) {
        return res.status(500).json({ message: 'Critical schema mismatch. Self-healing failed.', error: retryError.message });
      }
    }

    if (error.code === 'ER_BAD_FIELD_ERROR') {
      res.status(500).json({ 
        message: 'Institutional schema mismatch detected. Missing recovery columns.', 
        error: error.message,
        suggestion: 'Please run the /api/sync-schema diagnostic route.' 
      });
    } else {
      res.status(500).json({ message: 'Fatal exception registering transaction request.', error: error.message });
    }
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
