// ═══════════════════════════════════════════════════════════════
//  CRM EDU – TypeScript Models
//  Mapping chính xác với 9 DocType trên Frappe
// ═══════════════════════════════════════════════════════════════

// ── Student ─────────────────────────────────────────────────────
export interface Student {
  name: string
  student_id?: string
  student_name: string
  date_of_birth?: string
  gender?: 'Male' | 'Female' | 'Other'
  email?: string
  phone?: string
  address?: string
  department: string
  program: string
  admission_term: string
  enrollment_date?: string
  expected_graduation_date?: string
  advisor?: string
  student_status: 'Active' | 'Inactive' | 'Suspended' | 'Graduated' | 'Withdrawn' | 'On Leave'
  notes?: string
  // Read-only computed fields
  registered_credits?: number
  completed_credits?: number
  gpa?: number
  attendance_rate?: number
  total_absent?: number
}

// ── Department ───────────────────────────────────────────────────
export interface Department {
  name: string
  department_code: string
  department_name: string
  head_of_department?: string
  email?: string
  phone?: string
  status: 'Active' | 'Inactive'
  description?: string
}

// ── Program ──────────────────────────────────────────────────────
export interface Program {
  name: string
  program_code: string
  program_name: string
  department: string
  degree_level: 'Associate' | 'Bachelor' | 'Master' | 'Doctorate'
  duration_years?: number
  total_required_credits?: number
  status: 'Active' | 'Inactive'
  description?: string
}

// ── Academic Term ────────────────────────────────────────────────
export interface AcademicTerm {
  name: string
  term_code: string
  term_name: string
  academic_year: string
  start_date: string
  end_date: string
  status: 'Planning' | 'Open' | 'In Progress' | 'Completed' | 'Cancelled'
  is_current?: 0 | 1 | boolean
  description?: string
}

// ── Course ───────────────────────────────────────────────────────
export interface Course {
  name: string
  course_code: string
  course_name: string
  department: string
  credits: number
  course_type: 'Mandatory' | 'Elective' | 'Optional'
  prerequisite?: string
  status: 'Active' | 'Inactive'
  description?: string
  // NOTE: NO total_slots here — it belongs to CourseOffering
}

// ── Course Offering ──────────────────────────────────────────────
export interface CourseOffering {
  name: string
  offering_code: string
  course: string
  course_name?: string  // fetched/linked
  academic_term: string
  program?: string
  section?: string
  class_name?: string
  instructor?: string
  room?: string
  capacity?: number
  total_slots: number        // Source of truth for slots
  hours_per_slot?: number
  planned_hours?: number     // auto-calculated: total_slots * hours_per_slot
  start_date?: string
  end_date?: string
  status: 'Planned' | 'Open' | 'In Progress' | 'Completed' | 'Cancelled'
  description?: string
}

// ── Student Course Enrollment ────────────────────────────────────
export interface StudentCourseEnrollment {
  name: string
  enrollment_id?: string
  student: string
  student_name?: string      // fetched from Student
  course_offering: string
  course?: string            // fetched from CourseOffering
  academic_term?: string     // fetched from CourseOffering
  enrollment_date?: string
  status: 'Enrolled' | 'Completed' | 'Dropped' | 'Withdrawn' | 'Failed'
  credits?: number           // fetched from Course
  final_grade?: string
  grade_point?: number
  // Read-only computed attendance stats
  total_scheduled_sessions?: number
  total_present?: number
  total_absent?: number
  total_late?: number
  attendance_rate?: number
  absent_rate?: number
}

// ── Class Session ────────────────────────────────────────────────
export interface ClassSession {
  name: string
  session_id?: string
  course_offering: string
  session_no: number
  session_date: string
  start_time?: string
  end_time?: string
  slot?: string
  room?: string
  instructor?: string
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Postponed' | 'Make-up'
  topic?: string
  remarks?: string
}

// ── Student Attendance ───────────────────────────────────────────
export interface StudentAttendance {
  name: string
  attendance_id?: string
  student: string
  student_name?: string
  attendance_session: string    // Links to Class Session
  course_offering?: string      // auto-filled from session
  course?: string               // auto-filled from session
  academic_term?: string        // auto-filled from session
  session_date?: string         // auto-filled from session
  session_no?: number           // auto-filled from session
  slot?: string                 // auto-filled from session
  status: 'Present' | 'Absent' | 'Late' | 'Excused' | 'Leave'
  attendance_type?: 'Regular' | 'Make-up' | 'Online'
  remarks?: string
  recorded_by?: string
  recorded_at?: string
}

// ── Frappe Connection Profile ────────────────────────────────────
export interface ConnectionProfile {
  id: string
  name: string
  type: 'local' | 'cloud' | 'custom'
  baseURL: string
  apiKey: string
  apiSecret: string
  username?: string
  isActive: boolean
  lastStatus?: 'connected' | 'failed' | 'untested'
  lastChecked?: string
  frappeVersion?: string
  responseTime?: number
}

// ── Attendance Statistics ────────────────────────────────────────
export interface AttendanceStats {
  total: number
  present: number
  absent: number
  late: number
  excused: number
  leave: number
  attendanceRate: number
  absentRate: number
}

// ── Dashboard KPI ────────────────────────────────────────────────
export interface DashboardKPI {
  totalStudents: number
  activeStudents: number
  departments: number
  programs: number
  courses: number
  offerings: number
  activeSessions: number
  overallAttendanceRate: number
  overallAbsentRate: number
}
