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
    'faculty': ['id', 'full_name', 'email', 'phone', 'department', 'employment_type', 'max_teaching_hours', 'campus_id', 'is_archived'],
    'subjects': ['id', 'subject_code', 'subject_name', 'units', 'required_hours', 'room_type', 'program_id', 'year_level', 'is_archived'],
    'rooms': ['id', 'name', 'type', 'capacity', 'campus_id', 'is_archived'],
    'sections': ['id', 'program_id', 'year_level', 'name', 'student_count', 'adviser_id', 'campus_id', 'is_archived'],
    'programs': ['id', 'code', 'name', 'campus_id', 'is_archived']
  };

  if (!allowedEntities[entity]) {
     return res.status(400).json({ message: 'Target entity is outside allowed parameter scope.' });
  }

  try {
    const keys = Object.keys(dataArray[0]);
    if (keys.length === 0) return res.status(400).json({ message: 'Invalid object mapping bounds.' });

    // Validate that all keys are in the whitelist
    const illeagalKeys = keys.filter(k => !allowedEntities[entity].includes(k));
    if (illeagalKeys.length > 0) {
      return res.status(400).json({ message: `Illegal columns detected: ${illeagalKeys.join(', ')}` });
    }

    const cols = keys.join(', ');
    const values = dataArray.map((obj: any) => keys.map(k => obj[k] !== undefined && obj[k] !== '' ? obj[k] : null));

    const query = `INSERT IGNORE INTO ${entity} (${cols}) VALUES ?`;
    
    const [result]: any = await pool.query(query, [values]);

    await logAudit('BULK_IMPORT', entity.toUpperCase(), null, { 
       inserted: result.affectedRows, 
       total: dataArray.length 
    }, req.user.username);

    res.status(201).json({ 
       message: 'Bulk configuration natively mapped successfully!', 
       inserted_objects: result.affectedRows,
       total_submitted: dataArray.length 
    });
  } catch (error: any) {
    console.error("Bulk Matrix Error:", error);
    res.status(500).json({ message: 'Fatal exception parsing mass data arrays.', error: error.message });
  }
});

export default router;
