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
import type { ClassSession, CourseOffering } from '../types/models'
import { Plus, Search, Clock, Edit2, Trash2, Eye, CheckCircle, XCircle } from 'lucide-react'

const SESSION_FIELDS = [
  'name',
  'session_id',
  'course_offering',
  'session_no',
  'session_date',
  'start_time',
  'end_time',
  'slot',
  'room',
  'instructor',
  'status',
  'topic',
  'remarks',
]

const STATUS_LABELS: Record<string, string> = {
  Scheduled: 'Đã lên lịch',
  Completed: 'Đã hoàn thành',
  Cancelled: 'Đã hủy',
  Postponed: 'Hoãn lại',
  'Make-up': 'Học bù',
}

const STATUS_COLORS: Record<string, string> = {
  Scheduled: 'bg-blue-100 text-blue-800',
  Completed: 'bg-green-100 text-green-800 font-semibold',
  Cancelled: 'bg-red-100 text-red-800',
  Postponed: 'bg-yellow-100 text-yellow-800',
  'Make-up': 'bg-purple-100 text-purple-800',
}

const PER_PAGE = 15

type ModalMode = 'add' | 'edit' | 'detail' | null

interface SessionFormData {
  session_id: string
  course_offering: string
  session_no: number | ''
  session_date: string
  start_time: string
  end_time: string
  slot: string
  room: string
  instructor: string
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Postponed' | 'Make-up'
  topic: string
  remarks: string
}

const EMPTY_FORM: SessionFormData = {
  session_id: '',
  course_offering: '',
  session_no: 1,
  session_date: new Date().toISOString().split('T')[0],
  start_time: '07:30',
  end_time: '09:30',
  slot: 'Ca 1',
  room: '',
  instructor: '',
  status: 'Scheduled',
  topic: '',
  remarks: '',
}

export default function Sessions() {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [offeringFilter, setOfferingFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<ClassSession | null>(null)
  const [form, setForm] = useState<SessionFormData>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof SessionFormData, string>>>({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ClassSession | null>(null)

  const [offerings, setOfferings] = useState<CourseOffering[]>([])

  const debouncedSearch = useDebounce(search, 200)

  const { data: sessions = [], loading, error, lastRefresh, refresh } = useFetch<ClassSession[]>(
    async () =>
      getList<ClassSession>('Class Session', {
        fields: SESSION_FIELDS,
        order_by: 'session_date desc',
        limit: 500,
      })
  )

  useEffect(() => {
    getList<CourseOffering>('Course Offering', { fields: ['name', 'offering_code', 'course', 'instructor', 'room'] })
      .then((res) => setOfferings(res || []))
      .catch(() => {})
  }, [])

  const filtered = (sessions || []).filter((s) => {
    const q = debouncedSearch.toLowerCase()
    const matchQ =
      !q ||
      s.course_offering.toLowerCase().includes(q) ||
      (s.topic ?? '').toLowerCase().includes(q) ||
      (s.instructor ?? '').toLowerCase().includes(q) ||
      (s.room ?? '').toLowerCase().includes(q)
    const matchOffering = !offeringFilter || s.course_offering === offeringFilter
    const matchStatus = !statusFilter || s.status === statusFilter
    return matchQ && matchOffering && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paged = filtered.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)

  function openAdd() {
    const defaultOffering = offerings[0]
    setForm({
      ...EMPTY_FORM,
      course_offering: defaultOffering?.name || '',
      room: defaultOffering?.room || '',
      instructor: defaultOffering?.instructor || '',
    })
    setFormErrors({})
    setSelected(null)
    setModalMode('add')
  }

  function openEdit(s: ClassSession) {
    setForm({
      session_id: s.session_id || '',
      course_offering: s.course_offering,
      session_no: s.session_no,
      session_date: s.session_date,
      start_time: s.start_time || '',
      end_time: s.end_time || '',
      slot: s.slot || '',
      room: s.room || '',
      instructor: s.instructor || '',
      status: s.status,
      topic: s.topic || '',
      remarks: s.remarks || '',
    })
    setFormErrors({})
    setSelected(s)
    setModalMode('edit')
  }

  function openDetail(s: ClassSession) {
    setSelected(s)
    setModalMode('detail')
  }

  function closeModal() {
    setModalMode(null)
    setSelected(null)
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof SessionFormData, string>> = {}
    if (!form.course_offering) errs.course_offering = 'Vui lòng chọn lớp học phần'
    if (!form.session_no || Number(form.session_no) <= 0) errs.session_no = 'Số thứ tự buổi phải > 0'
    if (!form.session_date) errs.session_date = 'Vui lòng chọn ngày học'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const payload: Partial<ClassSession> = {
        session_id: form.session_id.trim() || undefined,
        course_offering: form.course_offering,
        session_no: Number(form.session_no),
        session_date: form.session_date,
        start_time: form.start_time || undefined,
        end_time: form.end_time || undefined,
        slot: form.slot.trim() || undefined,
        room: form.room.trim() || undefined,
        instructor: form.instructor.trim() || undefined,
        status: form.status,
        topic: form.topic.trim() || undefined,
        remarks: form.remarks.trim() || undefined,
      }
      if (modalMode === 'add') {
        await createDoc<ClassSession>('Class Session', payload)
        toast('Thêm buổi học thành công!', 'success')
      } else if (modalMode === 'edit' && selected) {
        await updateDoc<ClassSession>('Class Session', selected.name, payload)
        toast('Cập nhật buổi học thành công!', 'success')
      }
      closeModal()
      refresh()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Lỗi khi lưu dữ liệu', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleQuickStatus(s: ClassSession, newStatus: 'Completed' | 'Cancelled') {
    try {
      await updateDoc<ClassSession>('Class Session', s.name, { status: newStatus })
      toast(`Đã đánh dấu buổi ${s.session_no}: ${STATUS_LABELS[newStatus]}`, 'success')
      refresh()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Không thể cập nhật trạng thái', 'error')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteDoc('Class Session', deleteTarget.name)
      toast(`Đã xóa buổi học #${deleteTarget.session_no}`, 'success')
      setDeleteTarget(null)
      refresh()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Không thể xóa buổi học này', 'error')
    }
  }

  return (
    <Layout
      title="Buổi học (Class Session)"
      subtitle="Quản lý các buổi học thực tế của từng lớp học phần (Nguồn dữ liệu thực tế về buổi học)"
      actions={
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Thêm buổi học
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
            placeholder="Tìm theo lớp, chủ đề, phòng..."
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
          {filtered.length} buổi học
        </span>
      </div>

      {/* Table */}
      {loading && sessions.length === 0 ? (
        <TableSkeleton rows={8} cols={8} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th className="text-center">Buổi #</th>
                  <th>Lớp học phần</th>
                  <th>Ngày học</th>
                  <th>Thời gian</th>
                  <th>Ca / Phòng</th>
                  <th>Chủ đề bài giảng</th>
                  <th>Trạng thái</th>
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
                    <td className="text-center font-mono font-bold text-orange-600">#{s.session_no}</td>
                    <td className="font-semibold text-gray-900">{s.course_offering}</td>
                    <td className="font-mono text-xs text-gray-700">{s.session_date}</td>
                    <td className="font-mono text-xs text-gray-600">
                      {s.start_time && s.end_time ? `${s.start_time} - ${s.end_time}` : '—'}
                    </td>
                    <td className="text-xs text-gray-600">
                      {s.slot || s.room ? `${s.slot || ''} (${s.room || 'Phòng ?'})` : '—'}
                    </td>
                    <td className="text-gray-800 text-xs max-w-[200px] truncate">{s.topic || `Buổi ${s.session_no}`}</td>
                    <td>
                      <span className={`badge ${STATUS_COLORS[s.status] || 'bg-gray-100'}`}>
                        {STATUS_LABELS[s.status] || s.status}
                      </span>
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {s.status === 'Scheduled' && (
                          <button
                            className="p-1 rounded text-green-600 hover:bg-green-50"
                            title="Đánh dấu đã hoàn thành"
                            onClick={() => handleQuickStatus(s, 'Completed')}
                          >
                            <CheckCircle size={15} />
                          </button>
                        )}
                        <button
                          className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                          onClick={() => openDetail(s)}
                          title="Xem chi tiết"
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
                        <Clock size={36} className="text-gray-300 mb-1" />
                        <p className="font-semibold text-gray-600">Chưa có buổi học nào</p>
                        <p className="text-xs text-gray-400">Vào Lớp học phần hoặc bấm Thêm buổi học</p>
                        <button className="btn-primary text-xs mt-2" onClick={openAdd}>
                          + Thêm buổi học ngay
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
        title={modalMode === 'add' ? 'Thêm Buổi học mới' : `Chỉnh sửa: Buổi #${selected?.session_no}`}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Lớp học phần *</label>
              <select
                className={`input ${formErrors.course_offering ? 'border-red-400' : ''}`}
                value={form.course_offering}
                onChange={(e) => {
                  const off = offerings.find((o) => o.name === e.target.value)
                  setForm({
                    ...form,
                    course_offering: e.target.value,
                    room: off?.room || form.room,
                    instructor: off?.instructor || form.instructor,
                  })
                }}
                required
              >
                <option value="">-- Chọn lớp --</option>
                {offerings.map((o) => (
                  <option key={o.name} value={o.name}>
                    {o.offering_code} ({o.course})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Buổi thứ mấy *</label>
              <input
                type="number"
                min="1"
                max="120"
                className={`input ${formErrors.session_no ? 'border-red-400' : ''}`}
                value={form.session_no}
                onChange={(e) => setForm({ ...form, session_no: e.target.value ? Number(e.target.value) : '' })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Ngày học *</label>
              <input
                type="date"
                className={`input ${formErrors.session_date ? 'border-red-400' : ''}`}
                value={form.session_date}
                onChange={(e) => setForm({ ...form, session_date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Giờ bắt đầu</label>
              <input
                type="time"
                className="input"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Giờ kết thúc</label>
              <input
                type="time"
                className="input"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Ca học</label>
              <input
                className="input"
                value={form.slot}
                onChange={(e) => setForm({ ...form, slot: e.target.value })}
                placeholder="Ca 1 / Sáng"
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
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Giảng viên</label>
              <input
                className="input"
                value={form.instructor}
                onChange={(e) => setForm({ ...form, instructor: e.target.value })}
                placeholder="Tên GV"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Trạng thái buổi học</label>
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
            <label className="block text-xs font-semibold text-gray-700 mb-1">Chủ đề bài giảng</label>
            <input
              className="input"
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              placeholder="VD: Cấu trúc điều khiển If-Else và Vòng lặp"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Ghi chú</label>
            <textarea
              className="input resize-none"
              rows={2}
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="Ghi chú về bài tập, tài liệu cần chuẩn bị..."
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button type="button" className="btn-ghost" onClick={closeModal} disabled={saving}>
              Hủy
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Đang lưu...' : modalMode === 'add' ? 'Thêm buổi học' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={modalMode === 'detail' && !!selected}
        onClose={closeModal}
        title={`Chi tiết Buổi học #${selected?.session_no}`}
        size="md"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-4 rounded-xl">
              <div>
                <span className="text-gray-400 block mb-0.5">Lớp học phần</span>
                <span className="font-semibold text-gray-900">{selected.course_offering}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Trạng thái</span>
                <span className={`badge ${STATUS_COLORS[selected.status] || 'bg-gray-100'}`}>
                  {STATUS_LABELS[selected.status] || selected.status}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Buổi thứ</span>
                <span className="font-bold text-orange-600 text-sm">Buổi {selected.session_no}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Ngày học</span>
                <span className="font-mono text-gray-800">{selected.session_date}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Thời gian</span>
                <span className="font-mono text-gray-800">
                  {selected.start_time && selected.end_time ? `${selected.start_time} - ${selected.end_time}` : '—'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Ca / Phòng</span>
                <span className="font-mono text-gray-800">
                  {selected.slot || selected.room ? `${selected.slot || ''} (${selected.room || ''})` : '—'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400 block mb-0.5">Chủ đề bài giảng</span>
                <span className="font-medium text-gray-800">{selected.topic || '—'}</span>
              </div>
              {selected.remarks && (
                <div className="col-span-2">
                  <span className="text-gray-400 block mb-0.5">Ghi chú</span>
                  <span className="text-gray-700 italic">{selected.remarks}</span>
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
                  const s = selected
                  closeModal()
                  setTimeout(() => openEdit(s), 50)
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
        title="Xác nhận xóa Buổi học"
        message={`Bạn có chắc muốn xóa Buổi #${deleteTarget?.session_no} của lớp "${deleteTarget?.course_offering}"?`}
        variant="danger"
        confirmLabel="Xóa Buổi học"
      />
    </Layout>
  )
}
