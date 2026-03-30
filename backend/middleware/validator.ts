import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Generic validation middleware
 * @param schema - The Zod schema to validate against
 */
export const validate = (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues || (result.error as any).errors || [];
      console.log(' [Validation Error Path]:', req.path);
      console.log(' [Validation Error Body]:', req.body);
      console.log(' [Validation Error Issues]:', JSON.stringify(errors, null, 2));
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.map((err: any) => ({
          path: err.path.join('.'),
          message: err.message
        }))
      });
    }
    // Replace req.body with the parsed/stripped value to ensure only schema-defined fields are used
    req.body = result.data;
    next();
  } catch (error: any) {
    res.status(500).json({ message: 'Internal validation error', error: error.message });
  }
};

// ── INSTITUTIONAL SCHEMAS ───────────────────────────────────────────────────

export const campusSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z.string().min(2, "Code must be at least 2 characters")
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters")
});

export const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  role: z.enum(['admin', 'viewer', 'program_head', 'faculty']).default('faculty'),
  faculty_id: z.coerce.number().int().positive().nullable().optional()
});

export const programSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  type: z.enum(['College', 'SHS', 'JHS', 'Other']).default('College')
});

export const sectionSchema = z.object({
  program_id: z.coerce.number().int().positive(),
  year_level: z.coerce.number().int().min(1).max(10),
  name: z.string().min(1, "Section name is required"),
  campus_id: z.coerce.number().int().positive().nullable().optional(),
  adviser_id: z.coerce.number().int().positive().nullable().optional()
});

export const roomSchema = z.object({
  name: z.string().min(1, "Room name is required"),
  type: z.enum(['Lecture', 'Laboratory', 'Field']).default('Lecture'),
  capacity: z.coerce.number().int().min(1).default(40),
  campus_id: z.coerce.number().int().positive().nullable().optional(),
  notes: z.string().optional(),
  status: z.string().default('active')
});

export const facultySchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  department: z.string().min(2, "Department is required"),
  specialization: z.string().optional(),
  max_teaching_hours: z.coerce.number().int().min(0).default(24),
  program_id: z.coerce.number().int().positive().nullable().optional(),
  campus_id: z.coerce.number().int().positive().nullable().optional(),
  employment_type: z.enum(['Regular', 'Part-time', 'Contractual']).default('Regular'),
  specializations: z.array(z.coerce.number().int().positive()).optional()
});

export const teachingLoadSchema = z.object({
  faculty_id: z.coerce.number().int().positive(),
  subject_id: z.coerce.number().int().positive().optional(),
  subject_ids: z.array(z.coerce.number().int().positive()).optional(),
  term_id: z.coerce.number().int().positive().optional().default(1),
  section_id: z.coerce.number().int().positive().optional().default(1),
  co_faculty_id_1: z.coerce.number().int().positive().nullable().optional(),
  co_faculty_id_2: z.coerce.number().int().positive().nullable().optional(),
  co_faculty_id_3: z.coerce.number().int().positive().nullable().optional(),
  status: z.enum(['draft', 'pending_review', 'approved', 'archived', 'rejected']).default('draft')
});

export const scheduleRequestSchema = z.object({
  faculty_id: z.coerce.number().int().positive(),
  schedule_id: z.coerce.number().int().positive(),
  request_type: z.enum(['CHANGE_ROOM', 'CHANGE_TIME', 'OTHER']),
  reason: z.string().min(5, "Reason must be at least 5 characters")
});

export const subjectSchema = z.object({
  subject_code: z.string().min(2, "Subject code is required"),
  subject_name: z.string().min(2, "Subject name is required"),
  units: z.coerce.number().int().min(0),
  required_hours: z.coerce.number().int().min(0),
  room_type: z.enum(['Lecture', 'Laboratory', 'Field', 'Any']).default('Any'),
  program_id: z.coerce.number().int().positive().nullable().optional(),
  year_level: z.coerce.number().int().min(1).max(10).nullable().optional()
});

export const termSchema = z.object({
  name: z.string().min(2, "Term name is required"),
  is_active: z.boolean().default(false)
});

// ── SCHEDULING SCHEMAS ────────────────────────────────────────────────────────

export const scheduleSchema = z.object({
  teaching_load_id: z.coerce.number().int().positive(),
  day_of_week: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, 'Invalid HH:mm:ss format'),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, 'Invalid HH:mm:ss format'),
  room: z.string().min(1)
}).refine(data => {
  // Ensure start_time < end_time
  const parse = (t: string) => { 
    const [h, m] = t.split(':').map(Number); 
    return h + m / 60; 
  };
  return parse(data.start_time) < parse(data.end_time);
}, {
  message: "End time must be after start time",
  path: ["end_time"]
});

export const autoScheduleSchema = z.object({
  term_id: z.coerce.number().int().positive(),
  campus_id: z.coerce.number().int().positive().optional()
});

