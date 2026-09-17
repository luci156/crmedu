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
import type { Program, Department } from '../types/models'
import { Plus, Search, BookOpen, Edit2, Trash2, Eye } from 'lucide-react'

const PROGRAM_FIELDS = [
  'name',
  'program_code',
  'program_name',
  'department',
  'degree_level',
  'duration_years',
  'total_required_credits',
  'status',
  'description',
]

const DEGREE_LABELS: Record<string, string> = {
  Associate: 'Cao đẳng',
  Bachelor: 'Đại học',
  Master: 'Thạc sĩ',
  Doctorate: 'Tiến sĩ',
}

const PER_PAGE = 15

type ModalMode = 'add' | 'edit' | 'detail' | null

interface FormData {
  program_code: string
  program_name: string
  department: string
  degree_level: 'Associate' | 'Bachelor' | 'Master' | 'Doctorate'
  duration_years: number | ''
  total_required_credits: number | ''
  status: 'Active' | 'Inactive'
  description: string
}

const EMPTY_FORM: FormData = {
  program_code: '',
  program_name: '',
  department: '',
  degree_level: 'Bachelor',
  duration_years: 4,
  total_required_credits: 120,
  status: 'Active',
  description: '',
}

export default function Programs() {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [degreeFilter, setDegreeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<Program | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null)

  const [departments, setDepartments] = useState<Department[]>([])

  const debouncedSearch = useDebounce(search, 200)

  // Load programs
  const { data: programs = [], loading, error, lastRefresh, refresh } = useFetch<Program[]>(
    async () => getList<Program>('Program', { fields: PROGRAM_FIELDS, limit: 500 })
  )

  // Load departments for select dropdown
  useEffect(() => {
    getList<Department>('Department', { fields: ['name', 'department_name', 'department_code'] })
      .then((res) => setDepartments(res || []))
      .catch(() => {})
  }, [])

  const filtered = (programs || []).filter((p) => {
    const q = debouncedSearch.toLowerCase()
    const matchQ =
      !q ||
      p.program_name.toLowerCase().includes(q) ||
      p.program_code.toLowerCase().includes(q) ||
      (p.department ?? '').toLowerCase().includes(q)
    const matchDept = !deptFilter || p.department === deptFilter
    const matchDegree = !degreeFilter || p.degree_level === degreeFilter
    const matchStatus = !statusFilter || p.status === statusFilter
    return matchQ && matchDept && matchDegree && matchStatus
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

  function openEdit(p: Program) {
    setForm({
      program_code: p.program_code,
      program_name: p.program_name,
      department: p.department || '',
      degree_level: p.degree_level || 'Bachelor',
      duration_years: p.duration_years ?? '',
      total_required_credits: p.total_required_credits ?? '',
      status: p.status,
      description: p.description ?? '',
    })
    setFormErrors({})
    setSelected(p)
    setModalMode('edit')
  }

  function openDetail(p: Program) {
    setSelected(p)
    setModalMode('detail')
  }

  function closeModal() {
    setModalMode(null)
    setSelected(null)
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormData, string>> = {}
    if (!form.program_code.trim()) errs.program_code = 'Mã ngành không được để trống'
    if (!form.program_name.trim()) errs.program_name = 'Tên ngành không được để trống'
    if (!form.department) errs.department = 'Vui lòng chọn khoa phụ trách'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const payload: Partial<Program> = {
        program_code: form.program_code.trim(),
        program_name: form.program_name.trim(),
        department: form.department,
        degree_level: form.degree_level,
        duration_years: form.duration_years ? Number(form.duration_years) : undefined,
        total_required_credits: form.total_required_credits ? Number(form.total_required_credits) : undefined,
        status: form.status,
        description: form.description.trim() || undefined,
      }
      if (modalMode === 'add') {
        await createDoc<Program>('Program', payload)
        toast('Thêm chương trình đào tạo thành công!', 'success')
      } else if (modalMode === 'edit' && selected) {
        await updateDoc<Program>('Program', selected.name, payload)
        toast('Cập nhật chương trình đào tạo thành công!', 'success')
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
      await deleteDoc('Program', deleteTarget.name)
      toast(`Đã xóa chương trình "${deleteTarget.program_name}"`, 'success')
      setDeleteTarget(null)
      refresh()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Không thể xóa chương trình này', 'error')
    }
  }

  return (
    <Layout
      title="Chương trình đào tạo"
      subtitle="Quản lý các chuyên ngành, bậc học và khung chương trình đào tạo"
      actions={
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Thêm chương trình
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
            placeholder="Tìm theo mã hoặc tên chương trình..."
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
          value={degreeFilter}
          onChange={(e) => {
            setDegreeFilter(e.target.value)
            setPage(0)
          }}
        >
          <option value="">Tất cả bậc</option>
          {Object.entries(DEGREE_LABELS).map(([k, v]) => (
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
          {filtered.length} chương trình
        </span>
      </div>

      {/* Table */}
      {loading && programs.length === 0 ? (
        <TableSkeleton rows={6} cols={7} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Mã Ngành</th>
                  <th>Tên Chương trình</th>
                  <th>Khoa / Bộ môn</th>
                  <th>Trình độ</th>
                  <th>Thời gian</th>
                  <th>Tín chỉ</th>
                  <th>Trạng thái</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((p) => (
                  <tr
                    key={p.name}
                    className="cursor-pointer hover:bg-orange-50/60 transition-colors"
                    onClick={() => openDetail(p)}
                  >
                    <td className="font-mono text-xs font-semibold text-orange-600">{p.program_code}</td>
                    <td className="font-semibold text-gray-900">{p.program_name}</td>
                    <td className="text-gray-600">{p.department}</td>
                    <td>
                      <span className="badge bg-blue-50 text-blue-700 font-medium">
                        {DEGREE_LABELS[p.degree_level] || p.degree_level}
                      </span>
                    </td>
                    <td className="text-gray-600">{p.duration_years ? `${p.duration_years} năm` : '—'}</td>
                    <td className="font-mono text-gray-700">{p.total_required_credits ? `${p.total_required_credits} TC` : '—'}</td>
                    <td>
                      <span
                        className={`badge ${
                          p.status === 'Active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {p.status === 'Active' ? 'Đang mở' : 'Tạm dừng'}
                      </span>
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                          onClick={() => openDetail(p)}
                          title="Xem chi tiết"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          onClick={() => openEdit(p)}
                          title="Chỉnh sửa"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          onClick={() => setDeleteTarget(p)}
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
                        <BookOpen size={36} className="text-gray-300 mb-1" />
                        <p className="font-semibold text-gray-600">Chưa có chương trình đào tạo nào</p>
                        <p className="text-xs text-gray-400">Bắt đầu bằng cách thêm chương trình đầu tiên</p>
                        <button className="btn-primary text-xs mt-2" onClick={openAdd}>
                          + Thêm chương trình ngay
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
        title={modalMode === 'add' ? 'Thêm Chương trình đào tạo mới' : `Chỉnh sửa: ${selected?.program_name}`}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Mã Ngành *</label>
              <input
                className={`input ${formErrors.program_code ? 'border-red-400' : ''}`}
                value={form.program_code}
                onChange={(e) => setForm({ ...form, program_code: e.target.value })}
                placeholder="VD: IT-SE"
                required
              />
              {formErrors.program_code && (
                <p className="text-red-500 text-xs mt-1">{formErrors.program_code}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tên Chương trình *</label>
              <input
                className={`input ${formErrors.program_name ? 'border-red-400' : ''}`}
                value={form.program_name}
                onChange={(e) => setForm({ ...form, program_name: e.target.value })}
                placeholder="VD: Kỹ thuật Phần mềm"
                required
              />
              {formErrors.program_name && (
                <p className="text-red-500 text-xs mt-1">{formErrors.program_name}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Khoa / Bộ môn *</label>
            <select
              className={`input ${formErrors.department ? 'border-red-400' : ''}`}
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              required
            >
              <option value="">-- Chọn khoa phụ trách --</option>
              {departments.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.department_name} ({d.department_code})
                </option>
              ))}
            </select>
            {formErrors.department && (
              <p className="text-red-500 text-xs mt-1">{formErrors.department}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Trình độ</label>
              <select
                className="input"
                value={form.degree_level}
                onChange={(e) => setForm({ ...form, degree_level: e.target.value as any })}
              >
                {Object.entries(DEGREE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Thời gian (năm)</label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="10"
                className="input"
                value={form.duration_years}
                onChange={(e) => setForm({ ...form, duration_years: e.target.value ? Number(e.target.value) : '' })}
                placeholder="4"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tổng Tín chỉ</label>
              <input
                type="number"
                min="30"
                max="300"
                className="input"
                value={form.total_required_credits}
                onChange={(e) =>
                  setForm({ ...form, total_required_credits: e.target.value ? Number(e.target.value) : '' })
                }
                placeholder="120"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Trạng thái</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as any })}
            >
              <option value="Active">Đang mở tuyển sinh / đào tạo</option>
              <option value="Inactive">Tạm dừng tuyển sinh</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Mô tả</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Mục tiêu đào tạo, chuẩn đầu ra..."
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button type="button" className="btn-ghost" onClick={closeModal} disabled={saving}>
              Hủy
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Đang lưu...' : modalMode === 'add' ? 'Thêm chương trình' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={modalMode === 'detail' && !!selected}
        onClose={closeModal}
        title={`Chi tiết Chương trình: ${selected?.program_name}`}
        size="md"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-4 rounded-xl">
              <div>
                <span className="text-gray-400 block mb-0.5">Mã Ngành</span>
                <span className="font-mono font-bold text-gray-900 text-sm">{selected.program_code}</span>
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
              <div>
                <span className="text-gray-400 block mb-0.5">Khoa / Bộ môn</span>
                <span className="font-semibold text-gray-800">{selected.department}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Bậc đào tạo</span>
                <span className="font-medium text-gray-800">
                  {DEGREE_LABELS[selected.degree_level] || selected.degree_level}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Thời gian đào tạo</span>
                <span className="text-gray-800">{selected.duration_years ? `${selected.duration_years} năm` : '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Tổng tín chỉ yêu cầu</span>
                <span className="font-bold text-orange-600">
                  {selected.total_required_credits ? `${selected.total_required_credits} TC` : '—'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400 block mb-0.5">Doc ID Frappe</span>
                <span className="font-mono text-gray-500">{selected.name}</span>
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

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button className="btn-ghost text-xs" onClick={closeModal}>
                Đóng
              </button>
              <button
                className="btn-primary text-xs"
                onClick={() => {
                  const p = selected
                  closeModal()
                  setTimeout(() => openEdit(p), 50)
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
        title="Xác nhận xóa Chương trình đào tạo"
        message={`Bạn có chắc muốn xóa chương trình "${deleteTarget?.program_name}" (${deleteTarget?.program_code})?`}
        variant="danger"
        confirmLabel="Xóa Chương trình"
      />
    </Layout>
  )
}
