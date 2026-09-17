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
import type { Course, Department, CourseOffering } from '../types/models'
import { Plus, Search, GraduationCap, Edit2, Trash2, Eye, Layers } from 'lucide-react'

const COURSE_FIELDS = [
  'name',
  'course_code',
  'course_name',
  'department',
  'credits',
  'course_type',
  'prerequisite',
  'status',
  'description',
]

const COURSE_TYPE_LABELS: Record<string, string> = {
  Mandatory: 'Bắt buộc',
  Elective: 'Tự chọn',
  Optional: 'Tùy chọn',
}

const COURSE_TYPE_COLORS: Record<string, string> = {
  Mandatory: 'bg-orange-100 text-orange-800 font-semibold',
  Elective: 'bg-blue-100 text-blue-800',
  Optional: 'bg-gray-100 text-gray-700',
}

const PER_PAGE = 15

type ModalMode = 'add' | 'edit' | 'detail' | null

interface FormData {
  course_code: string
  course_name: string
  department: string
  credits: number | ''
  course_type: 'Mandatory' | 'Elective' | 'Optional'
  prerequisite: string
  status: 'Active' | 'Inactive'
  description: string
}

const EMPTY_FORM: FormData = {
  course_code: '',
  course_name: '',
  department: '',
  credits: 3,
  course_type: 'Mandatory',
  prerequisite: '',
  status: 'Active',
  description: '',
}

export default function Courses() {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<Course | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null)

  const [departments, setDepartments] = useState<Department[]>([])
  const [offerings, setOfferings] = useState<CourseOffering[]>([])
  const [loadingOfferings, setLoadingOfferings] = useState(false)

  const debouncedSearch = useDebounce(search, 200)

  const { data: courses = [], loading, error, lastRefresh, refresh } = useFetch<Course[]>(
    async () => getList<Course>('Course', { fields: COURSE_FIELDS, limit: 500 })
  )

  useEffect(() => {
    getList<Department>('Department', { fields: ['name', 'department_name', 'department_code'] })
      .then((res) => setDepartments(res || []))
      .catch(() => {})
  }, [])

  const filtered = (courses || []).filter((c) => {
    const q = debouncedSearch.toLowerCase()
    const matchQ =
      !q ||
      c.course_name.toLowerCase().includes(q) ||
      c.course_code.toLowerCase().includes(q) ||
      (c.department ?? '').toLowerCase().includes(q)
    const matchDept = !deptFilter || c.department === deptFilter
    const matchType = !typeFilter || c.course_type === typeFilter
    const matchStatus = !statusFilter || c.status === statusFilter
    return matchQ && matchDept && matchType && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paged = filtered.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)

  function openAdd() {
    setForm({
      ...EMPTY_FORM,
      department: departments[0]?.name || '',
    })
    setFormErrors({})
    setSelected(null)
    setModalMode('add')
  }

  function openEdit(c: Course) {
    setForm({
      course_code: c.course_code,
      course_name: c.course_name,
      department: c.department || '',
      credits: c.credits ?? 3,
      course_type: c.course_type || 'Mandatory',
      prerequisite: c.prerequisite || '',
      status: c.status,
      description: c.description ?? '',
    })
    setFormErrors({})
    setSelected(c)
    setModalMode('edit')
  }

  async function openDetail(c: Course) {
    setSelected(c)
    setModalMode('detail')
    setLoadingOfferings(true)
    try {
      const relatedOfferings = await getList<CourseOffering>('Course Offering', {
        fields: ['name', 'offering_code', 'academic_term', 'section', 'class_name', 'total_slots', 'status'],
        filters: [['course', '=', c.name, undefined as any]],
      })
      setOfferings(relatedOfferings || [])
    } catch {
      setOfferings([])
    } finally {
      setLoadingOfferings(false)
    }
  }

  function closeModal() {
    setModalMode(null)
    setSelected(null)
    setOfferings([])
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormData, string>> = {}
    if (!form.course_code.trim()) errs.course_code = 'Mã môn học không được để trống'
    if (!form.course_name.trim()) errs.course_name = 'Tên môn học không được để trống'
    if (!form.department) errs.department = 'Vui lòng chọn khoa phụ trách'
    if (!form.credits || Number(form.credits) <= 0) errs.credits = 'Số tín chỉ phải lớn hơn 0'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const payload: Partial<Course> = {
        course_code: form.course_code.trim(),
        course_name: form.course_name.trim(),
        department: form.department,
        credits: Number(form.credits),
        course_type: form.course_type,
        prerequisite: form.prerequisite.trim() || undefined,
        status: form.status,
        description: form.description.trim() || undefined,
      }
      if (modalMode === 'add') {
        await createDoc<Course>('Course', payload)
        toast('Thêm môn học mới thành công!', 'success')
      } else if (modalMode === 'edit' && selected) {
        await updateDoc<Course>('Course', selected.name, payload)
        toast('Cập nhật thông tin môn học thành công!', 'success')
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
      await deleteDoc('Course', deleteTarget.name)
      toast(`Đã xóa môn học "${deleteTarget.course_name}"`, 'success')
      setDeleteTarget(null)
      refresh()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Không thể xóa môn học này', 'error')
    }
  }

  return (
    <Layout
      title="Môn học"
      subtitle="Quản lý chương trình môn học, số tín chỉ và điều kiện tiên quyết"
      actions={
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Thêm môn học
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
            placeholder="Tìm theo mã hoặc tên môn học..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
          />
        </div>

        <select
          className="input w-44"
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
          className="input w-36"
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value)
            setPage(0)
          }}
        >
          <option value="">Tất cả loại môn</option>
          {Object.entries(COURSE_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
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
          <option value="Active">Đang mở</option>
          <option value="Inactive">Tạm dừng</option>
        </select>

        <span className="text-xs text-gray-500 font-medium px-2 py-1 bg-gray-100 rounded-lg">
          {filtered.length} môn học
        </span>
      </div>

      {/* Table */}
      {loading && courses.length === 0 ? (
        <TableSkeleton rows={6} cols={7} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Mã Môn</th>
                  <th>Tên Môn học</th>
                  <th>Khoa / Bộ môn</th>
                  <th className="text-center">Số TC</th>
                  <th>Loại môn</th>
                  <th>Tiên quyết</th>
                  <th>Trạng thái</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((c) => (
                  <tr
                    key={c.name}
                    className="cursor-pointer hover:bg-orange-50/60 transition-colors"
                    onClick={() => openDetail(c)}
                  >
                    <td className="font-mono text-xs font-semibold text-orange-600">{c.course_code}</td>
                    <td className="font-semibold text-gray-900">{c.course_name}</td>
                    <td className="text-gray-600">{c.department}</td>
                    <td className="text-center font-bold text-gray-800">{c.credits}</td>
                    <td>
                      <span className={`badge ${COURSE_TYPE_COLORS[c.course_type] || 'bg-gray-100'}`}>
                        {COURSE_TYPE_LABELS[c.course_type] || c.course_type}
                      </span>
                    </td>
                    <td className="text-gray-500 font-mono text-xs">{c.prerequisite || '—'}</td>
                    <td>
                      <span
                        className={`badge ${
                          c.status === 'Active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {c.status === 'Active' ? 'Đang mở' : 'Tạm dừng'}
                      </span>
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                          onClick={() => openDetail(c)}
                          title="Xem chi tiết & Lớp mở"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          onClick={() => openEdit(c)}
                          title="Chỉnh sửa"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          onClick={() => setDeleteTarget(c)}
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
                        <GraduationCap size={36} className="text-gray-300 mb-1" />
                        <p className="font-semibold text-gray-600">Chưa có môn học nào</p>
                        <p className="text-xs text-gray-400">Bắt đầu bằng cách thêm môn học đầu tiên</p>
                        <button className="btn-primary text-xs mt-2" onClick={openAdd}>
                          + Thêm môn học ngay
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
        title={modalMode === 'add' ? 'Thêm Môn học mới' : `Chỉnh sửa: ${selected?.course_name}`}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Mã Môn học *</label>
              <input
                className={`input ${formErrors.course_code ? 'border-red-400' : ''}`}
                value={form.course_code}
                onChange={(e) => setForm({ ...form, course_code: e.target.value })}
                placeholder="VD: CS101"
                required
              />
              {formErrors.course_code && <p className="text-red-500 text-xs mt-1">{formErrors.course_code}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tên Môn học *</label>
              <input
                className={`input ${formErrors.course_name ? 'border-red-400' : ''}`}
                value={form.course_name}
                onChange={(e) => setForm({ ...form, course_name: e.target.value })}
                placeholder="VD: Nhập môn Lập trình"
                required
              />
              {formErrors.course_name && <p className="text-red-500 text-xs mt-1">{formErrors.course_name}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              {formErrors.department && <p className="text-red-500 text-xs mt-1">{formErrors.department}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Số Tín chỉ *</label>
              <input
                type="number"
                min="1"
                max="10"
                className={`input ${formErrors.credits ? 'border-red-400' : ''}`}
                value={form.credits}
                onChange={(e) => setForm({ ...form, credits: e.target.value ? Number(e.target.value) : '' })}
                required
              />
              {formErrors.credits && <p className="text-red-500 text-xs mt-1">{formErrors.credits}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Loại Môn học</label>
              <select
                className="input"
                value={form.course_type}
                onChange={(e) => setForm({ ...form, course_type: e.target.value as any })}
              >
                <option value="Mandatory">Bắt buộc</option>
                <option value="Elective">Tự chọn</option>
                <option value="Optional">Tùy chọn</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Môn Tiên quyết</label>
              <select
                className="input"
                value={form.prerequisite}
                onChange={(e) => setForm({ ...form, prerequisite: e.target.value })}
              >
                <option value="">-- Không có --</option>
                {courses
                  .filter((c) => !selected || c.name !== selected.name)
                  .map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.course_code} - {c.course_name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Trạng thái</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as any })}
            >
              <option value="Active">Đang mở giảng dạy</option>
              <option value="Inactive">Tạm dừng giảng dạy</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Mô tả tóm tắt</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Đề cương, mục tiêu môn học..."
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button type="button" className="btn-ghost" onClick={closeModal} disabled={saving}>
              Hủy
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Đang lưu...' : modalMode === 'add' ? 'Thêm môn học' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal: Course Info + Related Course Offerings */}
      <Modal
        open={modalMode === 'detail' && !!selected}
        onClose={closeModal}
        title={`Chi tiết Môn học: ${selected?.course_name}`}
        size="lg"
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs bg-gray-50 p-4 rounded-xl">
              <div>
                <span className="text-gray-400 block mb-0.5">Mã Môn</span>
                <span className="font-mono font-bold text-gray-900 text-sm">{selected.course_code}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Khoa phụ trách</span>
                <span className="font-semibold text-gray-800">{selected.department}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Số Tín chỉ</span>
                <span className="font-bold text-orange-600 text-sm">{selected.credits} TC</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Loại Môn</span>
                <span className={`badge ${COURSE_TYPE_COLORS[selected.course_type]}`}>
                  {COURSE_TYPE_LABELS[selected.course_type] || selected.course_type}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Tiên quyết</span>
                <span className="font-mono text-gray-700">{selected.prerequisite || 'Không'}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Trạng thái</span>
                <span
                  className={`badge ${
                    selected.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {selected.status === 'Active' ? 'Đang mở' : 'Tạm dừng'}
                </span>
              </div>
            </div>

            {selected.description && (
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-1">Mô tả</h4>
                <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl leading-relaxed">
                  {selected.description}
                </p>
              </div>
            )}

            {/* Related Course Offerings (Requirement 28) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <Layers size={14} className="text-orange-500" />
                  Danh sách Lớp học phần đang mở (Course Offerings)
                </h4>
                <span className="text-[11px] text-gray-400 font-medium">
                  {offerings.length} lớp học phần
                </span>
              </div>

              {loadingOfferings ? (
                <div className="p-4 text-center text-xs text-gray-400 animate-pulse">
                  Đang tải danh sách lớp học phần...
                </div>
              ) : offerings.length > 0 ? (
                <div className="border border-gray-100 rounded-xl overflow-hidden text-xs">
                  <table className="w-full">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="py-2 px-3">Mã Lớp</th>
                        <th className="py-2 px-3">Học kỳ</th>
                        <th className="py-2 px-3">Nhóm</th>
                        <th className="py-2 px-3 text-center">Tổng buổi</th>
                        <th className="py-2 px-3">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {offerings.map((o) => (
                        <tr key={o.name} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 font-mono font-semibold text-orange-600">{o.offering_code}</td>
                          <td className="py-2 px-3 text-gray-700">{o.academic_term}</td>
                          <td className="py-2 px-3 text-gray-700">{o.section || '—'}</td>
                          <td className="py-2 px-3 text-center font-bold">{o.total_slots} buổi</td>
                          <td className="py-2 px-3">
                            <span className="badge bg-blue-50 text-blue-700 text-[10px]">{o.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-xl text-center text-xs text-gray-400">
                  Chưa có lớp học phần nào mở cho môn này.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button className="btn-ghost text-xs" onClick={closeModal}>
                Đóng
              </button>
              <button
                className="btn-primary text-xs"
                onClick={() => {
                  const c = selected
                  closeModal()
                  setTimeout(() => openEdit(c), 50)
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
        title="Xác nhận xóa Môn học"
        message={`Bạn có chắc muốn xóa môn học "${deleteTarget?.course_name}" (${deleteTarget?.course_code})?`}
        variant="danger"
        confirmLabel="Xóa Môn học"
      />
    </Layout>
  )
}
