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
import type { Student, Department, Program, AcademicTerm, StudentCourseEnrollment, StudentAttendance } from '../types/models'
import {
  Plus,
  Search,
  Users,
  Edit2,
  Trash2,
  Eye,
  GraduationCap,
  Calendar,
  Phone,
  Mail,
  MapPin,
  CheckSquare,
  BookOpen,
  Award,
  AlertTriangle,
} from 'lucide-react'

const STUDENT_FIELDS = [
  'name',
  'student_id',
  'student_name',
  'date_of_birth',
  'gender',
  'email',
  'phone',
  'address',
  'department',
  'program',
  'admission_term',
  'enrollment_date',
  'expected_graduation_date',
  'advisor',
  'student_status',
  'notes',
  'registered_credits',
  'completed_credits',
  'gpa',
  'attendance_rate',
  'total_absent',
]

const STATUS_COLOR: Record<string, string> = {
  Active: 'bg-green-100 text-green-800',
  Inactive: 'bg-gray-100 text-gray-700',
  Suspended: 'bg-red-100 text-red-700',
  Graduated: 'bg-blue-100 text-blue-700',
  Withdrawn: 'bg-orange-100 text-orange-700',
  'On Leave': 'bg-yellow-100 text-yellow-700',
}

const STATUS_LABEL: Record<string, string> = {
  Active: 'Đang học',
  Inactive: 'Không hoạt động',
  Suspended: 'Đình chỉ',
  Graduated: 'Tốt nghiệp',
  Withdrawn: 'Thôi học',
  'On Leave': 'Nghỉ phép',
}

const GENDER_LABEL: Record<string, string> = {
  Male: 'Nam',
  Female: 'Nữ',
  Other: 'Khác',
}

const PER_PAGE = 15

type ModalMode = 'add' | 'edit' | 'detail' | null

interface StudentFormData {
  student_id: string
  student_name: string
  date_of_birth: string
  gender: 'Male' | 'Female' | 'Other'
  email: string
  phone: string
  address: string
  department: string
  program: string
  admission_term: string
  enrollment_date: string
  expected_graduation_date: string
  advisor: string
  student_status: 'Active' | 'Inactive' | 'Suspended' | 'Graduated' | 'Withdrawn' | 'On Leave'
  notes: string
}

const EMPTY_FORM: StudentFormData = {
  student_id: '',
  student_name: '',
  date_of_birth: '',
  gender: 'Male',
  email: '',
  phone: '',
  address: '',
  department: '',
  program: '',
  admission_term: '',
  enrollment_date: new Date().toISOString().split('T')[0],
  expected_graduation_date: '',
  advisor: '',
  student_status: 'Active',
  notes: '',
}

export default function StudentList() {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [programFilter, setProgramFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [termFilter, setTermFilter] = useState('')
  const [page, setPage] = useState(0)

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<Student | null>(null)
  const [detailTab, setDetailTab] = useState<'info' | 'academic' | 'attendance' | 'overview'>('info')
  const [form, setForm] = useState<StudentFormData>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof StudentFormData, string>>>({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null)

  // Master lookup data
  const [departments, setDepartments] = useState<Department[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [terms, setTerms] = useState<AcademicTerm[]>([])

  // Student detail related records
  const [enrollments, setEnrollments] = useState<StudentCourseEnrollment[]>([])
  const [attendances, setAttendances] = useState<StudentAttendance[]>([])
  const [loadingDetailData, setLoadingDetailData] = useState(false)

  const debouncedSearch = useDebounce(search, 200)

  // Fetch Students list
  const { data: students = [], loading, error, lastRefresh, refresh } = useFetch<Student[]>(
    async () =>
      getList<Student>('Student', {
        fields: ['*'],
        order_by: 'creation desc',
        limit: 500,
      })
  )

  // Load lookup options
  useEffect(() => {
    Promise.all([
      getList<Department>('Department', { fields: ['name', 'department_name', 'department_code'] }),
      getList<Program>('Program', { fields: ['name', 'program_name', 'program_code', 'department'] }),
      getList<AcademicTerm>('Academic Term', { fields: ['name', 'term_name', 'term_code'] }),
    ])
      .then(([deptRes, progRes, termRes]) => {
        setDepartments(deptRes || [])
        setPrograms(progRes || [])
        setTerms(termRes || [])
      })
      .catch(() => {})
  }, [])

  const filtered = (students || []).filter((s) => {
    const q = debouncedSearch.toLowerCase()
    const matchQ =
      !q ||
      s.student_name.toLowerCase().includes(q) ||
      (s.student_id ?? '').toLowerCase().includes(q) ||
      (s.email ?? '').toLowerCase().includes(q)
    const matchDept = !deptFilter || s.department === deptFilter
    const matchProg = !programFilter || s.program === programFilter
    const matchStatus = !statusFilter || s.student_status === statusFilter
    const matchTerm = !termFilter || s.admission_term === termFilter
    return matchQ && matchDept && matchProg && matchStatus && matchTerm
  })

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paged = filtered.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)

  // KPIs
  const totalStudents = students?.length || 0
  const activeCount = (students || []).filter((s) => s.student_status === 'Active').length
  const riskCount = (students || []).filter(
    (s) => (s.attendance_rate != null && s.attendance_rate < 75) || (s.total_absent ?? 0) >= 3
  ).length

  function openAdd() {
    setForm({
      ...EMPTY_FORM,
      department: departments[0]?.name || '',
      program: programs[0]?.name || '',
      admission_term: terms[0]?.name || '',
    })
    setFormErrors({})
    setSelected(null)
    setModalMode('add')
  }

  function openEdit(s: Student) {
    setForm({
      student_id: s.student_id || '',
      student_name: s.student_name,
      date_of_birth: s.date_of_birth || '',
      gender: (s.gender as any) || 'Male',
      email: s.email || '',
      phone: s.phone || '',
      address: s.address || '',
      department: s.department || '',
      program: s.program || '',
      admission_term: s.admission_term || '',
      enrollment_date: s.enrollment_date || '',
      expected_graduation_date: s.expected_graduation_date || '',
      advisor: s.advisor || '',
      student_status: s.student_status || 'Active',
      notes: s.notes || '',
    })
    setFormErrors({})
    setSelected(s)
    setModalMode('edit')
  }

  async function openDetail(s: Student) {
    setSelected(s)
    setDetailTab('info')
    setModalMode('detail')
    setLoadingDetailData(true)
    try {
      const [enrList, attList] = await Promise.all([
        getList<StudentCourseEnrollment>('Student Course Enrollment', {
          fields: [
            'name',
            'course_offering',
            'course',
            'academic_term',
            'status',
            'credits',
            'final_grade',
            'attendance_rate',
            'total_absent',
          ],
          filters: [['student', '=', s.name] as [string, string, string]],
        }),
        getList<StudentAttendance>('Student Attendance', {
          fields: ['name', 'attendance_session', 'course_offering', 'session_date', 'session_no', 'status', 'attendance_type'],
          filters: [['student', '=', s.name] as [string, string, string]],
          order_by: 'session_date desc',
          limit: 100,
        }),
      ])
      setEnrollments(enrList || [])
      setAttendances(attList || [])
    } catch {
      setEnrollments([])
      setAttendances([])
    } finally {
      setLoadingDetailData(false)
    }
  }

  function closeModal() {
    setModalMode(null)
    setSelected(null)
    setEnrollments([])
    setAttendances([])
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof StudentFormData, string>> = {}
    if (!form.student_id.trim()) errs.student_id = 'Mã sinh viên không được để trống'
    if (!form.student_name.trim()) errs.student_name = 'Họ tên sinh viên không được để trống'
    if (!form.department) errs.department = 'Vui lòng chọn Khoa'
    if (!form.program) errs.program = 'Vui lòng chọn Ngành học'
    if (!form.admission_term) errs.admission_term = 'Vui lòng chọn Học kỳ nhập học'
    if (!form.student_status) errs.student_status = 'Vui lòng chọn Trạng thái'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const payload: Partial<Student> = {
        student_id: form.student_id.trim(),
        student_name: form.student_name.trim(),
        date_of_birth: form.date_of_birth || undefined,
        gender: form.gender,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        department: form.department,
        program: form.program,
        admission_term: form.admission_term,
        enrollment_date: form.enrollment_date || undefined,
        expected_graduation_date: form.expected_graduation_date || undefined,
        advisor: form.advisor.trim() || undefined,
        student_status: form.student_status,
        notes: form.notes.trim() || undefined,
      }
      if (modalMode === 'add') {
        await createDoc<Student>('Student', payload)
        toast('Thêm sinh viên mới thành công!', 'success')
      } else if (modalMode === 'edit' && selected) {
        await updateDoc<Student>('Student', selected.name, payload)
        toast('Cập nhật hồ sơ sinh viên thành công!', 'success')
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
      await deleteDoc('Student', deleteTarget.name)
      toast(`Đã xóa sinh viên "${deleteTarget.student_name}"`, 'success')
      setDeleteTarget(null)
      refresh()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Không thể xóa sinh viên này', 'error')
    }
  }

  return (
    <Layout
      title="Sinh viên"
      subtitle="Quản lý hồ sơ, tình trạng học tập và theo dõi điểm danh sinh viên"
      actions={
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Thêm sinh viên
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

      {/* Mini KPI banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Tổng sinh viên</p>
            <p className="text-xl font-bold text-gray-900">{totalStudents}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center font-bold">
            <GraduationCap size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Đang học</p>
            <p className="text-xl font-bold text-green-700">{activeCount}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Cảnh báo điểm danh</p>
            <p className="text-xl font-bold text-red-600">{riskCount}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <Award size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Đã tốt nghiệp</p>
            <p className="text-xl font-bold text-blue-700">
              {(students || []).filter((s) => s.student_status === 'Graduated').length}
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card mb-5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Tìm theo tên, MSSV, email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
          />
        </div>

        <select
          className="input w-40"
          value={deptFilter}
          onChange={(e) => {
            setDeptFilter(e.target.value)
            setPage(0)
          }}
        >
          <option value="">Tất cả khoa</option>
          {departments.map((d) => (
            <option key={d.name} value={d.name}>
              {d.department_name}
            </option>
          ))}
        </select>

        <select
          className="input w-40"
          value={programFilter}
          onChange={(e) => {
            setProgramFilter(e.target.value)
            setPage(0)
          }}
        >
          <option value="">Tất cả ngành</option>
          {programs.map((p) => (
            <option key={p.name} value={p.name}>
              {p.program_name}
            </option>
          ))}
        </select>

        <select
          className="input w-36"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(0)
          }}
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>

        <select
          className="input w-36"
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

        <span className="text-xs text-gray-500 font-medium px-2 py-1 bg-gray-100 rounded-lg">
          {filtered.length} sinh viên
        </span>
      </div>

      {/* Table */}
      {loading && students.length === 0 ? (
        <TableSkeleton rows={8} cols={8} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Mã SV</th>
                  <th>Họ và Tên</th>
                  <th>Khoa / Ngành</th>
                  <th>Trạng thái</th>
                  <th className="text-center">Điểm danh</th>
                  <th className="text-center">Số buổi vắng</th>
                  <th className="text-center">GPA</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((s) => (
                  <tr
                    key={s.name}
                    className="cursor-pointer hover:bg-orange-50/60 transition-colors"
                    onClick={() => openDetail(s)}
                  >
                    <td className="font-mono text-xs font-semibold text-orange-600">{s.student_id || s.name}</td>
                    <td>
                      <div>
                        <span className="font-semibold text-gray-900 block">{s.student_name}</span>
                        <span className="text-[11px] text-gray-400">{s.email || 'Chưa có email'}</span>
                      </div>
                    </td>
                    <td>
                      <div>
                        <span className="text-gray-800 text-xs font-medium block">{s.department}</span>
                        <span className="text-[11px] text-gray-400">{s.program}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${STATUS_COLOR[s.student_status] || 'bg-gray-100'}`}>
                        {STATUS_LABEL[s.student_status] || s.student_status}
                      </span>
                    </td>
                    <td className="text-center">
                      {s.attendance_rate != null ? (
                        <span
                          className={`font-semibold text-xs ${
                            s.attendance_rate < 75
                              ? 'text-red-600 font-bold'
                              : s.attendance_rate < 85
                              ? 'text-yellow-600'
                              : 'text-green-600'
                          }`}
                        >
                          {s.attendance_rate.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="text-center">
                      <span
                        className={`font-mono text-xs ${
                          (s.total_absent ?? 0) >= 3 ? 'text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full' : 'text-gray-600'
                        }`}
                      >
                        {s.total_absent ?? 0}
                      </span>
                    </td>
                    <td className="text-center font-mono font-bold text-gray-800 text-xs">
                      {s.gpa != null ? s.gpa.toFixed(2) : '—'}
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                          onClick={() => openDetail(s)}
                          title="Xem hồ sơ chi tiết"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          onClick={() => openEdit(s)}
                          title="Chỉnh sửa"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          onClick={() => setDeleteTarget(s)}
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
                    <td colSpan={8} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Users size={36} className="text-gray-300 mb-1" />
                        <p className="font-semibold text-gray-600">Chưa có sinh viên nào</p>
                        <p className="text-xs text-gray-400">Bắt đầu bằng cách thêm sinh viên mới</p>
                        <button className="btn-primary text-xs mt-2" onClick={openAdd}>
                          + Thêm sinh viên ngay
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

      {/* Add / Edit Student Modal */}
      <Modal
        open={modalMode === 'add' || modalMode === 'edit'}
        onClose={closeModal}
        title={modalMode === 'add' ? 'Thêm Sinh viên mới' : `Chỉnh sửa: ${selected?.student_name}`}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Mã Sinh viên *</label>
              <input
                className={`input ${formErrors.student_id ? 'border-red-400' : ''}`}
                value={form.student_id}
                onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                placeholder="VD: SV2026001"
                required
              />
              {formErrors.student_id && <p className="text-red-500 text-xs mt-1">{formErrors.student_id}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Họ và Tên *</label>
              <input
                className={`input ${formErrors.student_name ? 'border-red-400' : ''}`}
                value={form.student_name}
                onChange={(e) => setForm({ ...form, student_name: e.target.value })}
                placeholder="Nguyễn Văn A"
                required
              />
              {formErrors.student_name && <p className="text-red-500 text-xs mt-1">{formErrors.student_name}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Ngày sinh</label>
              <input
                type="date"
                className="input"
                value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Giới tính</label>
              <select
                className="input"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value as any })}
              >
                <option value="Male">Nam</option>
                <option value="Female">Nữ</option>
                <option value="Other">Khác</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Trạng thái *</label>
              <select
                className="input"
                value={form.student_status}
                onChange={(e) => setForm({ ...form, student_status: e.target.value as any })}
                required
              >
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="student@truong.edu.vn"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Số điện thoại</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0912 345 678"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Địa chỉ thường trú</label>
            <input
              className="input"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Khoa / Bộ môn *</label>
              <select
                className={`input ${formErrors.department ? 'border-red-400' : ''}`}
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                required
              >
                <option value="">-- Chọn khoa --</option>
                {departments.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.department_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Ngành đào tạo *</label>
              <select
                className={`input ${formErrors.program ? 'border-red-400' : ''}`}
                value={form.program}
                onChange={(e) => setForm({ ...form, program: e.target.value })}
                required
              >
                <option value="">-- Chọn ngành --</option>
                {programs
                  .filter((p) => !form.department || p.department === form.department)
                  .map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.program_name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Học kỳ nhập học *</label>
              <select
                className={`input ${formErrors.admission_term ? 'border-red-400' : ''}`}
                value={form.admission_term}
                onChange={(e) => setForm({ ...form, admission_term: e.target.value })}
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
              <label className="block text-xs font-semibold text-gray-700 mb-1">Ngày nhập học</label>
              <input
                type="date"
                className="input"
                value={form.enrollment_date}
                onChange={(e) => setForm({ ...form, enrollment_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Dự kiến tốt nghiệp</label>
              <input
                type="date"
                className="input"
                value={form.expected_graduation_date}
                onChange={(e) => setForm({ ...form, expected_graduation_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Cố vấn học tập</label>
              <input
                className="input"
                value={form.advisor}
                onChange={(e) => setForm({ ...form, advisor: e.target.value })}
                placeholder="TS. Trần Văn B"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Ghi chú</label>
            <textarea
              className="input resize-none"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Thông tin đặc biệt, diện chính sách..."
            />
          </div>

          {/* Alert on Computed fields */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500">
            ℹ️ Các chỉ số <strong>GPA, Tỷ lệ điểm danh, Tổng buổi vắng, Tín chỉ tích lũy</strong> được tự động tính
            toán từ hệ thống đăng ký và điểm danh, không được sửa thủ công.
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button type="button" className="btn-ghost" onClick={closeModal} disabled={saving}>
              Hủy
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Đang lưu...' : modalMode === 'add' ? 'Thêm sinh viên' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Student Detail Profile Modal (Requirement 27) */}
      <Modal
        open={modalMode === 'detail' && !!selected}
        onClose={closeModal}
        title="Hồ sơ Sinh viên"
        size="xl"
      >
        {selected && (
          <div className="space-y-6">
            {/* Header profile banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-orange-500 to-primary-600 rounded-2xl text-white shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-2xl text-white border-2 border-white/30">
                  {selected.student_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selected.student_name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-orange-100 font-mono">
                    <span>MSSV: {selected.student_id || selected.name}</span>
                    <span>•</span>
                    <span>{selected.department}</span>
                    <span>•</span>
                    <span>{selected.program}</span>
                  </div>
                </div>
              </div>

              <span
                className={`badge py-1 px-3 text-xs font-semibold ${
                  selected.student_status === 'Active'
                    ? 'bg-white text-orange-600'
                    : 'bg-white/20 text-white'
                }`}
              >
                {STATUS_LABEL[selected.student_status] || selected.student_status}
              </span>
            </div>

            {/* KPI Cards row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-gray-50 p-3.5 rounded-xl text-center">
                <span className="text-[11px] text-gray-400 block mb-1">TC Đăng ký</span>
                <span className="text-base font-bold text-gray-800">{selected.registered_credits ?? 0}</span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl text-center">
                <span className="text-[11px] text-gray-400 block mb-1">TC Hoàn thành</span>
                <span className="text-base font-bold text-gray-800">{selected.completed_credits ?? 0}</span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl text-center">
                <span className="text-[11px] text-gray-400 block mb-1">Điểm GPA</span>
                <span className="text-base font-bold text-orange-600">
                  {selected.gpa != null ? selected.gpa.toFixed(2) : '—'}
                </span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl text-center">
                <span className="text-[11px] text-gray-400 block mb-1">Tỷ lệ điểm danh</span>
                <span
                  className={`text-base font-bold ${
                    (selected.attendance_rate ?? 100) < 75 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {selected.attendance_rate != null ? `${selected.attendance_rate.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl text-center col-span-2 sm:col-span-1">
                <span className="text-[11px] text-gray-400 block mb-1">Tổng vắng</span>
                <span
                  className={`text-base font-bold ${
                    (selected.total_absent ?? 0) >= 3 ? 'text-red-600' : 'text-gray-800'
                  }`}
                >
                  {selected.total_absent ?? 0} buổi
                </span>
              </div>
            </div>

            {/* Tabs selector */}
            <div className="flex border-b border-gray-200 gap-6 text-xs font-semibold">
              {[
                { id: 'info', label: 'Thông tin cá nhân' },
                { id: 'academic', label: `Môn đã đăng ký (${enrollments.length})` },
                { id: 'attendance', label: `Lịch sử điểm danh (${attendances.length})` },
                { id: 'overview', label: 'Tổng quan & Thống kê' },
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

            {/* Tab 1: Personal Info */}
            {detailTab === 'info' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs bg-gray-50 p-5 rounded-2xl">
                <div>
                  <span className="text-gray-400 block mb-1">Họ và Tên</span>
                  <span className="font-semibold text-gray-800 text-sm">{selected.student_name}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-1">Mã Sinh viên (MSSV)</span>
                  <span className="font-mono font-bold text-gray-800 text-sm">{selected.student_id || selected.name}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-1">Giới tính</span>
                  <span className="font-medium text-gray-800">{GENDER_LABEL[selected.gender || ''] || selected.gender || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-1">Ngày sinh</span>
                  <span className="font-mono text-gray-800">{selected.date_of_birth || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-1">Email liên hệ</span>
                  <span className="font-mono text-gray-800">{selected.email || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-1">Số điện thoại</span>
                  <span className="font-mono text-gray-800">{selected.phone || '—'}</span>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-gray-400 block mb-1">Địa chỉ</span>
                  <span className="text-gray-800">{selected.address || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-1">Khoa phụ trách</span>
                  <span className="font-medium text-gray-800">{selected.department}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-1">Chương trình đào tạo</span>
                  <span className="font-medium text-gray-800">{selected.program}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-1">Học kỳ nhập học</span>
                  <span className="font-medium text-gray-800">{selected.admission_term}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-1">Ngày nhập học</span>
                  <span className="font-mono text-gray-800">{selected.enrollment_date || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-1">Dự kiến tốt nghiệp</span>
                  <span className="font-mono text-gray-800">{selected.expected_graduation_date || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-1">Cố vấn học tập</span>
                  <span className="font-medium text-gray-800">{selected.advisor || '—'}</span>
                </div>
                {selected.notes && (
                  <div className="col-span-2 sm:col-span-3 pt-2 border-t border-gray-200">
                    <span className="text-gray-400 block mb-1">Ghi chú</span>
                    <span className="text-gray-700 italic">{selected.notes}</span>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Enrolled Courses */}
            {detailTab === 'academic' && (
              <div>
                {loadingDetailData ? (
                  <p className="text-xs text-gray-400 p-4 text-center">Đang tải danh sách học phần...</p>
                ) : enrollments.length > 0 ? (
                  <div className="border border-gray-100 rounded-xl overflow-hidden text-xs">
                    <table className="w-full">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="py-2.5 px-3">Lớp học phần</th>
                          <th className="py-2.5 px-3">Môn học</th>
                          <th className="py-2.5 px-3">Học kỳ</th>
                          <th className="py-2.5 px-3 text-center">Tín chỉ</th>
                          <th className="py-2.5 px-3 text-center">Điểm cuối</th>
                          <th className="py-2.5 px-3 text-center">Điểm danh</th>
                          <th className="py-2.5 px-3">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrollments.map((enr) => (
                          <tr key={enr.name} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="py-2 px-3 font-mono font-semibold text-orange-600">
                              {enr.course_offering}
                            </td>
                            <td className="py-2 px-3 font-medium text-gray-800">{enr.course || '—'}</td>
                            <td className="py-2 px-3 text-gray-600">{enr.academic_term || '—'}</td>
                            <td className="py-2 px-3 text-center font-mono">{enr.credits ?? '—'}</td>
                            <td className="py-2 px-3 text-center font-bold text-gray-800">{enr.final_grade || '—'}</td>
                            <td className="py-2 px-3 text-center">
                              {enr.attendance_rate != null ? `${enr.attendance_rate.toFixed(1)}%` : '—'}
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
                    Sinh viên chưa đăng ký học phần nào.
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Attendance History */}
            {detailTab === 'attendance' && (
              <div>
                {loadingDetailData ? (
                  <p className="text-xs text-gray-400 p-4 text-center">Đang tải lịch sử điểm danh...</p>
                ) : attendances.length > 0 ? (
                  <div className="border border-gray-100 rounded-xl overflow-hidden text-xs max-h-80 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 text-gray-600 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">Ngày</th>
                          <th className="py-2.5 px-3">Buổi học</th>
                          <th className="py-2.5 px-3">Lớp học phần</th>
                          <th className="py-2.5 px-3 text-center">Buổi #</th>
                          <th className="py-2.5 px-3">Loại</th>
                          <th className="py-2.5 px-3 text-center">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendances.map((att) => (
                          <tr key={att.name} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="py-2 px-3 font-mono text-gray-600">{att.session_date || '—'}</td>
                            <td className="py-2 px-3 font-medium text-gray-800">{att.attendance_session}</td>
                            <td className="py-2 px-3 text-gray-600 font-mono">{att.course_offering}</td>
                            <td className="py-2 px-3 text-center font-mono">{att.session_no ?? '—'}</td>
                            <td className="py-2 px-3 text-gray-500">{att.attendance_type || 'Thường'}</td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`badge text-[10px] ${
                                  att.status === 'Present'
                                    ? 'bg-green-100 text-green-800'
                                    : att.status === 'Absent'
                                    ? 'bg-red-100 text-red-800 font-bold'
                                    : att.status === 'Late'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {att.status === 'Present'
                                  ? 'Có mặt'
                                  : att.status === 'Absent'
                                  ? 'Vắng'
                                  : att.status === 'Late'
                                  ? 'Trễ'
                                  : 'Có phép'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-gray-50 rounded-2xl text-xs text-gray-400">
                    Chưa có lịch sử điểm danh cho sinh viên này.
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Overview Chart */}
            {detailTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-orange-50/60 rounded-xl border border-orange-100 text-center">
                    <p className="text-xs text-orange-800 font-semibold mb-1">Tỷ lệ chuyên cần</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {selected.attendance_rate != null ? `${selected.attendance_rate.toFixed(1)}%` : '100%'}
                    </p>
                    <p className="text-[10px] text-orange-700 mt-1">
                      {(selected.attendance_rate ?? 100) >= 80 ? '✅ Đạt chuẩn dự thi' : '⚠️ Nguy cơ cấm thi'}
                    </p>
                  </div>

                  <div className="p-4 bg-red-50/60 rounded-xl border border-red-100 text-center">
                    <p className="text-xs text-red-800 font-semibold mb-1">Số buổi nghỉ học</p>
                    <p className="text-2xl font-bold text-red-600">{selected.total_absent ?? 0}</p>
                    <p className="text-[10px] text-red-700 mt-1">
                      {(selected.total_absent ?? 0) >= 3 ? 'Cần can thiệp cố vấn' : 'Trong ngưỡng cho phép'}
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 text-center">
                    <p className="text-xs text-blue-800 font-semibold mb-1">Tích lũy học tập</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {selected.completed_credits ?? 0} / {selected.registered_credits ?? 0} TC
                    </p>
                    <p className="text-[10px] text-blue-700 mt-1">
                      GPA: {selected.gpa != null ? selected.gpa.toFixed(2) : 'Chưa có điểm'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button className="btn-ghost text-xs" onClick={closeModal}>
                Đóng
              </button>
              <button
                className="btn-primary text-xs"
                onClick={() => {
                  const s = selected
                  closeModal()
                  setTimeout(() => openEdit(s), 50)
                }}
              >
                Chỉnh sửa hồ sơ
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
        title="Xác nhận xóa Sinh viên"
        message={`Bạn có chắc muốn xóa sinh viên "${deleteTarget?.student_name}" (MSSV: ${deleteTarget?.student_id || deleteTarget?.name})?`}
        variant="danger"
        confirmLabel="Xóa Sinh viên"
      />
    </Layout>
  )
}
