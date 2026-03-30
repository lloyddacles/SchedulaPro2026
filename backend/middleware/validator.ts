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

// ── SCHEDULING SCHEMAS ────────────────────────────────────────────────────────

export const scheduleSchema = z.object({
  teaching_load_id: z.coerce.number().int().positive(),
  day_of_week: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, 'Invalid HH:mm:ss format'),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, 'Invalid HH:mm:ss format'),
  room: z.string().min(1)
}).refine(data => {
  // Ensure start_time < end_time
  const parse = (t: string) => { const [h, m] = t.split(':').map(Number); return h + m / 60; };
  return parse(data.start_time) < parse(data.end_time);
}, {
  message: "End time must be after start time",
  path: ["end_time"]
});

export const autoScheduleSchema = z.object({
  term_id: z.coerce.number().int().positive(),
  campus_id: z.coerce.number().int().positive().optional()
});
