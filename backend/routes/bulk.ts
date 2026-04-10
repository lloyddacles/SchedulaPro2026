import express, { Response } from 'express';
import pool from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';
import { authenticateToken, authorizeRoles } from '../utils/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRoles('admin'));

router.post('/:entity', async (req: any, res: Response) => {
  const { entity } = req.params as { entity: string };
  const dataArray = req.body;
  
  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    return res.status(400).json({ message: 'Payload must be a populated JSON array.' });
  }

  const allowedEntities: Record<string, string[]> = {
    'faculty': ['id', 'full_name', 'email', 'phone', 'department_id', 'department_code', 'employment_type', 'max_teaching_hours', 'campus_id', 'is_archived'],
    'subjects': ['id', 'subject_code', 'subject_name', 'units', 'required_hours', 'room_type', 'program_id', 'year_level', 'is_archived'],
    'rooms': ['id', 'name', 'type', 'capacity', 'campus_id', 'department_id', 'department_code', 'is_archived'],
    'sections': ['id', 'program_id', 'year_level', 'name', 'student_count', 'adviser_id', 'campus_id', 'is_archived'],
    'programs': ['id', 'code', 'name', 'campus_id', 'department_id', 'is_archived']
  };

  if (!allowedEntities[entity]) {
     return res.status(400).json({ message: 'Target entity is outside allowed parameter scope.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let processedData = [...dataArray];

    // ── Pre-processing: Resolve department_code to department_id ────────────
    const needsDeptResolution = processedData.some((obj: any) => obj.department_code && !obj.department_id);
    
    if (needsDeptResolution) {
      const [depts]: any = await connection.query('SELECT id, code FROM departments');
      const deptMap = new Map(depts.map((d: any) => [d.code.toUpperCase(), d.id]));

      processedData = processedData.map((obj: any) => {
        if (obj.department_code && !obj.department_id) {
          const resolvedId = deptMap.get(obj.department_code.toUpperCase());
          if (resolvedId) {
            obj.department_id = resolvedId;
          }
        }
        // Remove department_code from keys if it's purely virtual for resolution
        return obj;
      });
    }

    const keys = Object.keys(processedData[0]).filter(k => k !== 'department_code');
    if (keys.length === 0) return res.status(400).json({ message: 'Invalid object mapping bounds.' });

    // Validate that all final keys are in the whitelist
    const illeagalKeys = keys.filter(k => !allowedEntities[entity].includes(k));
    if (illeagalKeys.length > 0) {
      await connection.rollback();
      return res.status(400).json({ message: `Illegal columns detected: ${illeagalKeys.join(', ')}` });
    }

    const cols = keys.join(', ');
    const values = processedData.map((obj: any) => keys.map(k => obj[k] !== undefined && obj[k] !== '' ? obj[k] : null));

    const query = `INSERT INTO ${entity} (${cols}) VALUES ? ON DUPLICATE KEY UPDATE ${keys.map(k => `${k} = VALUES(${k})`).join(', ')}`;
    
    const [result]: any = await connection.query(query, [values]);

    await logAudit('BULK_IMPORT', entity.toUpperCase(), null, { 
       affected: result.affectedRows, 
       total: dataArray.length 
    }, req.user.username);

    await connection.commit();

    res.status(201).json({ 
       message: 'Bulk configuration natively mapped successfully!', 
       affected_rows: result.affectedRows,
       total_submitted: dataArray.length 
    });
  } catch (error: any) {
    await connection.rollback();
    console.error("Bulk Matrix Error:", error);
    res.status(500).json({ message: 'Fatal exception parsing mass data arrays.', error: error.message });
  } finally {
    connection.release();
  }
});

export default router;
