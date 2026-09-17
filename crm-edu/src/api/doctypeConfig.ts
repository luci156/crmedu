// ═══════════════════════════════════════════════════════════════
//  CRM EDU – DocType Configuration
//  Single source of truth for all DocType mappings & labels
// ═══════════════════════════════════════════════════════════════

// ─── DocType Name Map ─────────────────────────────────────────────────────────
export const DOCTYPE_MAP = {
  Student: 'Student',
  Department: 'Department',
  Program: 'Program',
  AcademicTerm: 'Academic Term',
  Course: 'Course',
  CourseOffering: 'Course Offering',
  StudentCourseEnrollment: 'Student Course Enrollment',
  ClassSession: 'Class Session',
  StudentAttendance: 'Student Attendance',
} as const

export type DoctypeKey = keyof typeof DOCTYPE_MAP

// ─── DocType Display Labels (Vietnamese) ─────────────────────────────────────
export const DOCTYPE_LABELS: Record<DoctypeKey, string> = {
  Student: 'Sinh viên',
  Department: 'Khoa / Bộ môn',
  Program: 'Chương trình đào tạo',
  AcademicTerm: 'Học kỳ',
  Course: 'Môn học',
  CourseOffering: 'Lớp học phần',
  StudentCourseEnrollment: 'Đăng ký học phần',
  ClassSession: 'Buổi học',
  StudentAttendance: 'Điểm danh',
}

// ─── Student Status ───────────────────────────────────────────────────────────
export const STUDENT_STATUS_LABELS: Record<string, string> = {
  Active: 'Đang học',
  Inactive: 'Không hoạt động',
  Graduated: 'Đã tốt nghiệp',
  Suspended: 'Đình chỉ',
  Withdrawn: 'Thôi học',
  'On Leave': 'Tạm nghỉ',
}

export const STUDENT_STATUS_COLORS: Record<string, string> = {
  Active: 'bg-green-100 text-green-800',
  Inactive: 'bg-gray-100 text-gray-600',
  Graduated: 'bg-blue-100 text-blue-800',
  Suspended: 'bg-red-100 text-red-800',
  Withdrawn: 'bg-orange-100 text-orange-800',
  'On Leave': 'bg-yellow-100 text-yellow-800',
}

// ─── Academic Term Status ─────────────────────────────────────────────────────
export const TERM_STATUS_LABELS: Record<string, string> = {
  Planning: 'Lập kế hoạch',
  Open: 'Đăng ký mở',
  'In Progress': 'Đang diễn ra',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã hủy',
}

export const TERM_STATUS_COLORS: Record<string, string> = {
  Planning: 'bg-gray-100 text-gray-600',
  Open: 'bg-blue-100 text-blue-800',
  'In Progress': 'bg-orange-100 text-orange-800',
  Completed: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
}

// ─── Attendance Status ────────────────────────────────────────────────────────
export const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  Present: 'Có mặt',
  Absent: 'Vắng mặt',
  Late: 'Đi trễ',
  Excused: 'Có phép',
  Leave: 'Nghỉ phép',
}

export const ATTENDANCE_STATUS_COLORS: Record<string, string> = {
  Present: 'bg-green-100 text-green-800',
  Absent: 'bg-red-100 text-red-800',
  Late: 'bg-yellow-100 text-yellow-800',
  Excused: 'bg-blue-100 text-blue-800',
  Leave: 'bg-purple-100 text-purple-800',
}

// ─── Attendance Type ──────────────────────────────────────────────────────────
export const ATTENDANCE_TYPE_LABELS: Record<string, string> = {
  Regular: 'Thường',
  'Make-up': 'Bù',
  Online: 'Trực tuyến',
}

// ─── Course Type ──────────────────────────────────────────────────────────────
export const COURSE_TYPE_LABELS: Record<string, string> = {
  Mandatory: 'Bắt buộc',
  Elective: 'Tự chọn',
  Optional: 'Tùy chọn',
}

export const COURSE_TYPE_COLORS: Record<string, string> = {
  Mandatory: 'bg-orange-100 text-orange-800',
  Elective: 'bg-blue-100 text-blue-800',
  Optional: 'bg-gray-100 text-gray-600',
}

// ─── Enrollment Status ────────────────────────────────────────────────────────
export const ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  Enrolled: 'Đang học',
  Completed: 'Hoàn thành',
  Dropped: 'Rút môn',
  Withdrawn: 'Thôi học',
  Failed: 'Không đạt',
}

export const ENROLLMENT_STATUS_COLORS: Record<string, string> = {
  Enrolled: 'bg-blue-100 text-blue-800',
  Completed: 'bg-green-100 text-green-800',
  Dropped: 'bg-orange-100 text-orange-800',
  Withdrawn: 'bg-gray-100 text-gray-600',
  Failed: 'bg-red-100 text-red-800',
}

// ─── Class Session Status ─────────────────────────────────────────────────────
export const SESSION_STATUS_LABELS: Record<string, string> = {
  Scheduled: 'Đã lên lịch',
  Completed: 'Đã kết thúc',
  Cancelled: 'Đã hủy',
  Postponed: 'Hoãn lại',
  'Make-up': 'Bù',
}

export const SESSION_STATUS_COLORS: Record<string, string> = {
  Scheduled: 'bg-blue-100 text-blue-800',
  Completed: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
  Postponed: 'bg-yellow-100 text-yellow-800',
  'Make-up': 'bg-purple-100 text-purple-800',
}

// ─── Course Offering Status ───────────────────────────────────────────────────
export const OFFERING_STATUS_LABELS: Record<string, string> = {
  Planned: 'Kế hoạch',
  Open: 'Đang mở',
  'In Progress': 'Đang diễn ra',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã hủy',
}

export const OFFERING_STATUS_COLORS: Record<string, string> = {
  Planned: 'bg-gray-100 text-gray-600',
  Open: 'bg-blue-100 text-blue-800',
  'In Progress': 'bg-orange-100 text-orange-800',
  Completed: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
}

// ─── Degree Level ─────────────────────────────────────────────────────────────
export const DEGREE_LEVEL_LABELS: Record<string, string> = {
  Associate: 'Cao đẳng',
  Bachelor: 'Đại học',
  Master: 'Thạc sĩ',
  Doctorate: 'Tiến sĩ',
}

// ─── Gender ───────────────────────────────────────────────────────────────────
export const GENDER_LABELS: Record<string, string> = {
  Male: 'Nam',
  Female: 'Nữ',
  Other: 'Khác',
}

// ─── Helper: Status fields to not allow manual edit ──────────────────────────
// These are computed fields that must never be set by user input
export const STUDENT_READONLY_FIELDS = ['gpa', 'attendance_rate', 'total_absent', 'registered_credits', 'completed_credits'] as const
export const ENROLLMENT_READONLY_FIELDS = ['total_present', 'total_absent', 'total_late', 'attendance_rate', 'absent_rate', 'credits', 'student_name', 'course', 'academic_term'] as const
export const ATTENDANCE_READONLY_FIELDS = ['course_offering', 'course', 'academic_term', 'session_date', 'session_no', 'slot'] as const
