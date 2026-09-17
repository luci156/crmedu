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
import type {
  CourseOffering,
  Course,
  AcademicTerm,
  Program,
  ClassSession,
  StudentCourseEnrollment,
} from '../types/models'
import {
  Plus,
  Search,
  Layers,
  Edit2,
  Trash2,
  Eye,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  PlayCircle,
  Sparkles,
} from 'lucide-react'

const OFFERING_FIELDS = [
  'name',
  'offering_code',
  'course',
  'academic_term',
  'program',
  'section',
  'class_name',
  'instructor',
  'room',
  'capacity',
  'total_slots',
  'hours_per_slot',
  'planned_hours',
  'start_date',
  'end_date',
  'status',
  'description',
]

const STATUS_LABELS: Record<string, string> = {
  Planned: 'Kế hoạch',
  Open: 'Đang mở đăng ký',
  'In Progress': 'Đang giảng dạy',
  Completed: 'Đã hoàn thành',
  Cancelled: 'Đã hủy',
}

const STATUS_COLORS: Record<string, string> = {
  Planned: 'bg-gray-100 text-gray-700',
  Open: 'bg-blue-100 text-blue-800 font-semibold',
  'In Progress': 'bg-orange-100 text-orange-800 font-semibold',
  Completed: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
}

const PER_PAGE = 15

type ModalMode = 'add' | 'edit' | 'detail' | 'generate_sessions' | null

interface OfferingFormData {
  offering_code: string
  course: string
  academic_term: string
  program: string
  section: string
  class_name: string
  instructor: string
  room: string
  capacity: number | ''
  total_slots: number
  hours_per_slot: number
  start_date: string
  end_date: string
  status: 'Planned' | 'Open' | 'In Progress' | 'Completed' | 'Cancelled'
  description: string
}

const EMPTY_FORM: OfferingFormData = {
  offering_code: '',
  course: '',
  academic_term: '',
  program: '',
  section: 'A',
  class_name: '',
  instructor: '',
  room: '',
  capacity: 40,
  total_slots: 30, // Rule 1: Total Slots belongs to Course Offering
  hours_per_slot: 2,
  start_date: '',
  end_date: '',
  status: 'Planned',
  description: '',
}

export default function Offerings() {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [termFilter, setTermFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<CourseOffering | null>(null)
  const [detailTab, setDetailTab] = useState<'info' | 'sessions' | 'students'>('info')
  const [form, setForm] = useState<OfferingFormData>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof OfferingFormData, string>>>({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CourseOffering | null>(null)

  // Lookups
  const [courses, setCourses] = useState<Course[]>([])
  const [terms, setTerms] = useState<AcademicTerm[]>([])
  const [programs, setPrograms] = useState<Program[]>([])

  // Detail data
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [enrollments, setEnrollments] = useState<StudentCourseEnrollment[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Session Generator state (Rule 21)
  const [genStartDate, setGenStartDate] = useState(new Date().toISOString().split('T')[0])
  const [genDays, setGenDays] = useState<number[]>([1, 3, 5]) // 1=Mon, 3=Wed, 5=Fri
  const [genSlot, setGenSlot] = useState('Ca 1 (07:30 - 09:30)')
  const [genStartTime, setGenStartTime] = useState('07:30')
  const [genEndTime, setGenEndTime] = useState('09:30')
  const [genRoom, setGenRoom] = useState('')
  const [generating, setGenerating] = useState(false)

  const debouncedSearch = useDebounce(search, 200)

  const { data: offerings = [], loading, error, lastRefresh, refresh } = useFetch<CourseOffering[]>(
    async () =>
      getList<CourseOffering>('Course Offering', {
        fields: OFFERING_FIELDS,
        order_by: 'creation desc',
        limit: 500,
      })
  )

  useEffect(() => {
    Promise.all([
      getList<Course>('Course', { fields: ['name', 'course_name', 'course_code'] }),
      getList<AcademicTerm>('Academic Term', { fields: ['name', 'term_name', 'term_code'] }),
      getList<Program>('Program', { fields: ['name', 'program_name', 'program_code'] }),
    ])
      .then(([cRes, tRes, pRes]) => {
        setCourses(cRes || [])
        setTerms(tRes || [])
        setPrograms(pRes || [])
      })
      .catch(() => {})
  }, [])

  const filtered = (offerings || []).filter((o) => {
    const q = debouncedSearch.toLowerCase()
    const matchQ =
      !q ||
      o.offering_code.toLowerCase().includes(q) ||
      (o.class_name ?? '').toLowerCase().includes(q) ||
      o.course.toLowerCase().includes(q) ||
      (o.instructor ?? '').toLowerCase().includes(q)
    const matchCourse = !courseFilter || o.course === courseFilter
    const matchTerm = !termFilter || o.academic_term === termFilter
    const matchStatus = !statusFilter || o.status === statusFilter
    return matchQ && matchCourse && matchTerm && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paged = filtered.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)

  // Auto-calculated planned_hours
  const calculatedPlannedHours = Number(form.total_slots || 0) * Number(form.hours_per_slot || 0)

  function openAdd() {
    setForm({
      ...EMPTY_FORM,
      course: courses[0]?.name || '',
      academic_term: terms[0]?.name || '',
      program: programs[0]?.name || '',
    })
    setFormErrors({})
    setSelected(null)
    setModalMode('add')
  }

  function openEdit(o: CourseOffering) {
    setForm({
      offering_code: o.offering_code,
      course: o.course,
      academic_term: o.academic_term,
      program: o.program || '',
      section: o.section || 'A',
      class_name: o.class_name || '',
      instructor: o.instructor || '',
      room: o.room || '',
      capacity: o.capacity ?? 40,
      total_slots: o.total_slots || 30,
      hours_per_slot: o.hours_per_slot || 2,
      start_date: o.start_date || '',
      end_date: o.end_date || '',
      status: o.status || 'Planned',
      description: o.description ?? '',
    })
    setFormErrors({})
    setSelected(o)
    setModalMode('edit')
  }

  async function openDetail(o: CourseOffering) {
    setSelected(o)
    setDetailTab('info')
    setModalMode('detail')
    setLoadingDetail(true)
    try {
      const [sesRes, enrRes] = await Promise.all([
        getList<ClassSession>('Class Session', {
          fields: ['name', 'session_no', 'session_date', 'start_time', 'end_time', 'slot', 'room', 'status', 'topic'],
          filters: [['course_offering', '=', o.name, undefined as any]],
          order_by: 'session_no asc',
          limit: 100,
        }),
        getList<StudentCourseEnrollment>('Student Course Enrollment', {
          fields: ['name', 'student', 'student_name', 'status', 'credits', 'attendance_rate', 'total_absent'],
          filters: [['course_offering', '=', o.name, undefined as any]],
          limit: 200,
        }),
      ])
      setSessions(sesRes || [])
      setEnrollments(enrRes || [])
    } catch {
      setSessions([])
      setEnrollments([])
    } finally {
      setLoadingDetail(false)
    }
  }

  function closeModal() {
    setModalMode(null)
    setSelected(null)
    setSessions([])
    setEnrollments([])
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof OfferingFormData, string>> = {}
    if (!form.offering_code.trim()) errs.offering_code = 'Mã lớp học phần không được để trống'
    if (!form.course) errs.course = 'Vui lòng chọn môn học'
    if (!form.academic_term) errs.academic_term = 'Vui lòng chọn học kỳ'
    if (!form.total_slots || form.total_slots <= 0) errs.total_slots = 'Tổng số buổi phải lớn hơn 0'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const payload: Partial<CourseOffering> = {
        offering_code: form.offering_code.trim(),
        course: form.course,
        academic_term: form.academic_term,
        program: form.program || undefined,
        section: form.section.trim() || undefined,
        class_name: form.class_name.trim() || undefined,
        instructor: form.instructor.trim() || undefined,
        room: form.room.trim() || undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        total_slots: Number(form.total_slots),
        hours_per_slot: Number(form.hours_per_slot),
        planned_hours: calculatedPlannedHours, // Rule 19: Planned Hours = Total Slots * Hours Per Slot
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        status: form.status,
        description: form.description.trim() || undefined,
      }
      if (modalMode === 'add') {
        await createDoc<CourseOffering>('Course Offering', payload)
        toast('Tạo lớp học phần mới thành công!', 'success')
      } else if (modalMode === 'edit' && selected) {
        await updateDoc<CourseOffering>('Course Offering', selected.name, payload)
        toast('Cập nhật thông tin lớp học phần thành công!', 'success')
      }
      closeModal()
      refresh()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Lỗi khi lưu dữ liệu', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteDoc('Course Offering', deleteTarget.name)
      toast(`Đã xóa lớp học phần "${deleteTarget.offering_code}"`, 'success')
      setDeleteTarget(null)
      refresh()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Không thể xóa lớp học phần này', 'error')
    }
  }

  // ── Session Generator (Rule 21) ──────────────────────────────────────────
  async function handleGenerateSessions(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    if (!genStartDate) {
      toast('Vui lòng chọn ngày bắt đầu chu kỳ.', 'error')
      return
    }
    if (genDays.length === 0) {
      toast('Vui lòng chọn ít nhất một thứ trong tuần.', 'error')
      return
    }

    setGenerating(true)
    const targetSlots = selected.total_slots || 30
    let createdCount = 0
    let currentDate = new Date(genStartDate)

    try {
      while (createdCount < targetSlots) {
        const dayOfWeek = currentDate.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
        if (genDays.includes(dayOfWeek)) {
          const sessionNo = createdCount + 1
          const dateStr = currentDate.toISOString().split('T')[0]
          await createDoc<ClassSession>('Class Session', {
            course_offering: selected.name,
            session_no: sessionNo,
            session_date: dateStr,
            start_time: genStartTime,
            end_time: genEndTime,
            slot: genSlot,
            room: genRoom || selected.room,
            instructor: selected.instructor,
            status: 'Scheduled',
            topic: `Buổi ${sessionNo}`,
          })
          createdCount++
        }
        // Advance by 1 day
        currentDate.setDate(currentDate.getDate() + 1)
      }

      toast(`Đã tạo thành công toàn bộ ${createdCount} buổi học!`, 'success')
      setModalMode('detail')
      // Refresh sessions
      const newSessions = await getList<ClassSession>('Class Session', {
        fields: ['name', 'session_no', 'session_date', 'start_time', 'end_time', 'slot', 'room', 'status', 'topic'],
        filters: [['course_offering', '=', selected.name, undefined as any]],
        order_by: 'session_no asc',
      })
      setSessions(newSessions || [])
      setDetailTab('sessions')
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Lỗi khi tạo buổi học tự động', 'error')
    } finally {
      setGenerating(false)
    }
  }

  // Stats computed from real ClassSession records (Rule 21)
  const completedSessionsCount = sessions.filter((s) => s.status === 'Completed').length
  const upcomingSessionsCount = sessions.filter((s) => s.status === 'Scheduled').length
  const cancelledSessionsCount = sessions.filter((s) => s.status === 'Cancelled').length

  return (
    <Layout
      title="Lớp học phần"
      subtitle="Quản lý thời khóa biểu lớp học phần, tổng số buổi và buổi học chi tiết"
      actions={
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Mở lớp học phần
        </button>
      }
    >
      <AutoRefresh onRefresh={refresh} skip={loading} />

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={refresh} className="underline text-xs font-semibold">Thử lại</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="card mb-5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Tìm mã lớp, môn học, giảng viên..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
          />
        </div>

        <select
          className="input w-44"
          value={courseFilter}
          onChange={(e) => {
            setCourseFilter(e.target.value)
            setPage(0)
          }}
        >
          <option value="">Tất cả môn học</option>
          {courses.map((c) => (
            <option key={c.name} value={c.name}>
              {c.course_code} - {c.course_name}
            </option>
          ))}
        </select>

        <select
          className="input w-40"
          value={termFilter}
          onChange={(e) => {
            setTermFilter(e.target.value)
            setPage(0)
          }}
        >
          <option value="">Tất cả học kỳ</option>
          {terms.map((t) => (
            <option key={t.name} value={t.name}>
              {t.term_name}
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
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>

        <span className="text-xs text-gray-500 font-medium px-2 py-1 bg-gray-100 rounded-lg">
          {filtered.length} lớp học phần
        </span>
      </div>

      {/* Table */}
      {loading && offerings.length === 0 ? (
        <TableSkeleton rows={6} cols={8} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Mã Lớp</th>
                  <th>Môn học</th>
                  <th>Học kỳ</th>
                  <th>Nhóm</th>
                  <th>Giảng viên</th>
                  <th>Phòng</th>
                  <th className="text-center">Tổng buổi</th>
                  <th className="text-center">Số giờ</th>
                  <th>Trạng thái</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((o) => (
                  <tr
                    key={o.name}
                    className="cursor-pointer hover:bg-orange-50/60 transition-colors"
                    onClick={() => openDetail(o)}
                  >
                    <td className="font-mono text-xs font-semibold text-orange-600">{o.offering_code}</td>
                    <td className="font-semibold text-gray-900">{o.course}</td>
                    <td className="text-gray-600">{o.academic_term}</td>
                    <td className="font-medium text-gray-800">{o.section || '—'}</td>
                    <td className="text-gray-600">{o.instructor || 'Chưa phân công'}</td>
                    <td className="font-mono text-xs text-gray-600">{o.room || '—'}</td>
                    <td className="text-center font-bold text-gray-800 font-mono">{o.total_slots}</td>
                    <td className="text-center font-mono text-gray-600">
                      {o.planned_hours ? `${o.planned_hours}h` : `${(o.total_slots || 0) * (o.hours_per_slot || 2)}h`}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABELS[o.status] || o.status}
                      </span>
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                          onClick={() => openDetail(o)}
                          title="Xem chi tiết & Buổi học"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          onClick={() => openEdit(o)}
                          title="Chỉnh sửa"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          onClick={() => setDeleteTarget(o)}
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
                    <td colSpan={10} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Layers size={36} className="text-gray-300 mb-1" />
                        <p className="font-semibold text-gray-600">Chưa có lớp học phần nào</p>
                        <p className="text-xs text-gray-400">Bắt đầu bằng cách tạo lớp học phần đầu tiên</p>
                        <button className="btn-primary text-xs mt-2" onClick={openAdd}>
                          + Mở lớp học phần ngay
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

      {/* Add / Edit Modal */}
      <Modal
        open={modalMode === 'add' || modalMode === 'edit'}
        onClose={closeModal}
        title={modalMode === 'add' ? 'Mở Lớp học phần mới' : `Chỉnh sửa: ${selected?.offering_code}`}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Mã Lớp học phần *</label>
              <input
                className={`input ${formErrors.offering_code ? 'border-red-400' : ''}`}
                value={form.offering_code}
                onChange={(e) => setForm({ ...form, offering_code: e.target.value })}
                placeholder="VD: CS101-2026S1-A"
                required
              />
              {formErrors.offering_code && (
                <p className="text-red-500 text-xs mt-1">{formErrors.offering_code}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tên lớp học</label>
              <input
                className="input"
                value={form.class_name}
                onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                placeholder="VD: Nhập môn lập trình - Nhóm 1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Môn học *</label>
              <select
                className={`input ${formErrors.course ? 'border-red-400' : ''}`}
                value={form.course}
                onChange={(e) => setForm({ ...form, course: e.target.value })}
                required
              >
                <option value="">-- Chọn môn học --</option>
                {courses.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.course_code} - {c.course_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Học kỳ *</label>
              <select
                className={`input ${formErrors.academic_term ? 'border-red-400' : ''}`}
                value={form.academic_term}
                onChange={(e) => setForm({ ...form, academic_term: e.target.value })}
                required
              >
                <option value="">-- Chọn học kỳ --</option>
                {terms.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.term_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nhóm / Lớp</label>
              <input
                className="input"
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value })}
                placeholder="A / B / C"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Giảng viên phụ trách</label>
              <input
                className="input"
                value={form.instructor}
                onChange={(e) => setForm({ ...form, instructor: e.target.value })}
                placeholder="ThS. Nguyễn Văn C"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phòng học</label>
              <input
                className="input"
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
                placeholder="A2-301"
              />
            </div>
          </div>

          {/* Business Rule 1 & 19: Total Slots & Planned Hours */}
          <div className="p-4 bg-orange-50/70 border border-orange-200 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-orange-900 uppercase tracking-wide">
              Cấu hình Thời lượng Buổi học (Business Rule 1)
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-orange-950 mb-1">
                  Tổng số buổi (Total Slots) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  className="input font-bold text-orange-700"
                  value={form.total_slots}
                  onChange={(e) => setForm({ ...form, total_slots: Number(e.target.value) })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-orange-950 mb-1">Số giờ / Buổi *</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="8"
                  className="input"
                  value={form.hours_per_slot}
                  onChange={(e) => setForm({ ...form, hours_per_slot: Number(e.target.value) })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-orange-950 mb-1">
                  Tổng giờ kế hoạch (Tự động tính)
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  className="input bg-white/70 font-mono font-bold text-orange-700 cursor-not-allowed"
                  value={`${calculatedPlannedHours} giờ`}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Sức chứa (SV)</label>
              <input
                type="number"
                min="10"
                max="300"
                className="input"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value ? Number(e.target.value) : '' })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Ngày bắt đầu</label>
              <input
                type="date"
                className="input"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Ngày kết thúc</label>
              <input
                type="date"
                className="input"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Trạng thái lớp</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as any })}
            >
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Mô tả / Ghi chú</label>
            <textarea
              className="input resize-none"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Yêu cầu phòng máy, phần mềm..."
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button type="button" className="btn-ghost" onClick={closeModal} disabled={saving}>
              Hủy
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Đang lưu...' : modalMode === 'add' ? 'Mở lớp' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal (Requirement 29) */}
      <Modal
        open={modalMode === 'detail' && !!selected}
        onClose={closeModal}
        title={`Chi tiết Lớp học phần: ${selected?.offering_code}`}
        size="xl"
      >
        {selected && (
          <div className="space-y-5">
            {/* Header info banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-orange-500 to-primary-600 rounded-2xl text-white shadow-sm">
              <div>
                <h3 className="text-xl font-bold">{selected.offering_code}</h3>
                <p className="text-orange-100 text-xs mt-1">
                  Môn học: <strong className="text-white">{selected.course}</strong> • Học kỳ:{' '}
                  <strong className="text-white">{selected.academic_term}</strong> • Nhóm:{' '}
                  <strong className="text-white">{selected.section || 'A'}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="badge py-1 px-3 bg-white text-orange-600 text-xs font-semibold">
                  {STATUS_LABELS[selected.status] || selected.status}
                </span>
                <button
                  onClick={() => setModalMode('generate_sessions')}
                  className="bg-orange-700 hover:bg-orange-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Sparkles size={14} /> Tạo buổi học
                </button>
              </div>
            </div>

            {/* KPI row computed from actual Class Sessions (Rule 21 & 29) */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              <div className="bg-gray-50 p-3 rounded-xl text-center">
                <span className="text-[11px] text-gray-400 block mb-1">Tổng số buổi</span>
                <span className="text-base font-bold text-gray-800">{selected.total_slots}</span>
              </div>
              <div className="bg-green-50 p-3 rounded-xl text-center">
                <span className="text-[11px] text-green-700 block mb-1">Đã học</span>
                <span className="text-base font-bold text-green-700">{completedSessionsCount}</span>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl text-center">
                <span className="text-[11px] text-blue-700 block mb-1">Sắp tới</span>
                <span className="text-base font-bold text-blue-700">{upcomingSessionsCount}</span>
              </div>
              <div className="bg-red-50 p-3 rounded-xl text-center">
                <span className="text-[11px] text-red-700 block mb-1">Đã hủy</span>
                <span className="text-base font-bold text-red-700">{cancelledSessionsCount}</span>
              </div>
              <div className="bg-purple-50 p-3 rounded-xl text-center">
                <span className="text-[11px] text-purple-700 block mb-1">Sinh viên</span>
                <span className="text-base font-bold text-purple-700">{enrollments.length}</span>
              </div>
              <div className="bg-orange-50 p-3 rounded-xl text-center">
                <span className="text-[11px] text-orange-700 block mb-1">Tổng kế hoạch</span>
                <span className="text-base font-bold text-orange-700">
                  {selected.planned_hours || (selected.total_slots || 0) * (selected.hours_per_slot || 2)}h
                </span>
              </div>
            </div>

            {/* Detail tabs */}
            <div className="flex border-b border-gray-200 gap-6 text-xs font-semibold">
              {[
                { id: 'info', label: 'Thông tin chung' },
                { id: 'sessions', label: `Buổi học thực tế (${sessions.length})` },
                { id: 'students', label: `Danh sách sinh viên (${enrollments.length})` },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setDetailTab(t.id as any)}
                  className={`pb-3 transition-colors border-b-2 ${
                    detailTab === t.id
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab 1: General Info */}
            {detailTab === 'info' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs bg-gray-50 p-5 rounded-2xl">
                <div>
                  <span className="text-gray-400 block mb-1">Giảng viên</span>
                  <span className="font-semibold text-gray-800">{selected.instructor || 'Chưa phân công'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-1">Phòng học</span>
                  <span className="font-mono text-gray-800">{selected.room || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-1">Sức chứa tối đa</span>
                  <span className="font-bold text-gray-800">{selected.capacity ? `${selected.capacity} SV` : '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-1">Ngày bắt đầu</span>
                  <span className="font-mono text-gray-800">{selected.start_date || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-1">Ngày kết thúc</span>
                  <span className="font-mono text-gray-800">{selected.end_date || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-1">Đã tạo buổi học</span>
                  <span className="font-semibold text-orange-600">
                    {sessions.length} / {selected.total_slots} buổi
                  </span>
                </div>
                {selected.description && (
                  <div className="col-span-2 sm:col-span-3 pt-2 border-t border-gray-200">
                    <span className="text-gray-400 block mb-1">Mô tả</span>
                    <span className="text-gray-700">{selected.description}</span>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Class Sessions list (Rule 2) */}
            {detailTab === 'sessions' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">
                    Nguồn dữ liệu thực tế về buổi học đã lên lịch:
                  </span>
                  <button
                    onClick={() => setModalMode('generate_sessions')}
                    className="btn-ghost py-1 px-2.5 text-xs text-orange-600 hover:bg-orange-50"
                  >
                    <Sparkles size={13} /> Tạo tự động {selected.total_slots} buổi
                  </button>
                </div>

                {loadingDetail ? (
                  <p className="text-xs text-gray-400 p-4 text-center">Đang tải danh sách buổi học...</p>
                ) : sessions.length > 0 ? (
                  <div className="border border-gray-100 rounded-xl overflow-hidden text-xs max-h-80 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 text-gray-600 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3 text-center">Buổi #</th>
                          <th className="py-2.5 px-3">Ngày học</th>
                          <th className="py-2.5 px-3">Thời gian</th>
                          <th className="py-2.5 px-3">Ca / Phòng</th>
                          <th className="py-2.5 px-3">Chủ đề</th>
                          <th className="py-2.5 px-3 text-center">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.map((s) => (
                          <tr key={s.name} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="py-2 px-3 text-center font-mono font-bold text-orange-600">
                              {s.session_no}
                            </td>
                            <td className="py-2 px-3 font-mono text-gray-700">{s.session_date}</td>
                            <td className="py-2 px-3 text-gray-600">
                              {s.start_time && s.end_time ? `${s.start_time} - ${s.end_time}` : '—'}
                            </td>
                            <td className="py-2 px-3 text-gray-600 font-mono">
                              {s.slot || s.room ? `${s.slot || ''} (${s.room || ''})` : '—'}
                            </td>
                            <td className="py-2 px-3 text-gray-800">{s.topic || `Buổi ${s.session_no}`}</td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`badge text-[10px] ${
                                  s.status === 'Completed'
                                    ? 'bg-green-100 text-green-800'
                                    : s.status === 'Scheduled'
                                    ? 'bg-blue-100 text-blue-800'
                                    : s.status === 'Cancelled'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {s.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-gray-50 rounded-2xl text-xs text-gray-400 space-y-2">
                    <Calendar size={32} className="mx-auto text-gray-300" />
                    <p className="font-semibold text-gray-600">Chưa có buổi học nào được tạo</p>
                    <p className="text-[11px]">Nhấn "Tạo buổi học" để tự động sinh {selected.total_slots} buổi học</p>
                    <button
                      onClick={() => setModalMode('generate_sessions')}
                      className="btn-primary text-xs mt-2"
                    >
                      <Sparkles size={14} /> Tạo ngay {selected.total_slots} buổi học
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Enrolled Students */}
            {detailTab === 'students' && (
              <div>
                {loadingDetail ? (
                  <p className="text-xs text-gray-400 p-4 text-center">Đang tải danh sách sinh viên...</p>
                ) : enrollments.length > 0 ? (
                  <div className="border border-gray-100 rounded-xl overflow-hidden text-xs">
                    <table className="w-full">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="py-2.5 px-3">Mã SV</th>
                          <th className="py-2.5 px-3">Họ và Tên</th>
                          <th className="py-2.5 px-3 text-center">Tín chỉ</th>
                          <th className="py-2.5 px-3 text-center">Điểm danh</th>
                          <th className="py-2.5 px-3 text-center">Vắng</th>
                          <th className="py-2.5 px-3">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrollments.map((enr) => (
                          <tr key={enr.name} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="py-2 px-3 font-mono font-semibold text-orange-600">{enr.student}</td>
                            <td className="py-2 px-3 font-semibold text-gray-900">
                              {enr.student_name || enr.student}
                            </td>
                            <td className="py-2 px-3 text-center font-mono">{enr.credits ?? '—'}</td>
                            <td className="py-2 px-3 text-center">
                              {enr.attendance_rate != null ? `${enr.attendance_rate.toFixed(1)}%` : '—'}
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-red-600 font-bold">
                              {enr.total_absent ?? 0}
                            </td>
                            <td className="py-2 px-3">
                              <span className="badge bg-blue-50 text-blue-700 text-[10px]">{enr.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-gray-50 rounded-2xl text-xs text-gray-400">
                    Chưa có sinh viên nào đăng ký vào lớp học phần này.
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button className="btn-ghost text-xs" onClick={closeModal}>
                Đóng
              </button>
              <button
                className="btn-primary text-xs"
                onClick={() => {
                  const o = selected
                  closeModal()
                  setTimeout(() => openEdit(o), 50)
                }}
              >
                Chỉnh sửa lớp
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Session Generator Modal (Rule 21) */}
      <Modal
        open={modalMode === 'generate_sessions' && !!selected}
        onClose={() => setModalMode('detail')}
        title={`Tạo Buổi học Tự động: ${selected?.offering_code}`}
        size="md"
      >
        <form onSubmit={handleGenerateSessions} className="space-y-4">
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-900 leading-relaxed">
            Hệ thống sẽ tự động tạo đúng <strong>{selected?.total_slots} buổi học</strong> (tương ứng với Total
            Slots của lớp) bắt đầu từ ngày được chọn theo các thứ trong tuần.
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Ngày bắt đầu buổi 1 *</label>
            <input
              type="date"
              className="input"
              value={genStartDate}
              onChange={(e) => setGenStartDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Các thứ trong tuần lặp lại *
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { day: 1, label: 'Thứ 2' },
                { day: 2, label: 'Thứ 3' },
                { day: 3, label: 'Thứ 4' },
                { day: 4, label: 'Thứ 5' },
                { day: 5, label: 'Thứ 6' },
                { day: 6, label: 'Thứ 7' },
              ].map(({ day, label }) => (
                <button
                  type="button"
                  key={day}
                  onClick={() => {
                    if (genDays.includes(day)) {
                      setGenDays(genDays.filter((d) => d !== day))
                    } else {
                      setGenDays([...genDays, day])
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    genDays.includes(day)
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Giờ bắt đầu</label>
              <input
                type="time"
                className="input"
                value={genStartTime}
                onChange={(e) => setGenStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Giờ kết thúc</label>
              <input
                type="time"
                className="input"
                value={genEndTime}
                onChange={(e) => setGenEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Ca học</label>
              <input
                className="input"
                value={genSlot}
                onChange={(e) => setGenSlot(e.target.value)}
                placeholder="Ca 1 / Sáng"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phòng học mặc định</label>
              <input
                className="input"
                value={genRoom}
                onChange={(e) => setGenRoom(e.target.value)}
                placeholder={selected?.room || 'A2-301'}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setModalMode('detail')}
              disabled={generating}
            >
              Quay lại
            </button>
            <button type="submit" className="btn-primary" disabled={generating}>
              {generating ? (
                <>
                  <span className="animate-spin inline-block mr-1">⏳</span>
                  Đang tạo {selected?.total_slots} buổi...
                </>
              ) : (
                <>
                  <Sparkles size={14} /> Tạo {selected?.total_slots} buổi học
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xác nhận xóa Lớp học phần"
        message={`Bạn có chắc muốn xóa lớp học phần "${deleteTarget?.offering_code}"? Toàn bộ buổi học và dữ liệu đăng ký liên quan sẽ bị ảnh hưởng.`}
        variant="danger"
        confirmLabel="Xóa Lớp học phần"
      />
    </Layout>
  )
}
