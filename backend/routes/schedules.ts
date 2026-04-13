import express, { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { withTransaction } from '../utils/transaction.js';
import { logAudit } from '../utils/auditLogger.js';
import { authenticateToken, authorizeRoles } from '../utils/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Define a type for req.query in GET /
interface ScheduleQuery {
  faculty_id?: string;
  term_id?: string;
  campus_id?: string;
  section_id?: string;
}

// Discovery Engine: Allow all authenticated users (including viewers) to search for gaps
router.get('/suggest-slots', async (req: Request, res: Response, next: express.NextFunction) => {
  const { teaching_load_id, term_id, preferred_room } = req.query;

  if (!teaching_load_id || !term_id) {
    return res.status(400).json({ message: 'teaching_load_id and term_id are required.' });
  }

  const tId = Number(teaching_load_id);
  const tmId = Number(term_id);

  if (isNaN(tId) || isNaN(tmId)) {
    return res.status(400).json({ message: 'Invalid teaching_load_id or term_id provided.' });
  }

  try {
    const suggestions = await ScheduleService.suggestAlternativeSlots(pool, {
      teachingLoadId: tId,
      termId: tmId,
      preferredRoom: preferred_room as string | undefined,
      limit: 10 // Increase limit for recovery search
    });
    res.json(suggestions);
  } catch (error: any) {
    next(error);
  }
});

router.get('/check-conflict', authorizeRoles('admin', 'program_head', 'program_assistant'), async (req: Request, res: Response, next: express.NextFunction) => {
  const { teaching_load_id, day_of_week, start_time, end_time, room, schedule_id } = req.query;
  
  if (!teaching_load_id || !day_of_week || !start_time || !end_time || !room) {
    return res.json({ conflict: false });
  }

  const tlId = Number(teaching_load_id);
  const sId = Number(schedule_id) || null;

  if (isNaN(tlId) || (schedule_id && isNaN(Number(schedule_id)))) {
    return res.status(400).json({ message: 'Invalid ID parameters provided.' });
  }

  try {
    const result = await ScheduleService.validatePlacement(pool, {
      teachingLoadId: tlId,
      dayOfWeek: day_of_week as string,
      startTime: start_time as string,
      endTime: end_time as string,
      room: room as string,
      termId: 0, 
      excludeScheduleId: sId
    });
    
    res.json({ 
      conflict: !result.valid, 
      message: result.message, 
      details: result.details,
      warning: result.warning
    });
  } catch (error: any) {
    next(error);
  }
});

router.get('/', async (req: Request<{}, {}, {}, ScheduleQuery>, res: Response, next: express.NextFunction) => {
  try {
    const { faculty_id, term_id, campus_id, section_id } = req.query;
    let query = `
      SELECT sch.id, sch.teaching_load_id, sch.day_of_week, sch.start_time, sch.end_time, sch.room,
             tl.faculty_id, tl.co_faculty_id_1, tl.co_faculty_id_2, tl.subject_id, tl.term_id, tl.section_id, tl.status,
             f.full_name as faculty_name,
             f2.full_name as co_faculty_1_name,
             f3.full_name as co_faculty_2_name,
             s.subject_code, s.subject_name,
             sec.name as section_name, sec.year_level, p.code as program_code, p.id as program_id,
             rm.campus_id as room_campus_id,
             sch.is_makeup, sch.event_date,
             s.required_hours
      FROM schedules sch
      JOIN teaching_loads tl ON sch.teaching_load_id = tl.id
      JOIN faculty f ON tl.faculty_id = f.id
      LEFT JOIN faculty f2 ON tl.co_faculty_id_1 = f2.id
      LEFT JOIN faculty f3 ON tl.co_faculty_id_2 = f3.id
      JOIN subjects s ON tl.subject_id = s.id
      JOIN sections sec ON tl.section_id = sec.id
      JOIN programs p ON sec.program_id = p.id
      LEFT JOIN rooms rm ON sch.room = rm.name
    `;
    const params: (string | number)[] = [];
    const conditions = ["tl.status != 'archived'"];

    if (faculty_id) {
      conditions.push('(tl.faculty_id = ? OR tl.co_faculty_id_1 = ? OR tl.co_faculty_id_2 = ?)'); 
      params.push(faculty_id, faculty_id, faculty_id);
    }
    if (term_id) { conditions.push('tl.term_id = ?'); params.push(term_id); }
    if (campus_id) { conditions.push('rm.campus_id = ?'); params.push(campus_id); }
    if (section_id) { conditions.push('tl.section_id = ?'); params.push(section_id); }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY sch.day_of_week ASC, sch.start_time ASC`;

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error: any) {
    next(error);
  }
});

router.post('/', authorizeRoles('admin', 'program_head', 'program_assistant'), validate(scheduleSchema), async (req: any, res: Response, next: express.NextFunction) => {
  const { teaching_load_id, day_of_week, start_time, end_time, room } = req.body;
  
  try {
    const result = await withTransaction(async (connection) => {
      const [tlRows]: [any[], any] = await connection.query(`
        SELECT tl.term_id, tl.section_id, sec.campus_id 
        FROM teaching_loads tl
        JOIN sections sec ON tl.section_id = sec.id
        WHERE tl.id = ?
      `, [teaching_load_id]);
      
      if (tlRows.length === 0) {
        throw new ApiError(404, 'Teaching load not found', 'NOT_FOUND');
      }
      const { term_id: termId, section_id: sectionId, campus_id: campusId } = tlRows[0];

      const validation = await ScheduleService.validatePlacement(connection, {
        teachingLoadId: Number(teaching_load_id),
        dayOfWeek: day_of_week as string,
        startTime: start_time as string,
        endTime: end_time as string,
        room: room as string,
        termId: termId
      });

      if (!validation.valid) {
        throw new ApiError(400, validation.message || 'Validation failed', 'VALIDATION_ERROR', validation.details);
      }

      const [{ insertId }]: [any, any] = await connection.query(
        'INSERT INTO schedules (teaching_load_id, day_of_week, start_time, end_time, room) VALUES (?, ?, ?, ?, ?)',
        [teaching_load_id, day_of_week, start_time, end_time, room]
      );
      
      await logAudit('CREATE_SCHEDULE', 'Schedule', insertId, { 
        day: day_of_week, time: `${start_time}-${end_time}`, room 
      }, req.user.username);
      
      return { insertId, teaching_load_id, day_of_week, start_time, end_time, room, campusId };
    });

    res.status(201).json({ id: result.insertId, teaching_load_id: result.teaching_load_id, day_of_week: result.day_of_week, start_time: result.start_time, end_time: result.end_time, room: result.room });
    
    // Realtime Sync
    req.io.to(`campus_${result.campusId}`).emit('schedule_updated', { 
      campus_id: result.campusId,
      action: 'create',
      schedule_id: result.insertId
    });
  } catch (error: any) {
    next(error);
  }
});

router.put('/:id', authorizeRoles('admin', 'program_head', 'program_assistant'), validate(scheduleSchema), async (req: any, res: Response, next: express.NextFunction) => {
  const { day_of_week, start_time, end_time, room, teaching_load_id } = req.body;
  
  try {
    const { campusId } = await withTransaction(async (connection) => {
      const [existRows]: [any[], any] = await connection.query('SELECT teaching_load_id, room FROM schedules WHERE id = ?', [req.params.id]);
      if (existRows.length === 0) {
        throw new ApiError(404, 'Schedule not found', 'NOT_FOUND');
      }
      
      const targetTeachingLoadId = teaching_load_id || existRows[0].teaching_load_id;
      const targetRoom = room || existRows[0].room;

      const [tlRows]: [any[], any] = await connection.query(`
        SELECT tl.term_id, sec.campus_id 
        FROM teaching_loads tl
        JOIN sections sec ON tl.section_id = sec.id
        WHERE tl.id = ?
      `, [targetTeachingLoadId]);
      
      if (tlRows.length === 0) {
        throw new ApiError(404, 'Teaching load not found', 'NOT_FOUND');
      }
      const { term_id: termId, campus_id: campusId } = tlRows[0];

      const validation = await ScheduleService.validatePlacement(connection, {
        teachingLoadId: Number(targetTeachingLoadId),
        dayOfWeek: day_of_week as string,
        startTime: start_time as string,
        endTime: end_time as string,
        room: targetRoom as string,
        termId: termId,
        excludeScheduleId: Number(req.params.id)
      });

      if (!validation.valid) {
        throw new ApiError(400, validation.message || 'Validation failed', 'VALIDATION_ERROR', validation.details);
      }

      await connection.query(
        'UPDATE schedules SET teaching_load_id = ?, day_of_week = ?, start_time = ?, end_time = ?, room = ? WHERE id = ?',
        [targetTeachingLoadId, day_of_week, start_time, end_time, targetRoom, req.params.id]
      );
      
      await logAudit('UPDATE_SCHEDULE', 'Schedule', req.params.id as string, { 
        day: day_of_week, time: `${start_time}-${end_time}`, room: targetRoom 
      }, req.user.username);

      return { campusId };
    });

    res.json({ message: 'Schedule updated' });

    // Realtime Sync
    req.io.to(`campus_${campusId}`).emit('schedule_updated', { 
      campus_id: campusId,
      action: 'update',
      schedule_id: req.params.id
    });
  } catch (error: any) {
    next(error);
  }
});

router.delete('/:id', authorizeRoles('admin', 'program_head', 'program_assistant'), async (req: any, res: Response, next: express.NextFunction) => {
  try {
    const campusId = await withTransaction(async (connection) => {
      const [exist]: [any[], any] = await connection.query(`
        SELECT sec.campus_id 
        FROM schedules sch
        JOIN teaching_loads tl ON sch.teaching_load_id = tl.id
        JOIN sections sec ON tl.section_id = sec.id
        WHERE sch.id = ?
      `, [req.params.id]);

      await connection.query('DELETE FROM schedules WHERE id = ?', [req.params.id]);
      await logAudit('DELETE_SCHEDULE', 'Schedule', req.params.id as string, {}, req.user.username);
      
      return exist.length > 0 ? exist[0].campus_id : null;
    });

    res.json({ message: 'Schedule deleted successfully' });

    if (campusId) {
      req.io.to(`campus_${campusId}`).emit('schedule_updated', { 
        campus_id: campusId,
        action: 'delete',
        schedule_id: req.params.id
      });
    }
  } catch (error: any) {
    next(error);
  }
});

router.delete('/reset/:term_id', authorizeRoles('admin', 'program_head'), async (req: any, res: Response, next: express.NextFunction) => {
  try {
    const { term_id } = req.params;
    await pool.query(`
      DELETE sch FROM schedules sch
      JOIN teaching_loads tl ON sch.teaching_load_id = tl.id
      WHERE tl.term_id = ?
    `, [term_id]);
    res.json({ message: 'Master Schedule wiped cleanly.' });

    // Realtime Sync
    req.io.emit('schedule_updated', { action: 'reset', term_id });
  } catch (error: any) {
    next(error);
  }
});

// ── AUTO-SCHEDULE ENDPOINT ───────────────────────────────────────────────────
router.route(['/auto-schedule', '/auto-schedule/'])
  .post(authorizeRoles('admin', 'program_head'), validate(autoScheduleSchema), async (req: any, res: Response, next: express.NextFunction) => {
    const { term_id, campus_id } = req.body;

    try {
      const { result, campusRows } = await withTransaction(async (connection) => {
        const result = await ScheduleService.autoGenerate(connection, term_id, campus_id);
        await logAudit('AUTO_SCHEDULE', 'Schedule', null, { term_id, campus_id, ...result }, req.user.username);

        if (result.scheduled > 0) {
          const values = result.newlyMapped.map(m => [
            m.teaching_load_id, m.day_of_week, m.start_time, m.end_time, m.room
          ]);
          await connection.query(
            'INSERT INTO schedules (teaching_load_id, day_of_week, start_time, end_time, room) VALUES ?',
            [values]
          );
        }

        // Fetch involved campuses for realtime sync signal
        const [campusRows]: [any[], any] = await connection.query(`
          SELECT DISTINCT sec.campus_id 
          FROM teaching_loads tl
          JOIN sections sec ON tl.section_id = sec.id
          WHERE tl.term_id = ? ${campus_id ? 'AND sec.campus_id = ?' : ''}
        `, campus_id ? [term_id, campus_id] : [term_id]);

        return { result, campusRows };
      });

      res.json({ scheduled: result.scheduled, failed: result.failed, failures: result.failures });

      if (result.scheduled > 0) {
        campusRows.forEach((row: any) => {
          req.io.to(`campus_${row.campus_id}`).emit('schedule_updated', { 
            campus_id: row.campus_id,
            action: 'auto'
          });
        });
      }
    } catch (error: any) {
      console.error(' [Auto-Scheduler Failure]:', error);
      res.status(500).json({ 
        error: 'Core Auto-Scheduler failed during execution.', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  })
  .all((req: Request, res: Response) => {
    res.status(405).json({ 
      error: `Method ${req.method} not allowed on /auto-schedule. Use POST.`,
      recommendation: "If you seen this in a browser, the frontend is accidentally navigating instead of sending an AJAX request."
    });
  });

/**
 * GET /suggestions/:teachingLoadId
 * Returns conflict-free alternative slots for a specific teaching load.
 */
router.get('/suggestions/:teachingLoadId', authorizeRoles('admin', 'program_head', 'program_assistant'), async (req: Request, res: Response, next: NextFunction) => {
  const { teachingLoadId } = req.params;
  const { term_id } = req.query;

  if (!term_id) {
    return next(new ApiError(400, 'Term ID is required for schedule suggestions.', 'BAD_REQUEST'));
  }

  const tlId = Number(teachingLoadId);
  const tmId = Number(term_id);

  if (isNaN(tlId) || isNaN(tmId)) {
    return next(new ApiError(400, 'Invalid Teaching Load ID or Term ID.', 'BAD_REQUEST'));
  }

  try {
    const suggestions = await ScheduleService.suggestAlternativeSlots(pool, {
      teachingLoadId: tlId,
      termId: tmId,
      limit: 8
    });
    res.json(suggestions);
  } catch (error: any) {
    next(error);
  }
});

// ── BATCH SYNC ENDPOINT (GHOST MODE COMMIT) ──────────────────────────────────
router.post('/validate-draft', authorizeRoles('admin', 'program_head', 'program_assistant'), async (req: any, res: Response) => {
  try {
    const { schedules } = req.body;
    const result = await ScheduleService.validateBatchIntegrity(pool, schedules);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/batch-sync', authorizeRoles('admin', 'program_head', 'program_assistant'), async (req: any, res: Response, next: express.NextFunction) => {
  const { term_id, updates, creates, deletes } = req.body;
  
  if (!term_id) {
    return next(new ApiError(400, 'Term ID is required for batch synchronization.', 'BAD_REQUEST'));
  }

  try {
    const tmId = Number(term_id);
    if (isNaN(tmId)) {
      throw new ApiError(400, 'Invalid Term ID provided for sync.', 'BAD_REQUEST');
    }

    await withTransaction(async (connection) => {
      const result = await ScheduleService.batchSync(connection, {
        termId: tmId,
        updates: updates || [],
        creates: creates || [],
        deletes: deletes || []
      });

      if (!result.success) {
        throw new ApiError(400, result.message, 'BATCH_SYNC_FAILURE');
      }

      await logAudit('STAGING_COMMIT', 'Schedule', null, { 
        modified: (updates?.length || 0) + (creates?.length || 0) + (deletes?.length || 0),
        summary: `Ghost Mode sync: ${updates?.length || 0} updated, ${creates?.length || 0} created, ${deletes?.length || 0} deleted.`
      }, req.user.username);
    });

    res.json({ message: 'Batch sync successful' });

    // Global refresh signal for all connected administrators
    req.io.emit('schedule_updated', { action: 'batch_sync', term_id });
  } catch (error: any) {
    next(error);
  }
});

export default router;
