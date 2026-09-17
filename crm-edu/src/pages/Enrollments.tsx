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
import type { StudentCourseEnrollment, Student, CourseOffering, Course } from '../types/models'
import { Plus, Search, ClipboardList, Edit2, Trash2, Eye } from 'lucide-react'

const ENROLLMENT_FIELDS = [
  'name',
  'enrollment_id',
  'student',
  'student_name',
  'course_offering',
  'course',
  'academic_term',
  'enrollment_date',
  'status',
  'credits',
  'final_grade',
  'grade_point',
  'total_scheduled_sessions',
  'total_present',
  'total_absent',
  'total_late',
  'attendance_rate',
  'absent_rate',
]

const STATUS_LABELS: Record<string, string> = {
  Enrolled: 'Đang học',
  Completed: 'Hoàn thành',
  Dropped: 'Rút môn',
  Withdrawn: 'Thôi học',
  Failed: 'Không đạt',
}

const STATUS_COLORS: Record<string, string> = {
  Enrolled: 'bg-blue-100 text-blue-800',
  Completed: 'bg-green-100 text-green-800',
  Dropped: 'bg-orange-100 text-orange-800',
  Withdrawn: 'bg-gray-100 text-gray-700',
  Failed: 'bg-red-100 text-red-800',
}

const PER_PAGE = 15

type ModalMode = 'add' | 'edit' | 'detail' | null

interface EnrollmentFormData {
  enrollment_id: string
  student: string
  course_offering: string
  enrollment_date: string
  status: 'Enrolled' | 'Completed' | 'Dropped' | 'Withdrawn' | 'Failed'
  final_grade: string
  grade_point: number | ''
}

const EMPTY_FORM: EnrollmentFormData = {
  enrollment_id: '',
  student: '',
  course_offering: '',
  enrollment_date: new Date().toISOString().split('T')[0],
  status: 'Enrolled',
  final_grade: '',
  grade_point: '',
}

export default function Enrollments() {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [offeringFilter, setOfferingFilter] = useState('')
  const [termFilter, setTermFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<StudentCourseEnrollment | null>(null)
  const [form, setForm] = useState<EnrollmentFormData>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof EnrollmentFormData, string>>>({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<StudentCourseEnrollment | null>(null)

  // Lookups
  const [students, setStudents] = useState<Student[]>([])
  const [offerings, setOfferings] = useState<CourseOffering[]>([])
  const [courses, setCourses] = useState<Course[]>([])

  const debouncedSearch = useDebounce(search, 200)

  const { data: enrollments = [], loading, error, lastRefresh, refresh } = useFetch<StudentCourseEnrollment[]>(
    async () =>
      getList<StudentCourseEnrollment>('Student Course Enrollment', {
        fields: ENROLLMENT_FIELDS,
        order_by: 'creation desc',
        limit: 500,
      })
  )

  useEffect(() => {
    Promise.all([
      getList<Student>('Student', { fields: ['name', 'student_name', 'student_id'] }),
      getList<CourseOffering>('Course Offering', { fields: ['name', 'offering_code', 'course', 'academic_term'] }),
      getList<Course>('Course', { fields: ['name', 'course_code', 'credits'] }),
    ])
      .then(([sRes, oRes, cRes]) => {
        setStudents(sRes || [])
        setOfferings(oRes || [])
        setCourses(cRes || [])
      })
      .catch(() => {})
  }, [])

  const academicTerms = Array.from(new Set((enrollments || []).map((e) => e.academic_term).filter(Boolean)))

  const filtered = (enrollments || []).filter((e) => {
    const q = debouncedSearch.toLowerCase()
    const matchQ =
      !q ||
      (e.student_name ?? '').toLowerCase().includes(q) ||
      e.student.toLowerCase().includes(q) ||
      (e.course ?? '').toLowerCase().includes(q) ||
      e.course_offering.toLowerCase().includes(q)
    const matchOffering = !offeringFilter || e.course_offering === offeringFilter
    const matchTerm = !termFilter || e.academic_term === termFilter
    const matchStatus = !statusFilter || e.status === statusFilter
    return matchQ && matchOffering && matchTerm && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paged = filtered.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)

  function openAdd() {
    setForm({
      ...EMPTY_FORM,
      student: students[0]?.name || '',
      course_offering: offerings[0]?.name || '',
    })
    setFormErrors({})
    setSelected(null)
    setModalMode('add')
  }

  function openEdit(e: StudentCourseEnrollment) {
    setForm({
      enrollment_id: e.enrollment_id || '',
      student: e.student,
      course_offering: e.course_offering,
      enrollment_date: e.enrollment_date || '',
      status: e.status,
      final_grade: e.final_grade || '',
      grade_point: e.grade_point ?? '',
    })
    setFormErrors({})
    setSelected(e)
    setModalMode('edit')
  }

  function openDetail(e: StudentCourseEnrollment) {
    setSelected(e)
    setModalMode('detail')
  }

  function closeModal() {
    setModalMode(null)
    setSelected(null)
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof EnrollmentFormData, string>> = {}
    if (!form.student) errs.student = 'Vui lòng chọn sinh viên'
    if (!form.course_offering) errs.course_offering = 'Vui lòng chọn lớp học phần'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      // Find related entities to auto-fill linked data (Rule 22)
      const selectedStudent = students.find((s) => s.name === form.student)
      const selectedOffering = offerings.find((o) => o.name === form.course_offering)
      const selectedCourse = courses.find((c) => c.name === selectedOffering?.course)

      const payload: Partial<StudentCourseEnrollment> = {
        enrollment_id: form.enrollment_id.trim() || undefined,
        student: form.student,
        student_name: selectedStudent?.student_name,
        course_offering: form.course_offering,
        course: selectedOffering?.course,
        academic_term: selectedOffering?.academic_term,
        enrollment_date: form.enrollment_date || undefined,
        status: form.status,
        credits: selectedCourse?.credits,
        final_grade: form.final_grade.trim() || undefined,
        grade_point: form.grade_point !== '' ? Number(form.grade_point) : undefined,
        // Rule 7 & 22: DO NOT allow manual entry for attendance statistics
      }

      if (modalMode === 'add') {
        await createDoc<StudentCourseEnrollment>('Student Course Enrollment', payload)
        toast('Đăng ký học phần thành công!', 'success')
      } else if (modalMode === 'edit' && selected) {
        await updateDoc<StudentCourseEnrollment>('Student Course Enrollment', selected.name, payload)
        toast('Cập nhật thông tin đăng ký thành công!', 'success')
      }
      closeModal()
      refresh()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Lỗi khi lưu dữ liệu', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteDoc('Student Course Enrollment', deleteTarget.name)
      toast(`Đã hủy đăng ký học phần`, 'success')
      setDeleteTarget(null)
      refresh()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Không thể xóa bản ghi đăng ký này', 'error')
    }
  }

  // Look up selected item preview
  const currentOffering = offerings.find((o) => o.name === form.course_offering)

  return (
    <Layout
      title="Đăng ký học phần"
      subtitle="Quản lý việc ghi danh, đăng ký tín chỉ và kết quả học tập của sinh viên"
      actions={
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Đăng ký môn học
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
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Tìm theo sinh viên, môn học, lớp..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
          />
        </div>

        <select
          className="input w-48"
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
          value={termFilter}
          onChange={(e) => {
            setTermFilter(e.target.value)
            setPage(0)
          }}
        >
          <option value="">Tất cả học kỳ</option>
          {academicTerms.map((t) => (
            <option key={t} value={t}>
              {t}
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
          {filtered.length} bản ghi
        </span>
      </div>

      {/* Table */}
      {loading && enrollments.length === 0 ? (
        <TableSkeleton rows={8} cols={8} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Sinh viên</th>
                  <th>Lớp học phần</th>
                  <th>Môn học</th>
                  <th>Học kỳ</th>
                  <th className="text-center">Số TC</th>
                  <th>Trạng thái</th>
                  <th className="text-center">Điểm chữ</th>
                  <th className="text-center">Điểm danh</th>
                  <th className="text-center">Vắng</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((e) => (
                  <tr
                    key={e.name}
                    className="cursor-pointer hover:bg-orange-50/60 transition-colors"
                    onClick={() => openDetail(e)}
                  >
                    <td>
                      <div>
                        <span className="font-semibold text-gray-900 block">{e.student_name || e.student}</span>
                        <span className="font-mono text-[11px] text-gray-400">{e.student}</span>
                      </div>
                    </td>
                    <td className="font-mono text-xs font-semibold text-orange-600">{e.course_offering}</td>
                    <td className="text-gray-800 font-medium">{e.course || '—'}</td>
                    <td className="text-gray-600 text-xs">{e.academic_term || '—'}</td>
                    <td className="text-center font-mono font-bold text-gray-700">{e.credits ?? '—'}</td>
                    <td>
                      <span className={`badge ${STATUS_COLORS[e.status] || 'bg-gray-100'}`}>
                        {STATUS_LABELS[e.status] || e.status}
                      </span>
                    </td>
                    <td className="text-center font-bold font-mono text-xs text-gray-800">
                      {e.final_grade || (e.grade_point != null ? e.grade_point.toFixed(1) : '—')}
                    </td>
                    <td className="text-center">
                      {e.attendance_rate != null ? (
                        <span
                          className={`font-semibold text-xs ${
                            e.attendance_rate < 75
                              ? 'text-red-600 font-bold'
                              : e.attendance_rate < 85
                              ? 'text-yellow-600'
                              : 'text-green-600'
                          }`}
                        >
                          {e.attendance_rate.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="text-center">
                      <span
                        className={`font-mono text-xs ${
                          (e.total_absent ?? 0) >= 3 ? 'text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full' : 'text-gray-600'
                        }`}
                      >
                        {e.total_absent ?? 0}
                      </span>
                    </td>
                    <td className="text-right" onClick={(ev) => ev.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                          onClick={() => openDetail(e)}
                          title="Xem chi tiết"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          onClick={() => openEdit(e)}
                          title="Chỉnh sửa"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          onClick={() => setDeleteTarget(e)}
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
                        <ClipboardList size={36} className="text-gray-300 mb-1" />
                        <p className="font-semibold text-gray-600">Chưa có bản ghi đăng ký học phần nào</p>
                        <p className="text-xs text-gray-400">Bắt đầu bằng cách đăng ký sinh viên vào lớp học phần</p>
                        <button className="btn-primary text-xs mt-2" onClick={openAdd}>
                          + Đăng ký ngay
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
        title={modalMode === 'add' ? 'Đăng ký Học phần' : `Chỉnh sửa Đăng ký: ${selected?.student_name}`}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Sinh viên *</label>
            <select
              className={`input ${formErrors.student ? 'border-red-400' : ''}`}
              value={form.student}
              onChange={(e) => setForm({ ...form, student: e.target.value })}
              required
            >
              <option value="">-- Chọn sinh viên --</option>
              {students.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.student_name} ({s.student_id || s.name})
                </option>
              ))}
            </select>
            {formErrors.student && <p className="text-red-500 text-xs mt-1">{formErrors.student}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Lớp học phần *</label>
            <select
              className={`input ${formErrors.course_offering ? 'border-red-400' : ''}`}
              value={form.course_offering}
              onChange={(e) => setForm({ ...form, course_offering: e.target.value })}
              required
            >
              <option value="">-- Chọn lớp học phần --</option>
              {offerings.map((o) => (
                <option key={o.name} value={o.name}>
                  {o.offering_code} - {o.course} ({o.academic_term})
                </option>
              ))}
            </select>
            {formErrors.course_offering && (
              <p className="text-red-500 text-xs mt-1">{formErrors.course_offering}</p>
            )}
          </div>

          {currentOffering && (
            <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-600 space-y-1">
              <p>
                Môn học: <strong className="text-gray-900">{currentOffering.course}</strong>
              </p>
              <p>
                Học kỳ: <strong className="text-gray-900">{currentOffering.academic_term}</strong>
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Ngày đăng ký</label>
              <input
                type="date"
                className="input"
                value={form.enrollment_date}
                onChange={(e) => setForm({ ...form, enrollment_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Trạng thái đăng ký</label>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Điểm chữ cuối kỳ</label>
              <input
                className="input font-mono"
                placeholder="A / B+ / B / C / D / F"
                value={form.final_grade}
                onChange={(e) => setForm({ ...form, final_grade: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Điểm hệ 4 (Grade Point)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="4"
                className="input font-mono"
                placeholder="4.0"
                value={form.grade_point}
                onChange={(e) => setForm({ ...form, grade_point: e.target.value ? Number(e.target.value) : '' })}
              />
            </div>
          </div>

          {/* Rule 7 & 22 Notice */}
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-900 leading-relaxed">
            ℹ️ <strong>Quy tắc hệ thống:</strong> Các trường thống kê điểm danh (Tổng có mặt, Tổng vắng, Đi trễ, Tỷ lệ
            điểm danh) được tính toán tự động từ Student Attendance và không được nhập tay.
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button type="button" className="btn-ghost" onClick={closeModal} disabled={saving}>
              Hủy
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Đang lưu...' : modalMode === 'add' ? 'Xác nhận đăng ký' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={modalMode === 'detail' && !!selected}
        onClose={closeModal}
        title="Chi tiết Đăng ký học phần"
        size="md"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-4 rounded-xl">
              <div>
                <span className="text-gray-400 block mb-0.5">Sinh viên</span>
                <span className="font-semibold text-gray-900 text-sm">{selected.student_name || selected.student}</span>
                <span className="text-gray-400 block font-mono text-[11px]">{selected.student}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Trạng thái</span>
                <span className={`badge ${STATUS_COLORS[selected.status] || 'bg-gray-100'}`}>
                  {STATUS_LABELS[selected.status] || selected.status}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Lớp học phần</span>
                <span className="font-mono font-bold text-orange-600">{selected.course_offering}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Môn học</span>
                <span className="font-medium text-gray-800">{selected.course || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Học kỳ</span>
                <span className="text-gray-800">{selected.academic_term || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Số Tín chỉ</span>
                <span className="font-bold text-gray-800">{selected.credits ?? '—'} TC</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Điểm cuối kỳ</span>
                <span className="font-bold text-gray-900 text-sm">{selected.final_grade || 'Chưa có'}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Điểm hệ 4</span>
                <span className="font-bold text-gray-900 text-sm">
                  {selected.grade_point != null ? selected.grade_point.toFixed(1) : '—'}
                </span>
              </div>
            </div>

            {/* Attendance stats section */}
            <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-100 space-y-2">
              <h4 className="text-xs font-bold text-orange-950 uppercase tracking-wide">
                Thống kê Điểm danh của Học phần này
              </h4>
              <div className="grid grid-cols-4 gap-2 text-center text-xs pt-1">
                <div className="bg-white p-2.5 rounded-lg border border-orange-100">
                  <span className="text-gray-400 block text-[10px]">Có mặt</span>
                  <span className="font-bold text-green-600 text-sm">{selected.total_present ?? 0}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-orange-100">
                  <span className="text-gray-400 block text-[10px]">Vắng</span>
                  <span className="font-bold text-red-600 text-sm">{selected.total_absent ?? 0}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-orange-100">
                  <span className="text-gray-400 block text-[10px]">Đi trễ</span>
                  <span className="font-bold text-yellow-600 text-sm">{selected.total_late ?? 0}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-orange-100">
                  <span className="text-gray-400 block text-[10px]">Tỷ lệ</span>
                  <span className="font-bold text-orange-600 text-sm">
                    {selected.attendance_rate != null ? `${selected.attendance_rate.toFixed(1)}%` : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button className="btn-ghost text-xs" onClick={closeModal}>
                Đóng
              </button>
              <button
                className="btn-primary text-xs"
                onClick={() => {
                  const e = selected
                  closeModal()
                  setTimeout(() => openEdit(e), 50)
                }}
              >
                Chỉnh sửa
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xác nhận hủy đăng ký học phần"
        message={`Bạn có chắc muốn hủy đăng ký học phần của sinh viên "${deleteTarget?.student_name || deleteTarget?.student}" khỏi lớp "${deleteTarget?.course_offering}"?`}
        variant="danger"
        confirmLabel="Hủy đăng ký"
      />
    </Layout>
  )
}
