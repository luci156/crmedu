import { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { AutoRefresh } from '../components/AutoRefresh'
import { TableSkeleton } from '../components/Skeleton'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToast } from '../components/ui/Toast'
import { useFetch } from '../hooks/useFetch'
import { useDebounce } from '../hooks/useUtils'
import { getList, createDoc, updateDoc, deleteDoc } from '../api/frappeClient'
import { checkDuplicateAttendance, calculateAttendanceStats } from '../api/attendanceService'
import type {
  StudentAttendance,
  ClassSession,
  CourseOffering,
  StudentCourseEnrollment,
  Student,
} from '../types/models'
import {
  Plus,
  Search,
  CheckSquare,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Trash2,
  Edit2,
  Eye,
  Check,
  Zap,
} from 'lucide-react'

const ATTENDANCE_FIELDS = [
  'name',
  'attendance_id',
  'student',
  'student_name',
  'attendance_session',
  'course_offering',
  'course',
  'academic_term',
  'session_date',
  'session_no',
  'slot',
  'status',
  'attendance_type',
  'remarks',
  'recorded_by',
  'recorded_at',
]

const S_COLORS: Record<string, string> = {
  Present: 'bg-green-100 text-green-800 font-semibold',
  Absent: 'bg-red-100 text-red-800 font-semibold',
  Late: 'bg-yellow-100 text-yellow-800 font-semibold',
  Excused: 'bg-blue-100 text-blue-800',
  Leave: 'bg-gray-100 text-gray-700',
}

const S_LABELS: Record<string, string> = {
  Present: 'Có mặt',
  Absent: 'Vắng mặt',
  Late: 'Đi trễ',
  Excused: 'Có phép',
  Leave: 'Nghỉ phép',
}

const TYPE_LABELS: Record<string, string> = {
  Regular: 'Chính khóa',
  'Make-up': 'Học bù',
  Online: 'Trực tuyến',
}

const PER_PAGE = 25

type ViewMode = 'table' | 'quick_attendance'

export default function Attendance() {
  const { toast } = useToast()
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sessionFilter, setSessionFilter] = useState('')
  const [offeringFilter, setOfferingFilter] = useState('')
  const [page, setPage] = useState(0)

  // Single Attendance Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<StudentAttendance | null>(null)
  const [selectedSessionName, setSelectedSessionName] = useState('')
  const [selectedStudentName, setSelectedStudentName] = useState('')
  const [formStatus, setFormStatus] = useState<'Present' | 'Absent' | 'Late' | 'Excused' | 'Leave'>('Present')
  const [formType, setFormType] = useState<'Regular' | 'Make-up' | 'Online'>('Regular')
  const [formRemarks, setFormRemarks] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<StudentAttendance | null>(null)

  // Quick Attendance Section State (Requirement 30)
  const [quickOffering, setQuickOffering] = useState('')
  const [quickSession, setQuickSession] = useState('')
  const [quickStudents, setQuickStudents] = useState<
    { student: string; student_name: string; status: 'Present' | 'Absent' | 'Late' | 'Excused' | 'Leave'; existingRecordName?: string }[]
  >([])
  const [loadingQuick, setLoadingQuick] = useState(false)
  const [savingBulk, setSavingBulk] = useState(false)

  // Lookups
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [offerings, setOfferings] = useState<CourseOffering[]>([])
  const [students, setStudents] = useState<Student[]>([])

  const debouncedSearch = useDebounce(search, 200)

  // Fetch Attendance records
  const { data: rows = [], loading, error, lastRefresh, refresh } = useFetch<StudentAttendance[]>(
    async (signal) =>
      getList<StudentAttendance>('Student Attendance', {
        fields: ATTENDANCE_FIELDS,
        order_by: 'session_date desc',
        limit: 1000,
        signal,
      })
  )

  // Load lookup data
  useEffect(() => {
    Promise.all([
      getList<CourseOffering>('Course Offering', { fields: ['name', 'offering_code', 'course', 'academic_term'] }),
      getList<ClassSession>('Class Session', {
        fields: ['name', 'course_offering', 'session_no', 'session_date', 'slot'],
        order_by: 'session_date desc',
      }),
      getList<Student>('Student', { fields: ['name', 'student_name', 'student_id'] }),
    ])
      .then(([oRes, sRes, stuRes]) => {
        setOfferings(oRes || [])
        setSessions(sRes || [])
        setStudents(stuRes || [])
      })
      .catch(() => {})
  }, [])

  // Filtered rows for Table View
  const filtered = (rows || []).filter((d) => {
    const q = debouncedSearch.toLowerCase()
    const matchQ =
      !q ||
      (d.student_name ?? '').toLowerCase().includes(q) ||
      d.student.toLowerCase().includes(q) ||
      (d.course ?? '').toLowerCase().includes(q) ||
      d.attendance_session.toLowerCase().includes(q)
    const matchS = !statusFilter || d.status === statusFilter
    const matchSession = !sessionFilter || d.attendance_session === sessionFilter
    const matchOffering = !offeringFilter || d.course_offering === offeringFilter
    return matchQ && matchS && matchSession && matchOffering
  })

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paged = filtered.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)

  // Computed Attendance Stats from Student Attendance records (Rule 26)
  const stats = calculateAttendanceStats(rows || [])

  // ── Quick Attendance Load ────────────────────────────────────────────────
  async function loadQuickAttendanceList(sessionName: string) {
    if (!sessionName) {
      setQuickStudents([])
      return
    }
    setLoadingQuick(true)
    try {
      const sessionObj = sessions.find((s) => s.name === sessionName)
      if (!sessionObj) return

      // 1. Get all students enrolled in this offering
      const enrollments = await getList<StudentCourseEnrollment>('Student Course Enrollment', {
        fields: ['student', 'student_name'],
        filters: [['course_offering', '=', sessionObj.course_offering] as [string, string, string]],
      })

      // 2. Get any existing attendance records for this session
      const existingAttendance = await getList<StudentAttendance>('Student Attendance', {
        fields: ['name', 'student', 'status'],
        filters: [['attendance_session', '=', sessionName] as [string, string, string]],
      })

      const existingMap = new Map<string, { name: string; status: any }>()
      existingAttendance.forEach((att) => existingMap.set(att.student, { name: att.name, status: att.status }))

      // 3. Merge into quick student list (default Present if not recorded yet)
      const list = enrollments.map((enr) => {
        const exist = existingMap.get(enr.student)
        return {
          student: enr.student,
          student_name: enr.student_name || enr.student,
          status: (exist?.status as any) || 'Present',
          existingRecordName: exist?.name,
        }
      })

      setQuickStudents(list)
    } catch {
      toast('Lỗi khi tải danh sách sinh viên cho buổi học.', 'error')
    } finally {
      setLoadingQuick(false)
    }
  }

  // Set all students to 'Present' in Quick Attendance (Requirement 30)
  function handleMarkAllPresent() {
    setQuickStudents((prev) => prev.map((s) => ({ ...s, status: 'Present' })))
    toast('Đã chọn [Có mặt tất cả]', 'info')
  }

  // Save Bulk Attendance (Requirement 30)
  async function handleSaveBulkAttendance() {
    if (!quickSession || quickStudents.length === 0) {
      toast('Không có sinh viên nào để lưu điểm danh.', 'warning')
      return
    }
    setSavingBulk(true)
    const sessionObj = sessions.find((s) => s.name === quickSession)
    const offeringObj = offerings.find((o) => o.name === sessionObj?.course_offering)

    let createdCount = 0
    let updatedCount = 0

    try {
      for (const item of quickStudents) {
        if (item.existingRecordName) {
          // Update existing
          await updateDoc<StudentAttendance>('Student Attendance', item.existingRecordName, {
            status: item.status,
            recorded_at: new Date().toISOString(),
          })
          updatedCount++
        } else {
          // Create new record with Rule 24 mapping
          await createDoc<StudentAttendance>('Student Attendance', {
            student: item.student,
            student_name: item.student_name,
            attendance_session: quickSession,
            course_offering: sessionObj?.course_offering,
            course: offeringObj?.course,
            academic_term: offeringObj?.academic_term,
            session_date: sessionObj?.session_date,
            session_no: sessionObj?.session_no,
            slot: sessionObj?.slot,
            status: item.status,
            attendance_type: 'Regular',
            recorded_at: new Date().toISOString(),
          })
          createdCount++
        }
      }

      toast(`Lưu điểm danh thành công! (Tạo mới: ${createdCount}, Cập nhật: ${updatedCount})`, 'success')
      refresh()
      loadQuickAttendanceList(quickSession)
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Lỗi khi lưu điểm danh hàng loạt', 'error')
    } finally {
      setSavingBulk(false)
    }
  }

  // ── Single Attendance Record Handling (Rules 24 & 25) ────────────────────
  function openAddSingle() {
    setEditingItem(null)
    setSelectedSessionName(sessions[0]?.name || '')
    setSelectedStudentName(students[0]?.name || '')
    setFormStatus('Present')
    setFormType('Regular')
    setFormRemarks('')
    setIsModalOpen(true)
  }

  function openEditSingle(item: StudentAttendance) {
    setEditingItem(item)
    setSelectedSessionName(item.attendance_session)
    setSelectedStudentName(item.student)
    setFormStatus(item.status)
    setFormType(item.attendance_type || 'Regular')
    setFormRemarks(item.remarks || '')
    setIsModalOpen(true)
  }

  async function handleSaveSingle(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSessionName || !selectedStudentName) {
      toast('Vui lòng chọn cả Buổi học và Sinh viên.', 'error')
      return
    }

    setSaving(true)
    try {
      // Rule 25: Prevent duplicate attendance record (Student + Attendance Session)
      if (!editingItem) {
        const isDuplicate = await checkDuplicateAttendance(selectedStudentName, selectedSessionName)
        if (isDuplicate) {
          toast('Sinh viên này đã được điểm danh trong buổi học này.', 'error')
          setSaving(false)
          return
        }
      }

      // Rule 24: Fetch all session details automatically
      const sessionObj = sessions.find((s) => s.name === selectedSessionName)
      const offeringObj = offerings.find((o) => o.name === sessionObj?.course_offering)
      const studentObj = students.find((s) => s.name === selectedStudentName)

      const payload: Partial<StudentAttendance> = {
        student: selectedStudentName,
        student_name: studentObj?.student_name,
        attendance_session: selectedSessionName,
        course_offering: sessionObj?.course_offering,
        course: offeringObj?.course,
        academic_term: offeringObj?.academic_term,
        session_date: sessionObj?.session_date,
        session_no: sessionObj?.session_no,
        slot: sessionObj?.slot,
        status: formStatus,
        attendance_type: formType,
        remarks: formRemarks.trim() || undefined,
        recorded_at: new Date().toISOString(),
      }

      if (editingItem) {
        await updateDoc<StudentAttendance>('Student Attendance', editingItem.name, payload)
        toast('Cập nhật điểm danh thành công!', 'success')
      } else {
        await createDoc<StudentAttendance>('Student Attendance', payload)
        toast('Ghi nhận điểm danh thành công!', 'success')
      }

      setIsModalOpen(false)
      refresh()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Lỗi khi lưu điểm danh', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteDoc('Student Attendance', deleteTarget.name)
      toast('Đã xóa bản ghi điểm danh', 'success')
      setDeleteTarget(null)
      refresh()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Không thể xóa bản ghi này', 'error')
    }
  }

  const selectedSessionObj = sessions.find((s) => s.name === selectedSessionName)

  return (
    <Layout
      title="Điểm danh sinh viên"
      subtitle="Quản lý chuyên cần, điểm danh nhanh theo lớp và báo cáo tỷ lệ vắng"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'table' ? 'quick_attendance' : 'table')}
            className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
              viewMode === 'quick_attendance'
                ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                : 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50'
            }`}
          >
            <Zap size={14} /> {viewMode === 'quick_attendance' ? 'Xem danh sách' : 'Điểm danh nhanh theo lớp'}
          </button>
          <button className="btn-primary" onClick={openAddSingle}>
            <Plus size={16} /> Thêm bản ghi
          </button>
        </div>
      }
    >
      <AutoRefresh onRefresh={refresh} skip={loading} />

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={refresh} className="underline text-xs font-semibold">Thử lại</button>
        </div>
      )}

      {/* Summary KPI Pills (Rule 26: Attendance Calculation) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Tổng bản ghi</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{stats.total}</p>
          </div>
          <CheckSquare className="text-gray-300 w-8 h-8" />
        </div>

        <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-green-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-green-600">Có mặt</p>
            <p className="text-xl font-bold text-green-700 mt-0.5">{stats.present}</p>
          </div>
          <CheckCircle2 className="text-green-500 w-8 h-8" />
        </div>

        <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-red-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-red-600">Vắng mặt</p>
            <p className="text-xl font-bold text-red-700 mt-0.5">{stats.absent}</p>
          </div>
          <XCircle className="text-red-500 w-8 h-8" />
        </div>

        <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-yellow-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-yellow-600">Đi trễ</p>
            <p className="text-xl font-bold text-yellow-700 mt-0.5">{stats.late}</p>
          </div>
          <Clock className="text-yellow-500 w-8 h-8" />
        </div>

        <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-orange-100 flex items-center justify-between col-span-2 sm:col-span-1">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-600">Tỷ lệ có mặt</p>
            <p className="text-xl font-bold text-orange-600 mt-0.5">{stats.attendanceRate}%</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600">
            %
          </div>
        </div>
      </div>

      {/* ── VIEW 1: Quick Attendance Mode (Requirement 30) ────────────────── */}
      {viewMode === 'quick_attendance' && (
        <div className="card space-y-5 border-2 border-orange-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Zap className="text-orange-500" size={18} />
                Điểm danh nhanh theo buổi học
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Chọn Lớp học phần và Buổi học để điểm danh hàng loạt cho cả lớp
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <select
                className="input text-xs w-full sm:w-56"
                value={quickOffering}
                onChange={(e) => {
                  setQuickOffering(e.target.value)
                  const firstSes = sessions.find((s) => s.course_offering === e.target.value)
                  setQuickSession(firstSes?.name || '')
                  if (firstSes) loadQuickAttendanceList(firstSes.name)
                  else setQuickStudents([])
                }}
              >
                <option value="">-- Chọn lớp học phần --</option>
                {offerings.map((o) => (
                  <option key={o.name} value={o.name}>
                    {o.offering_code} ({o.course})
                  </option>
                ))}
              </select>

              <select
                className="input text-xs w-full sm:w-56"
                value={quickSession}
                disabled={!quickOffering}
                onChange={(e) => {
                  setQuickSession(e.target.value)
                  loadQuickAttendanceList(e.target.value)
                }}
              >
                <option value="">-- Chọn buổi học --</option>
                {sessions
                  .filter((s) => s.course_offering === quickOffering)
                  .map((s) => (
                    <option key={s.name} value={s.name}>
                      Buổi #{s.session_no} ({s.session_date})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Action buttons */}
          {quickSession && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-semibold text-gray-700">
                Danh sách sinh viên ({quickStudents.length} SV):
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 text-xs font-semibold border border-green-200 transition-colors flex items-center gap-1"
                >
                  <Check size={14} /> Có mặt tất cả
                </button>
                <button
                  type="button"
                  onClick={handleSaveBulkAttendance}
                  disabled={savingBulk || quickStudents.length === 0}
                  className="btn-primary py-1.5 px-4 text-xs shadow-sm"
                >
                  {savingBulk ? 'Đang lưu...' : '💾 Lưu điểm danh'}
                </button>
              </div>
            </div>
          )}

          {/* Student attendance list table */}
          {loadingQuick ? (
            <p className="text-xs text-gray-400 p-8 text-center animate-pulse">Đang tải danh sách sinh viên...</p>
          ) : !quickSession ? (
            <div className="p-8 text-center bg-gray-50 rounded-xl text-xs text-gray-400">
              Vui lòng chọn Lớp học phần và Buổi học ở trên để bắt đầu điểm danh.
            </div>
          ) : quickStudents.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-xl text-xs text-gray-400">
              Chưa có sinh viên nào đăng ký vào lớp học phần này.
            </div>
          ) : (
            <div className="border border-gray-100 rounded-xl overflow-hidden text-xs">
              <table className="w-full">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="py-2 px-3 text-center">STT</th>
                    <th className="py-2 px-3">Mã SV</th>
                    <th className="py-2 px-3">Họ và Tên</th>
                    <th className="py-2 px-3 text-center">Trạng thái điểm danh</th>
                  </tr>
                </thead>
                <tbody>
                  {quickStudents.map((item, idx) => (
                    <tr key={item.student} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="py-2.5 px-3 text-center font-mono text-gray-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-orange-600">{item.student}</td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900">{item.student_name}</td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                          {(['Present', 'Late', 'Absent', 'Excused'] as const).map((st) => (
                            <button
                              type="button"
                              key={st}
                              onClick={() => {
                                setQuickStudents((prev) =>
                                  prev.map((s) => (s.student === item.student ? { ...s, status: st } : s))
                                )
                              }}
                              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                                item.status === st
                                  ? st === 'Present'
                                    ? 'bg-green-600 text-white shadow-sm'
                                    : st === 'Late'
                                    ? 'bg-yellow-500 text-white shadow-sm'
                                    : st === 'Absent'
                                    ? 'bg-red-600 text-white shadow-sm'
                                    : 'bg-blue-600 text-white shadow-sm'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              {S_LABELS[st]}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── VIEW 2: Standard Table History View ────────────────────────────── */}
      {viewMode === 'table' && (
        <>
          {/* Toolbar */}
          <div className="card mb-5 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-9"
                placeholder="Tìm sinh viên, môn học..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(0)
                }}
              />
            </div>

            <select
              className="input w-44"
              value={offeringFilter}
              onChange={(e) => {
                setOfferingFilter(e.target.value)
                setPage(0)
              }}
            >
              <option value="">Tất cả lớp học phần</option>
              {offerings.map((o) => (
                <option key={o.name} value={o.name}>
                  {o.offering_code}
                </option>
              ))}
            </select>

            <select
              className="input w-40"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(0)
              }}
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(S_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>

            <span className="text-xs text-gray-500 font-medium px-2 py-1 bg-gray-100 rounded-lg">
              {filtered.length} bản ghi
            </span>
          </div>

          {/* Table */}
          {loading && rows.length === 0 ? (
            <TableSkeleton rows={8} cols={8} />
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Sinh viên</th>
                      <th>Lớp học phần</th>
                      <th>Buổi học</th>
                      <th>Ngày</th>
                      <th className="text-center">Buổi #</th>
                      <th>Trạng thái</th>
                      <th>Loại</th>
                      <th>Ghi chú</th>
                      <th className="text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((d) => (
                      <tr key={d.name} className="hover:bg-orange-50/60 transition-colors">
                        <td>
                          <div>
                            <span className="font-semibold text-gray-900 block">{d.student_name || d.student}</span>
                            <span className="font-mono text-[11px] text-gray-400">{d.student}</span>
                          </div>
                        </td>
                        <td className="font-mono text-xs font-semibold text-orange-600">{d.course_offering}</td>
                        <td className="text-gray-700 text-xs font-medium">{d.attendance_session}</td>
                        <td className="font-mono text-xs text-gray-600">{d.session_date || '—'}</td>
                        <td className="text-center font-mono font-bold text-gray-800">#{d.session_no ?? '—'}</td>
                        <td>
                          <span className={`badge ${S_COLORS[d.status] || 'bg-gray-100'}`}>
                            {S_LABELS[d.status] || d.status}
                          </span>
                        </td>
                        <td className="text-xs text-gray-500">{TYPE_LABELS[d.attendance_type || ''] || d.attendance_type || 'Chính khóa'}</td>
                        <td className="text-xs text-gray-500 max-w-[150px] truncate">{d.remarks || '—'}</td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              onClick={() => openEditSingle(d)}
                              title="Chỉnh sửa"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              onClick={() => setDeleteTarget(d)}
                              title="Xóa"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {paged.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center py-16">
                          <div className="flex flex-col items-center gap-2 text-gray-400">
                            <CheckSquare size={36} className="text-gray-300 mb-1" />
                            <p className="font-semibold text-gray-600">Chưa có dữ liệu điểm danh nào</p>
                            <p className="text-xs text-gray-400">Chọn "Điểm danh nhanh theo lớp" để ghi nhận điểm danh</p>
                            <button
                              className="btn-primary text-xs mt-2"
                              onClick={() => setViewMode('quick_attendance')}
                            >
                              <Zap size={14} /> Điểm danh ngay
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 text-xs">
                  <span className="text-gray-500">
                    Hiển thị {page * PER_PAGE + 1} - {Math.min((page + 1) * PER_PAGE, filtered.length)} trên tổng số {filtered.length}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                      className="btn-ghost py-1 px-2.5 text-xs disabled:opacity-40"
                    >
                      Trước
                    </button>
                    <span className="font-semibold text-gray-700 px-2">
                      {page + 1} / {totalPages}
                    </span>
                    <button
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                      className="btn-ghost py-1 px-2.5 text-xs disabled:opacity-40"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Single Attendance Modal (Rules 24 & 25) */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Chỉnh sửa bản ghi Điểm danh' : 'Ghi nhận Điểm danh (Gắn với Buổi học)'}
        size="md"
      >
        <form onSubmit={handleSaveSingle} className="space-y-4">
          {/* Rule 24: Must link to Class Session */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Buổi học (Class Session) *</label>
            <select
              className="input"
              value={selectedSessionName}
              onChange={(e) => setSelectedSessionName(e.target.value)}
              required
            >
              <option value="">-- Chọn buổi học --</option>
              {sessions.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.course_offering} - Buổi #{s.session_no} ({s.session_date})
                </option>
              ))}
            </select>
          </div>

          {/* Auto-filled session details preview (Rule 24) */}
          {selectedSessionObj && (
            <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-600 space-y-1">
              <p>
                Lớp học phần: <strong className="text-gray-900">{selectedSessionObj.course_offering}</strong>
              </p>
              <p>
                Ngày học: <strong className="text-gray-900">{selectedSessionObj.session_date}</strong> (Buổi #{selectedSessionObj.session_no})
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Sinh viên *</label>
            <select
              className="input"
              value={selectedStudentName}
              onChange={(e) => setSelectedStudentName(e.target.value)}
              required
            >
              <option value="">-- Chọn sinh viên --</option>
              {students.map((st) => (
                <option key={st.name} value={st.name}>
                  {st.student_name} ({st.student_id || st.name})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Trạng thái điểm danh *</label>
              <select
                className="input"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
              >
                {Object.entries(S_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Loại hình</label>
              <select
                className="input"
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
              >
                <option value="Regular">Chính khóa</option>
                <option value="Make-up">Học bù</option>
                <option value="Online">Trực tuyến</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Ghi chú</label>
            <input
              className="input"
              value={formRemarks}
              onChange={(e) => setFormRemarks(e.target.value)}
              placeholder="Lý do đi trễ, xin phép vắng..."
            />
          </div>

          {/* Rule 24 & 25 Notice */}
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-900 leading-relaxed">
            ℹ️ <strong>Quy tắc điểm danh:</strong> Điểm danh bắt buộc gắn với <strong>Class Session</strong>. Hệ thống
            tự động khóa trùng lặp giữa <strong>Sinh viên + Buổi học</strong>.
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button type="button" className="btn-ghost" onClick={() => setIsModalOpen(false)} disabled={saving}>
              Hủy
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Đang lưu...' : editingItem ? 'Lưu thay đổi' : 'Ghi nhận'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xác nhận xóa bản ghi Điểm danh"
        message={`Bạn có chắc muốn xóa bản ghi điểm danh của sinh viên "${deleteTarget?.student_name || deleteTarget?.student}" trong buổi "${deleteTarget?.attendance_session}"?`}
        variant="danger"
        confirmLabel="Xóa bản ghi"
      />
    </Layout>
  )
}
