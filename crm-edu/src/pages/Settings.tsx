import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Card } from '../components/Card'
import { useToast } from '../components/ui/Toast'
import {
  getActiveProfile,
  updateProfile,
  testConnectionProfile,
  initClientFromProfile,
} from '../api/frappeClient'
import type { ConnectionProfile } from '../types/models'
import { Wifi, Server, ExternalLink, ShieldCheck, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'

export default function Settings() {
  const { toast } = useToast()
  const [activeProfile, setActiveProfile] = useState<ConnectionProfile | null>(null)
  const [formURL, setFormURL] = useState('')
  const [formApiKey, setFormApiKey] = useState('')
  const [formApiSecret, setFormApiSecret] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; version?: string; user?: string; error?: string } | null>(null)

  useEffect(() => {
    const profile = getActiveProfile()
    if (profile) {
      setActiveProfile(profile)
      setFormURL(profile.baseURL)
      setFormApiKey(profile.apiKey)
      setFormApiSecret(profile.apiSecret)
    }
  }, [])

  async function handleTest() {
    if (!activeProfile) return
    setTesting(true)
    const profileToTest: ConnectionProfile = {
      ...activeProfile,
      baseURL: formURL.trim().replace(/\/$/, ''),
      apiKey: formApiKey.trim(),
      apiSecret: formApiSecret.trim(),
    }
    const res = await testConnectionProfile(profileToTest)
    setTestResult(res)
    setTesting(false)
    if (res.ok) {
      toast('Kết nối Frappe thành công!', 'success')
    } else {
      toast('Kết nối Frappe thất bại. Kiểm tra lại thông tin.', 'error')
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!activeProfile) return
    const updated: Partial<ConnectionProfile> = {
      baseURL: formURL.trim().replace(/\/$/, ''),
      apiKey: formApiKey.trim(),
      apiSecret: formApiSecret.trim(),
    }
    updateProfile(activeProfile.id, updated)
    initClientFromProfile({ ...activeProfile, ...updated })
    toast('Đã lưu cấu hình kết nối Frappe!', 'success')
  }

  return (
    <Layout title="Cài đặt hệ thống" subtitle="Cấu hình kết nối Frappe và thông số môi trường">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Banner to Connection Manager */}
        <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold">
              <Server size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-orange-950">Quản lý Đa kết nối (Local & Cloud)</h4>
              <p className="text-xs text-orange-800">
                Chuyển đổi linh hoạt giữa các instance Frappe Local và Cloud
              </p>
            </div>
          </div>
          <Link to="/connection" className="btn-primary py-2 px-3 text-xs flex items-center gap-1.5 whitespace-nowrap">
            Mở Connection Manager <ExternalLink size={14} />
          </Link>
        </div>

        {/* Quick configuration card for active profile */}
        <Card>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Cấu hình: {activeProfile?.name || 'Frappe Instance hiện tại'}
              </h3>
              <p className="text-xs text-gray-400">
                Loại: <span className="uppercase font-semibold text-orange-600">{activeProfile?.type || 'local'}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Trạng thái:</span>
              {activeProfile?.lastStatus === 'connected' ? (
                <span className="badge bg-green-100 text-green-800 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Đã kết nối
                </span>
              ) : (
                <span className="badge bg-gray-100 text-gray-600">Chưa kiểm tra</span>
              )}
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Base URL Frappe *</label>
              <input
                type="url"
                className="input font-mono"
                value={formURL}
                onChange={(e) => setFormURL(e.target.value)}
                placeholder="http://localhost:8000"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">API Key</label>
              <input
                type="text"
                className="input font-mono"
                value={formApiKey}
                onChange={(e) => setFormApiKey(e.target.value)}
                placeholder="VD: 3a1b2c3d..."
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">API Secret</label>
              <input
                type="password"
                className="input font-mono"
                value={formApiSecret}
                onChange={(e) => setFormApiSecret(e.target.value)}
                placeholder="••••••••••••••••"
              />
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border flex items-center gap-2 ${
                  testResult.ok ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'
                }`}
              >
                {testResult.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} className="flex-shrink-0" />}
                <span>
                  {testResult.ok
                    ? `Kết nối thành công! User: ${testResult.user || 'Admin'} - Version: ${testResult.version || 'v14/v15'}`
                    : testResult.error || 'Kết nối thất bại. Vui lòng kiểm tra lại URL hoặc API Key/Secret.'}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="btn-ghost py-2 px-3 text-xs"
              >
                <RefreshCw size={14} className={testing ? 'animate-spin text-orange-500' : ''} />
                {testing ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
              </button>

              <button type="submit" className="btn-primary py-2 px-4 text-xs">
                Lưu cấu hình
              </button>
            </div>
          </form>
        </Card>

        {/* 9 DocTypes supported list */}
        <Card>
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
            📋 9 DocType Tầng 1 Được Hỗ Trợ
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ['Department', 'Khoa / Bộ môn'],
              ['Program', 'Chương trình đào tạo'],
              ['Academic Term', 'Học kỳ / Niên khóa'],
              ['Course', 'Môn học'],
              ['Student', 'Sinh viên'],
              ['Course Offering', 'Lớp học phần'],
              ['Class Session', 'Buổi học'],
              ['Student Course Enrollment', 'Đăng ký học phần'],
              ['Student Attendance', 'Điểm danh'],
            ].map(([dt, vn]) => (
              <div key={dt} className="p-2.5 bg-gray-50 rounded-xl flex items-center justify-between">
                <span className="font-semibold text-gray-800">{vn}</span>
                <span className="font-mono text-[11px] text-gray-400">{dt}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Layout>
  )
}
