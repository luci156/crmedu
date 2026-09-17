import { useState } from 'react'
import { Layout } from '../components/Layout'
import { AutoRefresh } from '../components/AutoRefresh'
import { TableSkeleton } from '../components/Skeleton'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToast } from '../components/ui/Toast'
import { useFetch } from '../hooks/useFetch'
import { useDebounce } from '../hooks/useUtils'
import { getList, createDoc, updateDoc, deleteDoc } from '../api/frappeClient'
import type { Department } from '../types/models'
import { Plus, Search, Building2, Mail, Phone, Edit2, Trash2, Eye } from 'lucide-react'

const DEPT_FIELDS = [
  'name',
  'department_code',
  'department_name',
  'head_of_department',
  'email',
  'phone',
  'status',
  'description',
]

const PER_PAGE = 15

type ModalMode = 'add' | 'edit' | 'detail' | null

interface FormData {
  department_code: string
  department_name: string
  head_of_department: string
  email: string
  phone: string
  status: 'Active' | 'Inactive'
  description: string
}

const EMPTY_FORM: FormData = {
  department_code: '',
  department_name: '',
  head_of_department: '',
  email: '',
  phone: '',
  status: 'Active',
  description: '',
}

export default function Departments() {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | 'Active' | 'Inactive'>('')
  const [page, setPage] = useState(0)

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<Department | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null)

  const debouncedSearch = useDebounce(search, 200)

  const { data: departments = [], loading, error, lastRefresh, refresh } = useFetch<Department[]>(
    async () => getList<Department>('Department', { fields: DEPT_FIELDS, limit: 500 })
  )

  const filtered = (departments || []).filter((d) => {
    const q = debouncedSearch.toLowerCase()
    const matchQ =
      !q ||
      d.department_name.toLowerCase().includes(q) ||
      d.department_code.toLowerCase().includes(q) ||
      (d.head_of_department ?? '').toLowerCase().includes(q)
    const matchStatus = !statusFilter || d.status === statusFilter
    return matchQ && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paged = filtered.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)

  function openAdd() {
    setForm(EMPTY_FORM)
    setFormErrors({})
    setSelected(null)
    setModalMode('add')
  }

  function openEdit(d: Department) {
    setForm({
      department_code: d.department_code,
      department_name: d.department_name,
      head_of_department: d.head_of_department ?? '',
      email: d.email ?? '',
      phone: d.phone ?? '',
      status: d.status,
      description: d.description ?? '',
    })
    setFormErrors({})
    setSelected(d)
    setModalMode('edit')
  }

  function openDetail(d: Department) {
    setSelected(d)
    setModalMode('detail')
  }

  function closeModal() {
    setModalMode(null)
    setSelected(null)
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormData, string>> = {}
    if (!form.department_code.trim()) errs.department_code = 'Mã khoa không được để trống'
    if (!form.department_name.trim()) errs.department_name = 'Tên khoa không được để trống'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const payload: Partial<Department> = {
        department_code: form.department_code.trim(),
        department_name: form.department_name.trim(),
        head_of_department: form.head_of_department.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        status: form.status,
        description: form.description.trim() || undefined,
      }
      if (modalMode === 'add') {
        await createDoc<Department>('Department', payload)
        toast('Thêm khoa mới thành công!', 'success')
      } else if (modalMode === 'edit' && selected) {
        await updateDoc<Department>('Department', selected.name, payload)
        toast('Cập nhật thông tin khoa thành công!', 'success')
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
      await deleteDoc('Department', deleteTarget.name)
      toast(`Đã xóa khoa "${deleteTarget.department_name}"`, 'success')
      setDeleteTarget(null)
      refresh()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Không thể xóa khoa này', 'error')
    }
  }

  return (
    <Layout
      title="Khoa / Bộ môn"
      subtitle="Quản lý danh sách các khoa, viện và bộ môn đào tạo"
      actions={
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Thêm khoa
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
            placeholder="Tìm theo mã hoặc tên khoa..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
          />
        </div>
        <select
          className="input w-48"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as any)
            setPage(0)
          }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="Active">Đang hoạt động</option>
          <option value="Inactive">Ngưng hoạt động</option>
        </select>
        <span className="text-xs text-gray-500 font-medium px-2 py-1 bg-gray-100 rounded-lg">
          {filtered.length} khoa
        </span>
      </div>

      {/* Table */}
      {loading && departments.length === 0 ? (
        <TableSkeleton rows={6} cols={7} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Mã Khoa</th>
                  <th>Tên Khoa</th>
                  <th>Trưởng Khoa</th>
                  <th>Email</th>
                  <th>Điện thoại</th>
                  <th>Trạng thái</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((d) => (
                  <tr
                    key={d.name}
                    className="cursor-pointer hover:bg-orange-50/60 transition-colors"
                    onClick={() => openDetail(d)}
                  >
                    <td className="font-mono text-xs font-semibold text-orange-600">{d.department_code}</td>
                    <td className="font-semibold text-gray-900">{d.department_name}</td>
                    <td className="text-gray-600">{d.head_of_department || '—'}</td>
                    <td className="text-gray-600">
                      {d.email ? (
                        <span className="flex items-center gap-1">
                          <Mail size={12} className="text-gray-400" /> {d.email}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="text-gray-600">
                      {d.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone size={12} className="text-gray-400" /> {d.phone}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          d.status === 'Active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {d.status === 'Active' ? 'Hoạt động' : 'Ngưng hoạt động'}
                      </span>
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                          onClick={() => openDetail(d)}
                          title="Xem chi tiết"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          onClick={() => openEdit(d)}
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
                    <td colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Building2 size={36} className="text-gray-300 mb-1" />
                        <p className="font-semibold text-gray-600">Chưa có khoa nào</p>
                        <p className="text-xs text-gray-400">Bắt đầu bằng cách thêm khoa đầu tiên</p>
                        <button className="btn-primary text-xs mt-2" onClick={openAdd}>
                          + Thêm khoa ngay
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
        title={modalMode === 'add' ? 'Thêm Khoa / Bộ môn mới' : `Chỉnh sửa: ${selected?.department_name}`}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Mã Khoa *</label>
              <input
                className={`input ${formErrors.department_code ? 'border-red-400' : ''}`}
                value={form.department_code}
                onChange={(e) => setForm({ ...form, department_code: e.target.value })}
                placeholder="VD: CNTT"
                required
              />
              {formErrors.department_code && (
                <p className="text-red-500 text-xs mt-1">{formErrors.department_code}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tên Khoa *</label>
              <input
                className={`input ${formErrors.department_name ? 'border-red-400' : ''}`}
                value={form.department_name}
                onChange={(e) => setForm({ ...form, department_name: e.target.value })}
                placeholder="VD: Công nghệ Thông tin"
                required
              />
              {formErrors.department_name && (
                <p className="text-red-500 text-xs mt-1">{formErrors.department_name}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Trưởng Khoa</label>
            <input
              className="input"
              value={form.head_of_department}
              onChange={(e) => setForm({ ...form, head_of_department: e.target.value })}
              placeholder="PGS. TS Nguyễn Văn A"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="cntt@truong.edu.vn"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Điện thoại</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="024 3869 xxxx"
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
              <option value="Active">Đang hoạt động</option>
              <option value="Inactive">Ngưng hoạt động</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Mô tả</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Thông tin giới thiệu về khoa..."
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button type="button" className="btn-ghost" onClick={closeModal} disabled={saving}>
              Hủy
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Đang lưu...' : modalMode === 'add' ? 'Thêm khoa' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={modalMode === 'detail' && !!selected}
        onClose={closeModal}
        title={`Chi tiết Khoa: ${selected?.department_name}`}
        size="md"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-4 rounded-xl">
              <div>
                <span className="text-gray-400 block mb-0.5">Mã Khoa</span>
                <span className="font-mono font-bold text-gray-900 text-sm">{selected.department_code}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Trạng thái</span>
                <span
                  className={`badge ${
                    selected.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {selected.status === 'Active' ? 'Đang hoạt động' : 'Ngưng hoạt động'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Trưởng Khoa</span>
                <span className="font-semibold text-gray-800">{selected.head_of_department || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Email</span>
                <span className="text-gray-800">{selected.email || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Điện thoại</span>
                <span className="text-gray-800">{selected.phone || '—'}</span>
              </div>
              <div>
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
                  const d = selected
                  closeModal()
                  setTimeout(() => openEdit(d), 50)
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
        title="Xác nhận xóa Khoa"
        message={`Bạn có chắc muốn xóa khoa "${deleteTarget?.department_name}" (${deleteTarget?.department_code})? Thao tác này sẽ xóa vĩnh viễn trên Frappe.`}
        variant="danger"
        confirmLabel="Xóa Khoa"
      />
    </Layout>
  )
}