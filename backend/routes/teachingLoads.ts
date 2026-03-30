import express, { Request, Response } from 'express';
import pool from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { sendEmail } from '../utils/mailer.js';
import { logAudit } from '../utils/auditLogger.js';
import { notifyRole, notifyFaculty } from '../utils/notify.js';
import { authenticateToken, authorizeRoles } from '../utils/auth.js';
import { validate, teachingLoadSchema } from '../middleware/validator.js';

const router = express.Router();

router.use(authenticateToken);

// ── GET all teaching loads (with status) ────────────────────────────────────
router.get('/', async (req: Request, res: Response, next: express.NextFunction) => {
  try {
    const { term_id, archived, campus_id } = req.query;
    let query = `
      SELECT tl.*, 
             f.full_name as faculty_name, f.department, f.max_teaching_hours,
             f2.full_name as co_faculty_1_name, f3.full_name as co_faculty_2_name,
             s.subject_code, s.subject_name, s.units, s.required_hours,
             sec.name as section_name, sec.year_level, p.code as program_code, p.name as program_name, sec.campus_id,
             u.username as reviewed_by_name
      FROM teaching_loads tl
      JOIN faculty f ON tl.faculty_id = f.id
      LEFT JOIN faculty f2 ON tl.co_faculty_id_1 = f2.id
      LEFT JOIN faculty f3 ON tl.co_faculty_id_2 = f3.id
      JOIN subjects s ON tl.subject_id = s.id
      JOIN sections sec ON tl.section_id = sec.id
      JOIN programs p ON sec.program_id = p.id
      LEFT JOIN users u ON tl.reviewed_by = u.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (campus_id) { 
      conditions.push('sec.campus_id = ?'); 
      params.push(campus_id); 
    }
    if (term_id) { conditions.push('tl.term_id = ?'); params.push(term_id); }
    if (archived === 'true') {
      conditions.push("tl.status = 'archived'");
    } else {
      conditions.push("tl.status != 'archived'");
    }

    if (conditions.length > 0) { query += ' WHERE ' + conditions.join(' AND '); }
    
    query += ' ORDER BY tl.status ASC, tl.id DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error: any) {
    next(error);
  }
});

// ── POST create bulk teaching loads (always starts as 'draft') ────────────────
router.post('/', authorizeRoles('admin', 'program_head', 'program_assistant'), validate(teachingLoadSchema), async (req: any, res: Response, next: express.NextFunction) => {
  const { faculty_id, co_faculty_id_1, co_faculty_id_2, subject_ids, term_id, section_id } = req.body;
  const targetTermId = term_id || 1;
  const targetSectionId = section_id || 1;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const targetFacultyIds = [...new Set([faculty_id, co_faculty_id_1, co_faculty_id_2].filter(Boolean))];
    const placeholders = targetFacultyIds.map(() => '?').join(',');

    const [facultyRows]: [any[], any] = await connection.query(`
      SELECT f.id, f.max_teaching_hours, f.full_name, COALESCE(SUM(sub.required_hours), 0) as current_load
      FROM faculty f
      LEFT JOIN teaching_loads tl 
        ON (f.id = tl.faculty_id OR f.id = tl.co_faculty_id_1 OR f.id = tl.co_faculty_id_2) 
        AND tl.term_id = ? AND tl.status != 'rejected' AND tl.status != 'archived'
      LEFT JOIN subjects sub ON tl.subject_id = sub.id
      WHERE f.id IN (${placeholders})
      GROUP BY f.id
    `, [targetTermId, ...targetFacultyIds]);

    if (facultyRows.length !== targetFacultyIds.length) {
      throw new ApiError(404, 'One or more faculty members not found', 'NOT_FOUND');
    }

    const [subjectRows]: [any[], any] = await connection.query(`SELECT required_hours, subject_code FROM subjects WHERE id IN (?)`, [subject_ids]);
    if (subjectRows.length !== subject_ids.length) {
      throw new ApiError(404, 'One or more subjects not found', 'NOT_FOUND');
    }

    const totalReqHours = subjectRows.reduce((sum, s) => sum + Number(s.required_hours), 0);

    for (const fac of facultyRows) {
      const proposedLoad = Number(fac.current_load) + totalReqHours;
      if (proposedLoad > 60) {
        throw new ApiError(400, 'Hard Cap Exceeded', 'VALIDATION_ERROR', { 
          details: `Assigning these ${subject_ids.length} subjects pushes ${fac.full_name} to ${proposedLoad} hrs (exceeding the massive 60 hr absolute limit).` 
        });
      }
    }

    const values = subject_ids.map((sid: number) => [faculty_id, co_faculty_id_1 || null, co_faculty_id_2 || null, sid, targetTermId, targetSectionId, 'draft']);
    await connection.query(
      `INSERT INTO teaching_loads (faculty_id, co_faculty_id_1, co_faculty_id_2, subject_id, term_id, section_id, status) VALUES ?`,
      [values]
    );

    await connection.commit();
    await logAudit('CREATE_BULK', 'TeachingLoad', null, { subject_ids, faculty_id }, req.user.username);
    res.status(201).json({ message: `Successfully assigned ${subject_ids.length} subjects as Drafts.` });

    const [[sec]]: [any[], any] = await connection.query('SELECT campus_id FROM sections WHERE id = ?', [targetSectionId]);
    if (sec) {
      req.io.to(`campus_${sec.campus_id}`).emit('load_updated', { campus_id: sec.campus_id, action: 'create' });
    }
  } catch (error: any) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

// ── PATCH submit for review (draft/rejected → pending_review) ───────────────
router.patch('/:id/submit', authorizeRoles('admin', 'program_head', 'program_assistant'), async (req: any, res: Response, next: express.NextFunction) => {
  try {
    const [[load]]: [any[], any] = await pool.query('SELECT status FROM teaching_loads WHERE id = ?', [req.params.id]);
    if (!load) throw new ApiError(404, 'Load not found', 'NOT_FOUND');
    if (!['draft', 'rejected'].includes(load.status)) {
      throw new ApiError(400, `Cannot submit a load with status: ${load.status}`, 'VALIDATION_ERROR');
    }
    await pool.query(
      `UPDATE teaching_loads SET status = 'pending_review', review_notes = NULL, reviewed_by = NULL, reviewed_at = NULL WHERE id = ?`,
      [req.params.id]
    );
    await logAudit('SUBMIT_REVIEW', 'TeachingLoad', req.params.id, { previous_status: load.status }, req.user.username);
    
    await notifyRole('program_head', 'New Load Pending Review', 'A new teaching load was submitted for your approval.', 'info', '/assign-loads');

    res.json({ message: 'Load submitted for review.' });

    const [[sec]]: [any[], any] = await pool.query('SELECT sec.campus_id FROM teaching_loads tl JOIN sections sec ON tl.section_id = sec.id WHERE tl.id = ?', [req.params.id]);
    if (sec) {
      req.io.to(`campus_${sec.campus_id}`).emit('load_updated', { campus_id: sec.campus_id, action: 'submit', load_id: req.params.id });
    }
  } catch (err: any) {
    next(err);
  }
});

// ── PATCH approve (pending_review → approved) ────────────────────────────────
router.patch('/:id/approve', authorizeRoles('admin', 'program_head'), async (req: any, res: Response, next: express.NextFunction) => {
  const { reviewed_by } = req.body;
  try {
    const [[load]]: [any[], any] = await pool.query(
      `SELECT tl.*, f.full_name as faculty_name, s.subject_code
       FROM teaching_loads tl
       JOIN faculty f ON tl.faculty_id = f.id
       JOIN subjects s ON tl.subject_id = s.id
       WHERE tl.id = ?`, [req.params.id]
    );
    if (!load) throw new ApiError(404, 'Load not found', 'NOT_FOUND');
    if (load.status !== 'pending_review') {
      throw new ApiError(400, `Load must be in pending_review to approve. Current: ${load.status}`, 'VALIDATION_ERROR');
    }
    await pool.query(
      `UPDATE teaching_loads SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(), review_notes = NULL WHERE id = ?`,
      [reviewed_by || null, req.params.id]
    );
    await logAudit('APPROVE', 'TeachingLoad', req.params.id, { faculty: load.faculty_name, subject: load.subject_code }, req.user.username);

    try {
      const email = `${load.faculty_name.replace(/\s+/g, '.').toLowerCase()}@university.edu`;
      sendEmail(email, `Teaching Load Approved: ${load.subject_code}`,
        `<p>Hello <b>${load.faculty_name}</b>,</p>
         <p>Your teaching load for <strong>${load.subject_code}</strong> has been <b style="color:#16a34a">approved</b>.</p>
         <p>Please log into the Faculty Scheduling Portal to view your updated schedule.</p>`
      );
    } catch (e) { /* non-fatal */ }

    await notifyRole('admin', 'Teaching Load Approved', `The teaching load for ${load.faculty_name} (${load.subject_code}) was officially approved.`, 'success', '/assign-loads');
    await notifyFaculty(load.faculty_id, 'Official Class Assigned', `Your teaching load for ${load.subject_code} has been approved.`, 'success', '/my-schedule');

    res.json({ message: 'Load approved.' });

    const [[sec]]: [any[], any] = await pool.query('SELECT sec.campus_id FROM teaching_loads tl JOIN sections sec ON tl.section_id = sec.id WHERE tl.id = ?', [req.params.id]);
    if (sec) {
      req.io.to(`campus_${sec.campus_id}`).emit('load_updated', { campus_id: sec.campus_id, action: 'approve', load_id: req.params.id });
    }
  } catch (err: any) {
    next(err);
  }
});

// ── PATCH reject (pending_review → rejected) ─────────────────────────────────
router.patch('/:id/reject', authorizeRoles('admin', 'program_head'), async (req: any, res: Response, next: express.NextFunction) => {
  const { reviewed_by, review_notes } = req.body;
  
  if (!review_notes?.trim()) {
    return next(new ApiError(400, 'A rejection reason is required', 'VALIDATION_ERROR'));
  }

  try {
    const [[load]]: [any[], any] = await pool.query(
      `SELECT tl.*, f.full_name as faculty_name, s.subject_code
       FROM teaching_loads tl
       JOIN faculty f ON tl.faculty_id = f.id
       JOIN subjects s ON tl.subject_id = s.id
       WHERE tl.id = ?`, [req.params.id]
    );
    if (!load) throw new ApiError(404, 'Load not found', 'NOT_FOUND');
    if (load.status !== 'pending_review') {
      throw new ApiError(400, `Load must be in pending_review to reject. Current: ${load.status}`, 'VALIDATION_ERROR');
    }

    await pool.query(
      `UPDATE teaching_loads SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(), review_notes = ? WHERE id = ?`,
      [reviewed_by || null, review_notes, req.params.id]
    );

    await logAudit('REJECT', 'TeachingLoad', req.params.id, { faculty: load.faculty_name, subject: load.subject_code, reason: review_notes }, req.user.username);
    
    await notifyFaculty(load.faculty_id, 'Teaching Load Rejected', `Your load for ${load.subject_code} was rejected: ${review_notes}`, 'error', '/my-schedule');

    res.json({ message: 'Load rejected.' });

    const [[sec]]: [any[], any] = await pool.query('SELECT sec.campus_id FROM teaching_loads tl JOIN sections sec ON tl.section_id = sec.id WHERE tl.id = ?', [req.params.id]);
    if (sec) {
      req.io.to(`campus_${sec.campus_id}`).emit('load_updated', { campus_id: sec.campus_id, action: 'reject', load_id: req.params.id });
    }
  } catch (err: any) {
    next(err);
  }
});

// ── PATCH bulk-approve (multiple pending_review → approved) ─────────────────
router.patch('/bulk-approve', authorizeRoles('admin', 'program_head'), async (req: any, res: Response, next: express.NextFunction) => {
  const { ids, reviewed_by } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return next(new ApiError(400, 'No IDs provided', 'VALIDATION_ERROR'));
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Check if all loads are in pending_review
    const [loads]: [any[], any] = await connection.query(
      "SELECT id, faculty_id, subject_id, section_id FROM teaching_loads WHERE id IN (?) AND status = 'pending_review'",
      [ids]
    );

    if (loads.length !== ids.length) {
      throw new ApiError(400, 'Some loads are not in pending_review or do not exist', 'VALIDATION_ERROR');
    }

    await connection.query(
      "UPDATE teaching_loads SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(), review_notes = NULL WHERE id IN (?)",
      [reviewed_by || null, ids]
    );

    await connection.commit();
    await logAudit('BULK_APPROVE', 'TeachingLoad', null, { count: ids.length, ids }, req.user.username);

    res.json({ message: `${ids.length} loads approved successfully.` });

    // Collect involved campuses for socket emit
    const [campuses]: [any[], any] = await pool.query(
      'SELECT DISTINCT sec.campus_id FROM sections sec JOIN teaching_loads tl ON tl.section_id = sec.id WHERE tl.id IN (?)',
      [ids]
    );
    campuses.forEach(c => {
      req.io.to(`campus_${c.campus_id}`).emit('load_updated', { campus_id: c.campus_id, action: 'bulk_approve', ids });
    });

  } catch (err: any) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

// ── PATCH bulk-reject (multiple pending_review → rejected) ──────────────────
router.patch('/bulk-reject', authorizeRoles('admin', 'program_head'), async (req: any, res: Response, next: express.NextFunction) => {
  const { ids, reviewed_by, review_notes } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return next(new ApiError(400, 'No IDs provided', 'VALIDATION_ERROR'));
  }
  if (!review_notes?.trim()) {
    throw new ApiError(400, 'A rejection reason is required for bulk rejection', 'VALIDATION_ERROR');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [loads]: [any[], any] = await connection.query(
      "SELECT id FROM teaching_loads WHERE id IN (?) AND status = 'pending_review'",
      [ids]
    );

    if (loads.length !== ids.length) {
      throw new ApiError(400, 'Some loads are not in pending_review or do not exist', 'VALIDATION_ERROR');
    }

    await connection.query(
      "UPDATE teaching_loads SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(), review_notes = ? WHERE id IN (?)",
      [reviewed_by || null, review_notes, ids]
    );

    await connection.commit();
    await logAudit('BULK_REJECT', 'TeachingLoad', null, { count: ids.length, ids, reason: review_notes }, req.user.username);

    res.json({ message: `${ids.length} loads rejected successfully.` });

    const [campuses]: [any[], any] = await pool.query(
      'SELECT DISTINCT sec.campus_id FROM sections sec JOIN teaching_loads tl ON tl.section_id = sec.id WHERE tl.id IN (?)',
      [ids]
    );
    campuses.forEach(c => {
      req.io.to(`campus_${c.campus_id}`).emit('load_updated', { campus_id: c.campus_id, action: 'bulk_reject', ids });
    });

  } catch (err: any) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

// ── PUT update existing teaching load ─────────────────────────────────────────
router.put('/:id', authorizeRoles('admin', 'program_head', 'program_assistant'), async (req: any, res: Response, next: express.NextFunction) => {
  const { faculty_id, co_faculty_id_1, co_faculty_id_2, subject_id, section_id, term_id } = req.body;
  const loadId = req.params.id;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[existLoad]]: [any[], any] = await connection.query('SELECT status FROM teaching_loads WHERE id = ?', [loadId]);
    if (!existLoad) {
      throw new ApiError(404, 'Load not found', 'NOT_FOUND');
    }

    const targetFacultyIds = [...new Set([faculty_id, co_faculty_id_1, co_faculty_id_2].filter(Boolean))];
    const placeholders = targetFacultyIds.map(() => '?').join(',');

    const [facultyRows]: [any[], any] = await connection.query(`
      SELECT f.id, f.max_teaching_hours, f.full_name, COALESCE(SUM(sub.required_hours), 0) as current_load
      FROM faculty f
      LEFT JOIN teaching_loads tl 
        ON (f.id = tl.faculty_id OR f.id = tl.co_faculty_id_1 OR f.id = tl.co_faculty_id_2) 
        AND tl.term_id = ? AND tl.status != 'rejected' AND tl.status != 'archived' AND tl.id != ?
      LEFT JOIN subjects sub ON tl.subject_id = sub.id
      WHERE f.id IN (${placeholders})
      GROUP BY f.id
    `, [term_id, loadId, ...targetFacultyIds]);

    const [[subjectRow]]: [any[], any] = await connection.query('SELECT required_hours FROM subjects WHERE id = ?', [subject_id]);
    const reqHours = subjectRow ? Number(subjectRow.required_hours) : 0;

    for (const fac of facultyRows) {
      const proposedLoad = Number(fac.current_load) + reqHours;
      if (proposedLoad > 60) {
        throw new ApiError(400, 'Hard Cap Exceeded', 'VALIDATION_ERROR', { 
          details: `Updating this pushes ${fac.full_name} to ${proposedLoad} hrs (exceeding the massive 60 hr absolute limit).` 
        });
      }
    }

    await connection.query(
      `UPDATE teaching_loads 
       SET faculty_id=?, co_faculty_id_1=?, co_faculty_id_2=?, subject_id=?, section_id=?, status='draft', reviewed_by=NULL, review_notes=NULL 
       WHERE id=?`,
      [faculty_id, co_faculty_id_1 || null, co_faculty_id_2 || null, subject_id, section_id, loadId]
    );

    await connection.query('DELETE FROM schedules WHERE teaching_load_id = ?', [loadId]);

    await connection.commit();
    await logAudit('UPDATE', 'TeachingLoad', loadId, { faculty_id, subject_id, status: 'draft' }, req.user.username);
    res.json({ message: 'Teaching load updated securely as Draft.' });

    const [[sec]]: [any[], any] = await connection.query('SELECT campus_id FROM sections WHERE id = ?', [section_id]);
    if (sec) {
      req.io.to(`campus_${sec.campus_id}`).emit('load_updated', { campus_id: sec.campus_id, action: 'update', load_id: loadId });
    }
  } catch (err: any) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

// ── PATCH archive load ───────────────────────────────────────────────────────
router.patch('/:id/archive', authorizeRoles('admin', 'program_head'), async (req: any, res: Response, next: express.NextFunction) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [updResult]: any = await connection.query("UPDATE teaching_loads SET status = 'archived' WHERE id = ?", [req.params.id]);
    if (updResult.affectedRows === 0) throw new ApiError(404, 'Load not found', 'NOT_FOUND');

    await connection.query('DELETE FROM schedules WHERE teaching_load_id = ?', [req.params.id]);
    
    await connection.commit();
    await logAudit('ARCHIVE', 'TeachingLoad', req.params.id, {}, req.user.username);
    res.json({ message: 'Load archived successfully.' });

    const [[sec]]: [any[], any] = await connection.query('SELECT sec.campus_id FROM teaching_loads tl JOIN sections sec ON tl.section_id = sec.id WHERE tl.id = ?', [req.params.id]);
    if (sec) {
      req.io.to(`campus_${sec.campus_id}`).emit('load_updated', { campus_id: sec.campus_id, action: 'archive', load_id: req.params.id });
    }
  } catch (err: any) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

// ── DELETE ───────────────────────────────────────────────────────────────────
router.delete('/:id', authorizeRoles('admin', 'program_head'), async (req: any, res: Response, next: express.NextFunction) => {
  try {
    const [result]: any = await pool.query('DELETE FROM teaching_loads WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) throw new ApiError(404, 'Load not found', 'NOT_FOUND');

    await logAudit('DELETE', 'TeachingLoad', req.params.id, {}, req.user.username);
    res.json({ message: 'Teaching load deleted successfully' });

    req.io.emit('load_updated', { action: 'delete', load_id: req.params.id });
  } catch (error: any) {
    next(error);
  }
});

export default router;
