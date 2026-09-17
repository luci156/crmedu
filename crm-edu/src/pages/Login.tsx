import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(username, password)
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-orange-50 flex items-center justify-center p-4">

      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute -top-40 -right-40 w-[480px] h-[480px] bg-primary-100 rounded-full opacity-50 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[480px] h-[480px] bg-orange-100 rounded-full opacity-50 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500 shadow-lg shadow-primary-200 mb-4">
            <span className="text-white text-3xl font-bold select-none">E</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CRM EDU</h1>
          <p className="text-sm text-gray-500 mt-1">Student & Education Management</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 overflow-hidden">

          {/* Header strip */}
          <div className="bg-gradient-to-r from-primary-500 to-orange-400 px-6 py-5">
            <h2 className="text-white font-semibold text-base">Đăng nhập</h2>
            <p className="text-primary-100 text-xs mt-0.5">Quản trị hệ thống CRM Edu</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">

            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                👤 Tên đăng nhập
              </label>
              <input
                className="input"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(null) }}
                placeholder="admin"
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                🔒 Mật khẩu
              </label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null) }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm select-none"
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                <span>❌</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-sm font-semibold rounded-xl
                         disabled:opacity-60 disabled:cursor-not-allowed
                         hover:shadow-md hover:shadow-primary-200 active:scale-[0.98] transition-all"
            >
              {loading
                ? <><span className="animate-spin inline-block mr-1">⏳</span>Đang đăng nhập…</>
                : <>🚀 Đăng nhập</>
              }
            </button>

          </form>
        </div>

        {/* Default credentials hint */}
        <div className="mt-4 bg-white/70 rounded-2xl border border-gray-100 p-4 text-center">
          <p className="text-xs text-gray-500 font-medium mb-1.5">Tài khoản mặc định</p>
          <div className="flex justify-center gap-6 text-xs">
            <div>
              <span className="text-gray-400">Tài khoản: </span>
              <code className="text-primary-600 font-semibold bg-primary-50 px-1.5 py-0.5 rounded">admin</code>
            </div>
            <div>
              <span className="text-gray-400">Mật khẩu: </span>
              <code className="text-primary-600 font-semibold bg-primary-50 px-1.5 py-0.5 rounded">admin</code>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-300 mt-3">© 2026 CRM Edu v1.0</p>
      </div>
    </div>
  )
}
