import express, { Request, Response } from 'express';
import pool from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { logAudit } from '../utils/auditLogger.js';
import { authenticateToken, authorizeRoles } from '../utils/auth.js';
import { validate, facultySchema } from '../middleware/validator.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req: Request, res: Response, next: express.NextFunction) => {
  const isArchived = req.query.archived === 'true' ? 1 : 0;
  const { campus_id, term_id } = req.query;
  try {
    let query = `
      SELECT f.*, p.code as program_code, p.name as program_name, c.name as campus_name,
             d.name as department_name, d.code as department_code,
             (SELECT JSON_ARRAYAGG(subject_id) FROM faculty_specializations WHERE faculty_id = f.id) as specializations_array,
             (SELECT COALESCE(SUM(s.required_hours), 0) 
              FROM teaching_loads tl 
              JOIN subjects s ON tl.subject_id = s.id 
              WHERE tl.faculty_id = f.id AND tl.status != 'archived'
              ${term_id ? 'AND tl.term_id = ?' : ''}) as current_load
      FROM faculty f
      LEFT JOIN programs p ON f.program_id = p.id
      LEFT JOIN campuses c ON f.campus_id = c.id
      LEFT JOIN departments d ON f.department_id = d.id
      WHERE f.is_archived = ?
    `;
    const params: any[] = term_id ? [term_id, isArchived] : [isArchived];
    
    if (campus_id) {
      query += ' AND f.campus_id = ?';
      params.push(campus_id);
    }
    
    query += ' ORDER BY f.full_name ASC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error: any) {
    next(error);
  }
});

router.post('/', authorizeRoles('admin', 'program_head', 'program_assistant'), validate(facultySchema), async (req: any, res: Response, next: express.NextFunction) => {
  const { full_name, program_id, campus_id, employment_type, max_teaching_hours, specializations, department_id } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result]: any = await connection.query(
      'INSERT INTO faculty (full_name, program_id, campus_id, employment_type, max_teaching_hours, department_id) VALUES (?, ?, ?, ?, ?, ?)',
      [full_name, program_id || 1, campus_id || null, employment_type || 'Regular', max_teaching_hours || 24, department_id || null]
    );
    const facultyId = result.insertId;

    if (specializations && Array.isArray(specializations)) {
      for (const subId of specializations) {
        await connection.query('INSERT INTO faculty_specializations (faculty_id, subject_id) VALUES (?, ?)', [facultyId, subId]);
      }
    }

    await connection.commit();
    await logAudit('CREATE', 'Faculty', facultyId, { full_name }, req.user.username);
    res.status(201).json({ id: facultyId, message: 'Faculty created successfully' });
  } catch (error: any) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

router.put('/:id', authorizeRoles('admin', 'program_head', 'program_assistant'), validate(facultySchema), async (req: any, res: Response, next: express.NextFunction) => {
  const { full_name, program_id, campus_id, employment_type, max_teaching_hours, specializations, department_id } = req.body;
  const facultyId = req.params.id;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [updResult]: any = await connection.query(
      'UPDATE faculty SET full_name = ?, program_id = ?, campus_id = ?, employment_type = ?, max_teaching_hours = ?, department_id = ? WHERE id = ?',
      [full_name, program_id, campus_id || null, employment_type, max_teaching_hours, department_id || null, facultyId]
    );

    if (updResult.affectedRows === 0) throw new ApiError(404, 'Faculty not found', 'NOT_FOUND');

    // Update specializations
    await connection.query('DELETE FROM faculty_specializations WHERE faculty_id = ?', [facultyId]);
    if (specializations && Array.isArray(specializations)) {
      for (const subId of specializations) {
        await connection.query('INSERT INTO faculty_specializations (faculty_id, subject_id) VALUES (?, ?)', [facultyId, subId]);
      }
    }

    await connection.commit();
    await logAudit('UPDATE', 'Faculty', req.params.id as string, { full_name }, req.user.username);
    res.json({ message: 'Faculty updated successfully' });
  } catch (error: any) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

router.delete('/:id', authorizeRoles('admin', 'program_head', 'program_assistant'), async (req: any, res: Response, next: express.NextFunction) => {
  try {
    const [[fac]]: [any[], any] = await pool.query('SELECT full_name FROM faculty WHERE id = ?', [req.params.id]);
    if (!fac) throw new ApiError(404, 'Faculty not found', 'NOT_FOUND');
    
    await pool.query('UPDATE faculty SET is_archived = TRUE WHERE id = ?', [req.params.id]);
    await logAudit('ARCHIVE', 'Faculty', req.params.id as string, { full_name: fac.full_name }, req.user.username);
    
    res.json({ message: 'Faculty archived successfully' });
  } catch (error: any) {
    next(error);
  }
});

router.delete('/:id/permanent', authorizeRoles('admin', 'program_head'), async (req: any, res: Response, next: express.NextFunction) => {
  try {
    const [result]: any = await pool.query('DELETE FROM faculty WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) throw new ApiError(404, 'Faculty not found', 'NOT_FOUND');

    await logAudit('PERMANENT_DELETE', 'Faculty', req.params.id as string, {}, req.user.username);
    res.json({ message: 'Faculty record permanently purged from institutional database.' });
  } catch (error: any) {
    next(error);
  }
});

router.post('/bulk-upload', authorizeRoles('admin', 'program_head', 'program_assistant'), async (req: any, res: Response, next: express.NextFunction) => {
  const { faculty } = req.body;
  if (!faculty || !Array.isArray(faculty)) {
    return next(new ApiError(400, 'Invalid faculty data provided', 'BAD_REQUEST'));
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Mapping maps
    const [programs]: any = await connection.query('SELECT id, code from programs');
    const [campuses]: any = await connection.query('SELECT id, name from campuses');
    const [departments]: any = await connection.query('SELECT id, code from departments');
    
    const programMap = new Map(programs.map((p: any) => [p.code.toUpperCase(), p.id]));
    const campusMap = new Map(campuses.map((c: any) => [c.name.toUpperCase(), c.id]));
    const deptMap = new Map(departments.map((d: any) => [d.code.toUpperCase(), d.id]));

    for (const fac of faculty) {
      const { full_name, program_code, campus_name, employment_type, max_teaching_hours, department_code } = fac;
      
      const pId = programMap.get(program_code?.toUpperCase()) || 1;
      const cId = campusMap.get(campus_name?.toUpperCase()) || null;
      const dId = deptMap.get(department_code?.toUpperCase()) || null;

      await connection.query(
        'INSERT INTO faculty (full_name, program_id, campus_id, employment_type, max_teaching_hours, department_id) VALUES (?, ?, ?, ?, ?, ?)',
        [full_name, pId, cId, employment_type || 'Regular', max_teaching_hours || 24, dId]
      );
    }

    await connection.commit();
    await logAudit('CREATE_BULK', 'Faculty', null, { count: faculty.length }, req.user.username);
    res.status(201).json({ message: `Successfully imported ${faculty.length} faculty members.` });
  } catch (error: any) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

router.get('/me/specializations', async (req: any, res: Response, next: express.NextFunction) => {
  try {
    if (!req.user.faculty_id) {
      return res.status(403).json({ message: 'User is not linked to a faculty profile.' });
    }
    const query = `
      SELECT s.id, s.subject_code as code, s.subject_name as name, 
             s.required_hours as units, s.units as credit_units,
             p.code as department
      FROM faculty_specializations fs
      JOIN subjects s ON fs.subject_id = s.id
      LEFT JOIN programs p ON s.program_id = p.id
      WHERE fs.faculty_id = ?
      ORDER BY s.subject_code ASC
    `;
    const [rows] = await pool.query(query, [req.user.faculty_id]);
    res.json(rows);
  } catch (error: any) {
    next(error);
  }
});

router.get('/me/loads', async (req: any, res: Response, next: express.NextFunction) => {
  try {
    if (!req.user.faculty_id) {
      return res.status(403).json({ message: 'User is not linked to a faculty profile.' });
    }
    const query = `
      SELECT 
        tl.id, tl.term_id, tl.status,
        t.name as term_name,
        s.subject_code, s.subject_name, s.required_hours,
        sec.name as section_name, p.code as program_code, sec.year_level,
        le.rating as evaluation_rating, le.notes as evaluation_notes
      FROM teaching_loads tl
      JOIN subjects s ON tl.subject_id = s.id
      JOIN terms t ON tl.term_id = t.id
      LEFT JOIN sections sec ON tl.section_id = sec.id
      LEFT JOIN programs p ON sec.program_id = p.id
      LEFT JOIN load_evaluations le ON tl.id = le.teaching_load_id
      WHERE tl.faculty_id = ?
      ORDER BY t.id DESC, s.subject_code ASC
    `;
    const [rows] = await pool.query(query, [req.user.faculty_id]);
    res.json(rows);
  } catch (error: any) {
    next(error);
  }
});


export default router;
