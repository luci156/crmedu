import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/** Wrapper: chuyển hướng về /login nếu chưa đăng nhập */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center mx-auto mb-3 animate-pulse">
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <p className="text-sm text-gray-500">Đang tải…</p>
        </div>
      </div>
    )
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
