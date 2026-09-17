import { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { Card } from '../components/Card'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToast } from '../components/ui/Toast'
import {
  loadProfiles,
  saveProfiles,
  getActiveProfile,
  setActiveProfile,
  addProfile,
  updateProfile,
  deleteProfile,
  testConnectionProfile,
  initClientFromProfile,
} from '../api/frappeClient'
import type { ConnectionProfile } from '../types/models'
import {
  Server,
  Cloud,
  Laptop,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Eye,
  EyeOff,
  Activity,
  User,
  ShieldCheck,
  Zap,
} from 'lucide-react'

export default function Connection() {
  const { toast } = useToast()
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<ConnectionProfile | null>(null)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<'local' | 'cloud' | 'custom'>('local')
  const [formBaseURL, setFormBaseURL] = useState('')
  const [formApiKey, setFormApiKey] = useState('')
  const [formApiSecret, setFormApiSecret] = useState('')
  const [formUsername, setFormUsername] = useState('')
  const [showSecret, setShowSecret] = useState(false)

  // Testing state
  const [testingId, setTestingId] = useState<string | null>(null)
  const [diagnostics, setDiagnostics] = useState<{
    profileName: string
    baseURL: string
    ok: boolean
    version?: string
    user?: string
    responseTime?: number
    checkedAt: string
    error?: string
  } | null>(null)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<ConnectionProfile | null>(null)

  // Load profiles on mount
  useEffect(() => {
    refreshProfileList()
  }, [])

  function refreshProfileList() {
    let list = loadProfiles()
    if (list.length === 0) {
      // Initialize default profiles if empty (without dummy credentials)
      const defaultProfiles: ConnectionProfile[] = [
        {
          id: 'local-default',
          name: 'Frappe Local',
          type: 'local',
          baseURL: 'http://localhost:8000',
          apiKey: '',
          apiSecret: '',
          isActive: true,
          lastStatus: 'untested',
        },
        {
          id: 'cloud-default',
          name: 'Frappe Cloud',
          type: 'cloud',
          baseURL: '',
          apiKey: '',
          apiSecret: '',
          isActive: false,
          lastStatus: 'untested',
        },
      ]
      saveProfiles(defaultProfiles)
      setActiveProfile('local-default')
      list = defaultProfiles
    }
    setProfiles(list)
    const active = getActiveProfile()
    setActiveId(active ? active.id : list[0]?.id ?? null)
  }

  function handleOpenAdd() {
    setEditingProfile(null)
    setFormName('')
    setFormType('local')
    setFormBaseURL('http://localhost:8000')
    setFormApiKey('')
    setFormApiSecret('')
    setFormUsername('')
    setShowSecret(false)
    setIsModalOpen(true)
  }

  function handleOpenEdit(profile: ConnectionProfile) {
    setEditingProfile(profile)
    setFormName(profile.name)
    setFormType(profile.type)
    setFormBaseURL(profile.baseURL)
    setFormApiKey(profile.apiKey)
    setFormApiSecret(profile.apiSecret)
    setFormUsername(profile.username || '')
    setShowSecret(false)
    setIsModalOpen(true)
  }

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    const trimmedURL = formBaseURL.trim().replace(/\/$/, '')
    if (!formName.trim()) {
      toast('Vui lòng nhập tên kết nối.', 'error')
      return
    }
    if (!trimmedURL) {
      toast('Vui lòng nhập Base URL.', 'error')
      return
    }

    if (editingProfile) {
      updateProfile(editingProfile.id, {
        name: formName.trim(),
        type: formType,
        baseURL: trimmedURL,
        apiKey: formApiKey.trim(),
        apiSecret: formApiSecret.trim(),
        username: formUsername.trim() || undefined,
        lastStatus: 'untested',
      })
      toast(`Đã cập nhật cấu hình "${formName.trim()}"`, 'success')
    } else {
      const newProfile: ConnectionProfile = {
        id: 'profile_' + Date.now(),
        name: formName.trim(),
        type: formType,
        baseURL: trimmedURL,
        apiKey: formApiKey.trim(),
        apiSecret: formApiSecret.trim(),
        username: formUsername.trim() || undefined,
        isActive: profiles.length === 0,
        lastStatus: 'untested',
      }
      addProfile(newProfile)
      toast(`Đã tạo kết nối "${newProfile.name}"`, 'success')
    }

    setIsModalOpen(false)
    refreshProfileList()
  }

  function handleSelectProfile(id: string) {
    setActiveProfile(id)
    setActiveId(id)
    const active = profiles.find((p) => p.id === id)
    if (active) {
      // Chỉ khởi tạo client nếu có đủ credentials
      if (active.apiKey && active.apiSecret) {
        initClientFromProfile(active)
        toast(`Đã chuyển sang kết nối: ${active.name}`, 'info')
      } else {
        toast(`Đã chọn "${active.name}" — chưa có API Key/Secret, vui lòng chỉnh sửa cấu hình.`, 'warning')
      }
    }
    refreshProfileList()
  }

  async function handleTest(profile: ConnectionProfile) {
    setTestingId(profile.id)
    const start = Date.now()
    const result = await testConnectionProfile(profile)
    const duration = Date.now() - start

    const updatedStatus = result.ok ? 'connected' : 'failed'
    updateProfile(profile.id, {
      lastStatus: updatedStatus,
      lastChecked: new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN'),
      frappeVersion: result.version,
      responseTime: duration,
    })

    setDiagnostics({
      profileName: profile.name,
      baseURL: profile.baseURL,
      ok: result.ok,
      version: result.version,
      user: result.user,
      responseTime: duration,
      checkedAt: new Date().toLocaleTimeString('vi-VN'),
      error: result.error,
    })

    if (result.ok) {
      toast(`Kết nối "${profile.name}" thành công! (${duration}ms)`, 'success')
    } else {
      toast(`Kết nối "${profile.name}" thất bại. Kiểm tra URL/API credentials.`, 'error')
    }

    setTestingId(null)
    refreshProfileList()
  }

  function confirmDelete(profile: ConnectionProfile) {
    if (profile.id === activeId) {
      toast('Không thể xóa kết nối đang hoạt động. Hãy chuyển kết nối trước!', 'warning')
      return
    }
    setDeleteTarget(profile)
  }

  function handleDelete() {
    if (deleteTarget) {
      deleteProfile(deleteTarget.id)
      toast(`Đã xóa cấu hình "${deleteTarget.name}"`, 'info')
      setDeleteTarget(null)
      refreshProfileList()
    }
  }

  // Mask API Secret: show only last 4 chars
  function maskSecret(secret: string): string {
    if (!secret) return 'Chưa cấu hình'
    if (secret.length <= 6) return '••••••••'
    return '••••••••' + secret.slice(-4)
  }

  return (
    <Layout
      title="Cài đặt Kết nối Frappe"
      subtitle="Quản lý hồ sơ kết nối Frappe Local hoặc Frappe Cloud"
      actions={
        <button onClick={handleOpenAdd} className="btn-primary">
          <Plus size={16} /> Thêm kết nối
        </button>
      }
    >
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Connection Selector / Active Profile Banner */}
        <div className="bg-gradient-to-r from-orange-500 to-primary-600 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-orange-100 font-semibold">
                Frappe Instance Hiện Tại
              </p>
              <h2 className="text-xl font-bold flex items-center gap-2">
                {profiles.find((p) => p.id === activeId)?.name || 'Chưa chọn'}
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 font-medium">
                  {profiles.find((p) => p.id === activeId)?.baseURL || 'Chưa cấu hình URL'}
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-orange-100 hidden sm:inline">Chuyển đổi nhanh:</label>
            <select
              className="bg-white text-gray-800 rounded-lg px-3 py-2 text-sm font-medium border-0 shadow-sm focus:ring-2 focus:ring-white outline-none cursor-pointer"
              value={activeId || ''}
              onChange={(e) => handleSelectProfile(e.target.value)}
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.lastStatus === 'connected' ? '● ' : '○ '} {p.name} ({p.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Profiles Grid */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Danh sách Connection Profiles
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {profiles.map((profile) => {
              const isActive = profile.id === activeId
              const isTesting = testingId === profile.id

              return (
                <Card
                  key={profile.id}
                  className={`relative transition-all duration-200 border-2 ${
                    isActive
                      ? 'border-orange-500 shadow-md ring-2 ring-orange-100 bg-white'
                      : 'border-gray-100 hover:border-gray-200 bg-white'
                  }`}
                >
                  {/* Active Badge */}
                  {isActive && (
                    <div className="absolute top-4 right-4 bg-orange-100 text-orange-700 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                      Đang hoạt động
                    </div>
                  )}

                  {/* Header */}
                  <div className="flex items-start gap-3.5 mb-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        profile.type === 'local'
                          ? 'bg-blue-50 text-blue-600'
                          : profile.type === 'cloud'
                          ? 'bg-purple-50 text-purple-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {profile.type === 'local' ? (
                        <Laptop size={20} />
                      ) : profile.type === 'cloud' ? (
                        <Cloud size={20} />
                      ) : (
                        <Server size={20} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pr-24">
                      <h4 className="font-bold text-gray-900 text-base truncate">{profile.name}</h4>
                      <p className="text-xs text-gray-400 font-mono truncate">{profile.baseURL || 'Chưa đặt URL'}</p>
                    </div>
                  </div>

                  {/* Details table */}
                  <div className="bg-gray-50 rounded-xl p-3.5 space-y-2 text-xs mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Loại kết nối:</span>
                      <span className="font-semibold text-gray-700 uppercase">
                        {profile.type === 'local' ? 'Frappe Local' : profile.type === 'cloud' ? 'Frappe Cloud' : 'Tùy chỉnh'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">API Key:</span>
                      <span className="font-mono text-gray-700 font-medium">
                        {profile.apiKey ? profile.apiKey.slice(0, 6) + '...' : 'Chưa có'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">API Secret:</span>
                      <span className="font-mono text-gray-500">{maskSecret(profile.apiSecret)}</span>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                      <span className="text-gray-500">Trạng thái:</span>
                      <span className="flex items-center gap-1.5 font-medium">
                        {profile.lastStatus === 'connected' ? (
                          <>
                            <CheckCircle2 size={14} className="text-green-600" />
                            <span className="text-green-700 font-semibold">● Đã kết nối</span>
                          </>
                        ) : profile.lastStatus === 'failed' ? (
                          <>
                            <XCircle size={14} className="text-red-600" />
                            <span className="text-red-700 font-semibold">● Kết nối thất bại</span>
                          </>
                        ) : (
                          <>
                            <Clock size={14} className="text-gray-400" />
                            <span className="text-gray-500">Chưa kiểm tra</span>
                          </>
                        )}
                      </span>
                    </div>

                    {profile.frappeVersion && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Frappe Version:</span>
                        <span className="font-medium text-gray-800">{profile.frappeVersion}</span>
                      </div>
                    )}

                    {profile.responseTime && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Độ trễ phản hồi:</span>
                        <span className="font-mono text-gray-800">{profile.responseTime} ms</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTest(profile)}
                        disabled={isTesting}
                        className="btn-ghost py-1.5 px-3 text-xs"
                      >
                        <RefreshCw size={13} className={isTesting ? 'animate-spin text-orange-500' : ''} />
                        {isTesting ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
                      </button>

                      {!isActive && (
                        <button
                          onClick={() => handleSelectProfile(profile.id)}
                          className="px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-semibold transition-colors"
                        >
                          Kích hoạt
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(profile)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        title="Chỉnh sửa"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => confirmDelete(profile)}
                        disabled={isActive}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                        title={isActive ? 'Không thể xóa profile đang kích hoạt' : 'Xóa profile'}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Diagnostics Card */}
        {diagnostics && (
          <Card className="bg-slate-900 text-white border-0 shadow-lg">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-sm tracking-wide uppercase text-slate-200">
                  Frappe Connection Diagnostics
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">Kiểm tra lúc: {diagnostics.checkedAt}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-800/60 p-3 rounded-xl">
                <p className="text-slate-400 mb-1">Hồ sơ</p>
                <p className="font-semibold text-slate-100 text-sm">{diagnostics.profileName}</p>
                <p className="font-mono text-slate-400 text-[11px] truncate mt-0.5">{diagnostics.baseURL}</p>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl">
                <p className="text-slate-400 mb-1">Trạng thái API</p>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${diagnostics.ok ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`}
                  />
                  <span className={`font-bold text-sm ${diagnostics.ok ? 'text-green-400' : 'text-red-400'}`}>
                    {diagnostics.ok ? 'ĐÃ KẾT NỐI' : 'THẤT BẠI'}
                  </span>
                </div>
                {!diagnostics.ok && diagnostics.error && (
                  <p className="text-red-300 mt-1 text-[10px] break-words leading-tight">{diagnostics.error}</p>
                )}
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl">
                <p className="text-slate-400 mb-1">Người dùng & Phiên bản</p>
                <div className="flex items-center gap-1 text-slate-200">
                  <User size={13} className="text-orange-400" />
                  <span className="font-medium">{diagnostics.user || 'Guest / Token User'}</span>
                </div>
                <p className="text-slate-400 mt-0.5 text-[11px]">
                  Frappe: <span className="text-slate-200 font-mono">{diagnostics.version || 'v14 / v15'}</span>
                </p>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl">
                <p className="text-slate-400 mb-1">Độ trễ Response</p>
                <p className="text-lg font-bold font-mono text-orange-400">{diagnostics.responseTime} ms</p>
              </div>
            </div>
          </Card>
        )}

        {/* Instructions Guide */}
        <Card className="bg-orange-50/50 border-orange-100">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-xs text-orange-950">
              <h4 className="font-bold text-sm text-orange-900">Hướng dẫn cấu hình API Key & Secret từ Frappe</h4>
              <ol className="list-decimal list-inside space-y-1 text-orange-800 leading-relaxed">
                <li>
                  Mở trang quản trị Frappe / ERPNext của bạn (Local hoặc Frappe Cloud).
                </li>
                <li>
                  Vào <strong>Cài đặt tài khoản (User Settings)</strong> hoặc chọn user <strong>Administrator</strong>.
                </li>
                <li>
                  Cuộn xuống phần <strong>API Access</strong> và nhấp vào nút <strong>Generate Keys</strong>.
                </li>
                <li>
                  Lưu ý copy ngay <strong>API Secret</strong> vì Frappe chỉ hiển thị 1 lần duy nhất!
                </li>
                <li>
                  Dán <strong>Base URL</strong>, <strong>API Key</strong>, và <strong>API Secret</strong> vào form cấu hình bên trên.
                </li>
              </ol>
            </div>
          </div>
        </Card>
      </div>

      {/* Add / Edit Profile Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProfile ? 'Chỉnh sửa kết nối Frappe' : 'Thêm kết nối Frappe mới'}
        size="md"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Tên kết nối *</label>
            <input
              type="text"
              className="input"
              placeholder="VD: Frappe Localhost / Trường ĐH Cloud"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Loại kết nối</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'local', label: 'Local', icon: Laptop },
                { type: 'cloud', label: 'Cloud', icon: Cloud },
                { type: 'custom', label: 'Custom', icon: Server },
              ].map(({ type, label, icon: Icon }) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => {
                    setFormType(type as any)
                    if (type === 'local' && !formBaseURL) setFormBaseURL('http://localhost:8000')
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                    formType === type
                      ? 'border-orange-500 bg-orange-50 text-orange-700 font-semibold'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Base URL Frappe *</label>
            <input
              type="url"
              className="input font-mono"
              placeholder="http://localhost:8000 hoặc https://ten-site.frappe.cloud"
              value={formBaseURL}
              onChange={(e) => setFormBaseURL(e.target.value)}
              required
            />
            <div className="flex gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => setFormBaseURL('http://localhost:8000')}
                className="text-[11px] text-orange-600 hover:underline"
              >
                + Dùng localhost:8000
              </button>
              <button
                type="button"
                onClick={() => setFormBaseURL('http://localhost:8080')}
                className="text-[11px] text-orange-600 hover:underline"
              >
                + Dùng localhost:8080
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">API Key</label>
            <input
              type="text"
              className="input font-mono"
              placeholder="VD: 3a1b2c3d4e5f6g7h"
              value={formApiKey}
              onChange={(e) => setFormApiKey(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">API Secret (Được mã hóa hiển thị)</label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                className="input font-mono pr-10"
                placeholder="VD: 9z8y7x6w5v4u3t2s"
                value={formApiSecret}
                onChange={(e) => setFormApiSecret(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Username (Tùy chọn)</label>
            <input
              type="text"
              className="input"
              placeholder="administrator"
              value={formUsername}
              onChange={(e) => setFormUsername(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-ghost">
              Hủy
            </button>
            <button type="submit" className="btn-primary">
              Lưu cấu hình
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xác nhận xóa hồ sơ kết nối"
        message={`Bạn có chắc muốn xóa kết nối "${deleteTarget?.name}"? Thao tác này không thể hoàn tác.`}
        variant="danger"
        confirmLabel="Xóa"
      />
    </Layout>
  )
}
