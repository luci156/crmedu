import { getList, formatApiError } from './frappeClient'
import { DOCTYPE_MAP } from './doctypeConfig'
import type { StudentAttendance, AttendanceStats } from '../types/models'

const ATTENDANCE_FIELDS = [
  'name', 'student', 'student_name', 'attendance_session',
  'course_offering', 'course', 'academic_term', 'session_date',
  'session_no', 'slot', 'status', 'attendance_type', 'remarks',
  'recorded_by', 'recorded_at',
]

// ─── Stats Calculation ────────────────────────────────────────────────────────

/** Derives attendance statistics from a flat list of StudentAttendance records. */
export function calculateAttendanceStats(records: StudentAttendance[]): AttendanceStats {
  const total   = records.length
  const present = records.filter((r) => r.status === 'Present').length
  const absent  = records.filter((r) => r.status === 'Absent').length
  const late    = records.filter((r) => r.status === 'Late').length
  const excused = records.filter((r) => r.status === 'Excused').length
  const leave   = records.filter((r) => r.status === 'Leave').length

  // Late counts as attended for rate calculation
  const attended = present + late
  const attendanceRate = total > 0 ? parseFloat(((attended / total) * 100).toFixed(1)) : 0
  const absentRate     = total > 0 ? parseFloat(((absent / total) * 100).toFixed(1)) : 0

  return { total, present, absent, late, excused, leave, attendanceRate, absentRate }
}

// ─── Query Helpers ────────────────────────────────────────────────────────────

/** Fetch all attendance records for a student. */
export async function getStudentAttendance(
  studentName: string,
  signal?: AbortSignal,
): Promise<StudentAttendance[]> {
  try {
    return await getList<StudentAttendance>(DOCTYPE_MAP.StudentAttendance, {
      fields: ATTENDANCE_FIELDS,
      filters: [['student', '=', studentName] as [string, string, string]],
      order_by: 'session_date desc',
      limit: 1000,
      signal,
    })
  } catch (err) {
    throw new Error(formatApiError(err))
  }
}

/** Fetch all attendance records for a class session. */
export async function getSessionAttendance(
  sessionName: string,
  signal?: AbortSignal,
): Promise<StudentAttendance[]> {
  try {
    return await getList<StudentAttendance>(DOCTYPE_MAP.StudentAttendance, {
      fields: ATTENDANCE_FIELDS,
      filters: [['attendance_session', '=', sessionName] as [string, string, string]],
      order_by: 'student_name asc',
      limit: 500,
      signal,
    })
  } catch (err) {
    throw new Error(formatApiError(err))
  }
}

/** Fetch all attendance records for a course offering. */
export async function getOfferingAttendance(
  offeringName: string,
  signal?: AbortSignal,
): Promise<StudentAttendance[]> {
  try {
    return await getList<StudentAttendance>(DOCTYPE_MAP.StudentAttendance, {
      fields: ATTENDANCE_FIELDS,
      filters: [['course_offering', '=', offeringName] as [string, string, string]],
      order_by: 'session_date desc',
      limit: 2000,
      signal,
    })
  } catch (err) {
    throw new Error(formatApiError(err))
  }
}

/**
 * Check if an attendance record already exists for student+session.
 * Returns true if duplicate found. Returns false on error to avoid blocking.
 */
export async function checkDuplicateAttendance(
  student: string,
  session: string,
): Promise<boolean> {
  try {
    const results = await getList<StudentAttendance>(DOCTYPE_MAP.StudentAttendance, {
      fields: ['name'],
      filters: [
        ['student', '=', student] as [string, string, string],
        ['attendance_session', '=', session] as [string, string, string],
      ],
      limit: 1,
    })
    return results.length > 0
  } catch {
    return false // Don't block on error
  }
}
