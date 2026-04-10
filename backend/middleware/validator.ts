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

// ── VALIDATION HELPERS ──────────────────────────────────────────────────────

// Helper to handle empty strings, nulls, or undefined values for optional IDs
// Frontend dropdowns often send "" for 'Unassigned', which coerce.number() makes 0.
const nullableId = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? null : val),
  z.coerce.number().int().positive().nullable()
).optional();

const requiredId = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().int().positive()
);

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
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  role: z.enum(['admin', 'viewer', 'program_head', 'program_assistant', 'faculty']).default('faculty'),
  faculty_id: nullableId
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address")
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  newPassword: z.string().min(6, "Password must be at least 6 characters")
});

export const programSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  type: z.enum(['College', 'SHS', 'JHS', 'Other']).default('College')
});

export const sectionSchema = z.object({
  program_id: requiredId,
  year_level: z.coerce.number().int().min(1).max(13),
  name: z.string().min(1, "Section name is required"),
  student_count: z.coerce.number().int().min(1).default(50),
  campus_id: nullableId,
  adviser_id: nullableId
});

export const roomSchema = z.object({
  name: z.string().min(1, "Room name is required"),
  type: z.enum(['Lecture', 'Computer Lab', 'Science Lab', 'Kitchen', 'Court', 'Engineering Lab', 'Laboratory', 'Field']).default('Lecture'),
  capacity: z.coerce.number().int().min(1).default(40),
  campus_id: nullableId,
  department_id: nullableId,
  notes: z.string().optional(),
  status: z.string().default('active')
});

export const facultySchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  department_id: nullableId,
  specialization: z.string().optional(),
  max_teaching_hours: z.coerce.number().int().min(0).default(24),
  program_id: nullableId,
  campus_id: nullableId,
  employment_type: z.enum(['Regular', 'Part-time', 'Contractual', 'Probationary']).default('Regular'),
  specializations: z.array(z.coerce.number().int().positive()).optional()
});

export const teachingLoadSchema = z.object({
  faculty_id: requiredId,
  subject_id: nullableId,
  subject_ids: z.array(z.coerce.number().int().positive()).optional(),
  term_id: z.coerce.number().int().positive().optional().default(1),
  section_id: z.coerce.number().int().positive().optional().default(1),
  co_faculty_id_1: nullableId,
  co_faculty_id_2: nullableId,
  co_faculty_id_3: nullableId,
  status: z.enum(['draft', 'pending_review', 'approved', 'archived', 'rejected']).default('draft')
});

export const scheduleRequestSchema = z.object({
  schedule_id: requiredId,
  request_type: z.enum(['DROP', 'SWAP', 'CHANGE_ROOM', 'CHANGE_TIME', 'OTHER']),
  reason_text: z.string().min(5, "Justification must be at least 5 characters")
});

export const subjectSchema = z.object({
  subject_code: z.string().min(2, "Subject code is required"),
  subject_name: z.string().min(2, "Subject name is required"),
  units: z.coerce.number().int().min(0),
  required_hours: z.coerce.number().int().min(0),
  room_type: z.enum(['Lecture', 'Computer Lab', 'Science Lab', 'Kitchen', 'Court', 'Engineering Lab', 'Laboratory', 'Field', 'Any']).default('Any'),
  program_id: nullableId,
  year_level: z.coerce.number().int().min(1).max(13).nullable().optional()
});

export const termSchema = z.object({
  name: z.string().min(2, "Term name is required"),
  is_active: z.coerce.boolean().default(false),
  is_archived: z.coerce.boolean().default(false)
});

// ── SCHEDULING SCHEMAS ────────────────────────────────────────────────────────

export const scheduleSchema = z.object({
  teaching_load_id: requiredId,
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
  term_id: requiredId,
  campus_id: nullableId
});

