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
import type { AcademicTerm } from '../types/models'
import { Plus, Search, Calendar, Edit2, Trash2, Eye, Star } from 'lucide-react'

const TERM_FIELDS = [
  'name',
  'term_code',
  'term_name',
  'academic_year',
  'start_date',
  'end_date',
  'status',
  'is_current',
  'description',
]

const STATUS_LABELS: Record<string, string> = {
  Planning: 'Lập kế hoạch',
  Open: 'Đăng ký mở',
  'In Progress': 'Đang diễn ra',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã hủy',
}

const STATUS_COLORS: Record<string, string> = {
  Planning: 'bg-gray-100 text-gray-700',
  Open: 'bg-blue-100 text-blue-800',
  'In Progress': 'bg-orange-100 text-orange-800 font-semibold',
  Completed: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
}

const PER_PAGE = 15

type ModalMode = 'add' | 'edit' | 'detail' | null

interface FormData {
  term_code: string
  term_name: string
  academic_year: string
  start_date: string
  end_date: string
  status: 'Planning' | 'Open' | 'In Progress' | 'Completed' | 'Cancelled'
  is_current: boolean
  description: string
}

const EMPTY_FORM: FormData = {
  term_code: '',
  term_name: '',
  academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  start_date: '',
  end_date: '',
  status: 'Planning',
  is_current: false,
  description: '',
}

export default function Terms() {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [page, setPage] = useState(0)

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<AcademicTerm | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AcademicTerm | null>(null)

  const debouncedSearch = useDebounce(search, 200)

  const { data: terms = [], loading, error, lastRefresh, refresh } = useFetch<AcademicTerm[]>(
    async () =>
      getList<AcademicTerm>('Academic Term', {
        fields: TERM_FIELDS,
        order_by: 'start_date desc',
        limit: 500,
      })
  )

  const academicYears = Array.from(new Set((terms || []).map((t) => t.academic_year).filter(Boolean)))

  const filtered = (terms || []).filter((t) => {
    const q = debouncedSearch.toLowerCase()
    const matchQ =
      !q ||
      t.term_name.toLowerCase().includes(q) ||
      t.term_code.toLowerCase().includes(q) ||
      t.academic_year.toLowerCase().includes(q)
    const matchStatus = !statusFilter || t.status === statusFilter
    const matchYear = !yearFilter || t.academic_year === yearFilter
    return matchQ && matchStatus && matchYear
  })

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paged = filtered.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)

  function openAdd() {
    setForm(EMPTY_FORM)
    setFormErrors({})
    setSelected(null)
    setModalMode('add')
  }

  function openEdit(t: AcademicTerm) {
    setForm({
      term_code: t.term_code,
      term_name: t.term_name,
      academic_year: t.academic_year,
      start_date: t.start_date,
      end_date: t.end_date,
      status: t.status,
      is_current: !!t.is_current,
      description: t.description ?? '',
    })
    setFormErrors({})
    setSelected(t)
    setModalMode('edit')
  }

  function openDetail(t: AcademicTerm) {
    setSelected(t)
    setModalMode('detail')
  }

  function closeModal() {
    setModalMode(null)
    setSelected(null)
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormData, string>> = {}
    if (!form.term_code.trim()) errs.term_code = 'Mã học kỳ không được để trống'
    if (!form.term_name.trim()) errs.term_name = 'Tên học kỳ không được để trống'
    if (!form.academic_year.trim()) errs.academic_year = 'Năm học không được để trống'
    if (!form.start_date) errs.start_date = 'Vui lòng chọn ngày bắt đầu'
    if (!form.end_date) errs.end_date = 'Vui lòng chọn ngày kết thúc'
    if (form.start_date && form.end_date && form.start_date > form.end_date) {
      errs.end_date = 'Ngày kết thúc phải sau ngày bắt đầu'
    }
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const payload: Partial<AcademicTerm> = {
        term_code: form.term_code.trim(),
        term_name: form.term_name.trim(),
        academic_year: form.academic_year.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        status: form.status,
        is_current: form.is_current ? 1 : 0,
        description: form.description.trim() || undefined,
      }
      if (modalMode === 'add') {
        await createDoc<AcademicTerm>('Academic Term', payload)
        toast('Tạo học kỳ mới thành công!', 'success')
      } else if (modalMode === 'edit' && selected) {
        await updateDoc<AcademicTerm>('Academic Term', selected.name, payload)
        toast('Cập nhật thông tin học kỳ thành công!', 'success')
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
      await deleteDoc('Academic Term', deleteTarget.name)
      toast(`Đã xóa học kỳ "${deleteTarget.term_name}"`, 'success')
      setDeleteTarget(null)
      refresh()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Không thể xóa học kỳ này', 'error')
    }
  }

  return (
    <Layout
      title="Học kỳ"
      subtitle="Quản lý niên khóa, học kỳ và thời gian biểu đào tạo"
      actions={
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Thêm học kỳ
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
            placeholder="Tìm theo mã hoặc tên học kỳ..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
          />
        </div>

        <select
          className="input w-44"
          value={yearFilter}
          onChange={(e) => {
            setYearFilter(e.target.value)
            setPage(0)
          }}
        >
          <option value="">Tất cả năm học</option>
          {academicYears.map((y) => (
            <option key={y} value={y}>
              Năm {y}
            </option>
          ))}
        </select>

        <select
          className="input w-44"
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
          {filtered.length} học kỳ
        </span>
      </div>

      {/* Table */}
      {loading && terms.length === 0 ? (
        <TableSkeleton rows={6} cols={8} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Mã HK</th>
                  <th>Tên Học kỳ</th>
                  <th>Năm học</th>
                  <th>Ngày bắt đầu</th>
                  <th>Ngày kết thúc</th>
                  <th>Trạng thái</th>
                  <th className="text-center">Hiện tại</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((t) => (
                  <tr
                    key={t.name}
                    className="cursor-pointer hover:bg-orange-50/60 transition-colors"
                    onClick={() => openDetail(t)}
                  >
                    <td className="font-mono text-xs font-semibold text-orange-600">{t.term_code}</td>
                    <td className="font-semibold text-gray-900">
                      <div className="flex items-center gap-1.5">
                        {t.term_name}
                        {!!t.is_current && (
                          <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <Star size={10} className="fill-orange-500 text-orange-500" /> Hiện tại
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-gray-600">{t.academic_year}</td>
                    <td className="text-gray-600">{t.start_date}</td>
                    <td className="text-gray-600">{t.end_date}</td>
                    <td>
                      <span className={`badge ${STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABELS[t.status] || t.status}
                      </span>
                    </td>
                    <td className="text-center">
                      {t.is_current ? (
                        <span className="text-orange-500 font-bold">⭐ Có</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                          onClick={() => openDetail(t)}
                          title="Xem chi tiết"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          onClick={() => openEdit(t)}
                          title="Chỉnh sửa"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          onClick={() => setDeleteTarget(t)}
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
                        <Calendar size={36} className="text-gray-300 mb-1" />
                        <p className="font-semibold text-gray-600">Chưa có học kỳ nào</p>
                        <p className="text-xs text-gray-400">Bắt đầu bằng cách tạo học kỳ đầu tiên</p>
                        <button className="btn-primary text-xs mt-2" onClick={openAdd}>
                          + Thêm học kỳ ngay
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
        title={modalMode === 'add' ? 'Thêm Học kỳ mới' : `Chỉnh sửa: ${selected?.term_name}`}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Mã Học kỳ *</label>
              <input
                className={`input ${formErrors.term_code ? 'border-red-400' : ''}`}
                value={form.term_code}
                onChange={(e) => setForm({ ...form, term_code: e.target.value })}
                placeholder="VD: 2026-S1"
                required
              />
              {formErrors.term_code && <p className="text-red-500 text-xs mt-1">{formErrors.term_code}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tên Học kỳ *</label>
              <input
                className={`input ${formErrors.term_name ? 'border-red-400' : ''}`}
                value={form.term_name}
                onChange={(e) => setForm({ ...form, term_name: e.target.value })}
                placeholder="VD: Học kỳ 1 (2026 - 2027)"
                required
              />
              {formErrors.term_name && <p className="text-red-500 text-xs mt-1">{formErrors.term_name}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Năm học *</label>
            <input
              className={`input ${formErrors.academic_year ? 'border-red-400' : ''}`}
              value={form.academic_year}
              onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
              placeholder="VD: 2026-2027"
              required
            />
            {formErrors.academic_year && <p className="text-red-500 text-xs mt-1">{formErrors.academic_year}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Ngày bắt đầu *</label>
              <input
                type="date"
                className={`input ${formErrors.start_date ? 'border-red-400' : ''}`}
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                required
              />
              {formErrors.start_date && <p className="text-red-500 text-xs mt-1">{formErrors.start_date}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Ngày kết thúc *</label>
              <input
                type="date"
                className={`input ${formErrors.end_date ? 'border-red-400' : ''}`}
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                required
              />
              {formErrors.end_date && <p className="text-red-500 text-xs mt-1">{formErrors.end_date}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Trạng thái</label>
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

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_current"
              className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
              checked={form.is_current}
              onChange={(e) => setForm({ ...form, is_current: e.target.checked })}
            />
            <label htmlFor="is_current" className="text-xs font-semibold text-gray-800 cursor-pointer">
              Đánh dấu là Học kỳ hiện tại
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Mô tả</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ghi chú về kế hoạch học kỳ..."
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button type="button" className="btn-ghost" onClick={closeModal} disabled={saving}>
              Hủy
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Đang lưu...' : modalMode === 'add' ? 'Thêm học kỳ' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={modalMode === 'detail' && !!selected}
        onClose={closeModal}
        title={`Chi tiết Học kỳ: ${selected?.term_name}`}
        size="md"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-4 rounded-xl">
              <div>
                <span className="text-gray-400 block mb-0.5">Mã Học kỳ</span>
                <span className="font-mono font-bold text-gray-900 text-sm">{selected.term_code}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Trạng thái</span>
                <span className={`badge ${STATUS_COLORS[selected.status] || 'bg-gray-100 text-gray-700'}`}>
                  {STATUS_LABELS[selected.status] || selected.status}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Năm học</span>
                <span className="font-semibold text-gray-800">{selected.academic_year}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Học kỳ hiện tại</span>
                <span className="font-semibold text-gray-800">
                  {selected.is_current ? '⭐ Đúng' : 'Không'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Ngày bắt đầu</span>
                <span className="text-gray-800 font-mono">{selected.start_date}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Ngày kết thúc</span>
                <span className="text-gray-800 font-mono">{selected.end_date}</span>
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
                  const t = selected
                  closeModal()
                  setTimeout(() => openEdit(t), 50)
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
        title="Xác nhận xóa Học kỳ"
        message={`Bạn có chắc muốn xóa học kỳ "${deleteTarget?.term_name}" (${deleteTarget?.term_code})?`}
        variant="danger"
        confirmLabel="Xóa Học kỳ"
      />
    </Layout>
  )
}
