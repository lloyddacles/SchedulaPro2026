import bcrypt from 'bcryptjs';

// Static demo data for read-only/demo deployment (no database required).
// Password for demo users: admin123
const passwordHash = '$2a$10$Le1rD0NeVU0q1T1dXVvxfezJBDGiipQSQKmChH3Vk4Je/AT5BGDpe';

export const demoData = {
  users: [
    { id: 1, username: 'admin', email: 'admin@example.com', password_hash: passwordHash, role: 'admin', faculty_id: null, reset_otp: null, reset_expires: null, created_at: '2026-01-01T00:00:00Z' },
    { id: 2, username: 'programhead', email: 'head@example.com', password_hash: passwordHash, role: 'program_head', faculty_id: 1, reset_otp: null, reset_expires: null, created_at: '2026-01-01T00:00:00Z' },
    { id: 3, username: 'faculty', email: 'faculty@example.com', password_hash: passwordHash, role: 'faculty', faculty_id: 2, reset_otp: null, reset_expires: null, created_at: '2026-01-01T00:00:00Z' },
  ],
  campuses: [
    { id: 1, name: 'Main Campus', code: 'MAIN', is_archived: 0, created_at: '2026-01-01T00:00:00Z' },
  ],
  programs: [
    { id: 1, code: 'BSCS', name: 'BS Computer Science', type: 'College', is_archived: 0, created_at: '2026-01-01T00:00:00Z' },
    { id: 2, code: 'BSIT', name: 'BS Information Technology', type: 'College', is_archived: 0, created_at: '2026-01-01T00:00:00Z' },
  ],
  departments: [
    { id: 1, name: 'Computing', code: 'COMP', is_archived: 0, created_at: '2026-01-01T00:00:00Z' },
  ],
  terms: [
    { id: 1, name: '1st Semester AY 2026-2027', is_active: 1, created_at: '2026-01-01T00:00:00Z' },
    { id: 2, name: '2nd Semester AY 2026-2027', is_active: 0, created_at: '2026-01-01T00:00:00Z' },
  ],
  faculty: [
    { id: 1, full_name: 'Dr. Jane Smith', department: 'Computing', department_id: 1, employment_type: 'Regular', max_teaching_hours: 24, is_archived: 0, program_id: 1, campus_id: 1, email: 'jane@example.com', created_at: '2026-01-01T00:00:00Z' },
    { id: 2, full_name: 'Prof. John Doe', department: 'Computing', department_id: 1, employment_type: 'Part-time', max_teaching_hours: 12, is_archived: 0, program_id: 2, campus_id: 1, email: 'john@example.com', created_at: '2026-01-01T00:00:00Z' },
  ],
  subjects: [
    { id: 1, subject_code: 'CS101', subject_name: 'Introduction to Computing', units: 3, required_hours: 3, year_level: 1, room_type: 'Lecture', is_archived: 0, program_id: 1, created_at: '2026-01-01T00:00:00Z' },
    { id: 2, subject_code: 'IT201', subject_name: 'Web Development', units: 3, required_hours: 5, year_level: 2, room_type: 'Laboratory', is_archived: 0, program_id: 2, created_at: '2026-01-01T00:00:00Z' },
  ],
  sections: [
    { id: 1, program_id: 1, year_level: 1, name: 'BSCS 1A', student_count: 40, adviser_id: 1, is_archived: 0, campus_id: 1, created_at: '2026-01-01T00:00:00Z' },
    { id: 2, program_id: 2, year_level: 2, name: 'BSIT 2A', student_count: 35, adviser_id: 2, is_archived: 0, campus_id: 1, created_at: '2026-01-01T00:00:00Z' },
  ],
  rooms: [
    { id: 1, name: 'Room 101', type: 'Lecture', capacity: 45, campus_id: 1, is_archived: 0, status: 'active', created_at: '2026-01-01T00:00:00Z' },
    { id: 2, name: 'Lab 201', type: 'Laboratory', capacity: 30, campus_id: 1, is_archived: 0, status: 'active', created_at: '2026-01-01T00:00:00Z' },
  ],
  teaching_loads: [
    { id: 1, faculty_id: 1, co_faculty_id_1: null, co_faculty_id_2: null, co_faculty_id_3: null, subject_id: 1, term_id: 1, section_id: 1, status: 'approved', reviewed_by: 1, reviewed_at: '2026-01-02T00:00:00Z', review_notes: null, created_at: '2026-01-01T00:00:00Z' },
    { id: 2, faculty_id: 2, co_faculty_id_1: null, co_faculty_id_2: null, co_faculty_id_3: null, subject_id: 2, term_id: 1, section_id: 2, status: 'draft', reviewed_by: null, reviewed_at: null, review_notes: null, created_at: '2026-01-01T00:00:00Z' },
  ],
  schedules: [
    { id: 1, teaching_load_id: 1, day_of_week: 'Monday', start_time: '08:00:00', end_time: '10:00:00', room: 'Room 101' },
    { id: 2, teaching_load_id: 2, day_of_week: 'Wednesday', start_time: '13:00:00', end_time: '16:00:00', room: 'Lab 201' },
  ],
  faculty_specializations: [
    { faculty_id: 1, subject_id: 1 },
    { faculty_id: 2, subject_id: 2 },
  ],
  faculty_unavailability: [],
  schedule_requests: [],
  notifications: [],
  audit_logs: [],
  system_settings: [
    { id: 1, key: 'app_name', value: 'SchedulaPro 2026 (Demo)' },
  ],
  settings: [
    { id: 1, key: 'app_name', value: 'SchedulaPro 2026 (Demo)' },
  ],
  evaluations: [],
};

export function getTable(name) {
  if (demoData[name]) return demoData[name];
  return [];
}
