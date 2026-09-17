import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/ui/Toast'
import { ProtectedRoute } from './components/ProtectedRoute'

import Login from './pages/Login'

// ── Lazy load pages ─────────────────────────────────────────────────────────
const Dashboard    = lazy(() => import('./pages/Dashboard'))
const StudentList  = lazy(() => import('./pages/StudentList'))
const Departments  = lazy(() => import('./pages/Departments'))
const Programs     = lazy(() => import('./pages/Programs'))
const Terms        = lazy(() => import('./pages/Terms'))
const Courses      = lazy(() => import('./pages/Courses'))
const Offerings    = lazy(() => import('./pages/Offerings'))
const Enrollments  = lazy(() => import('./pages/Enrollments'))
const Sessions     = lazy(() => import('./pages/Sessions'))
const Attendance   = lazy(() => import('./pages/Attendance'))
const Connection   = lazy(() => import('./pages/Connection'))
const Settings     = lazy(() => import('./pages/Settings'))
const EarlyWarning = lazy(() => import('./pages/EarlyWarning'))

/** Loading fallback animation */
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-orange-500 animate-pulse flex items-center justify-center shadow-lg shadow-orange-200">
          <span className="text-white font-bold text-xl select-none">E</span>
        </div>
        <div className="flex gap-1.5">
          <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-xs text-gray-400 font-medium">CRM EDU đang tải...</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<Login />} />

              {/* Protected */}
              <Route element={<ProtectedRoute />}>
                <Route path="/"              element={<Dashboard />} />
                <Route path="/students"      element={<StudentList />} />
                <Route path="/departments"   element={<Departments />} />
                <Route path="/programs"      element={<Programs />} />
                <Route path="/terms"         element={<Terms />} />
                <Route path="/courses"       element={<Courses />} />
                <Route path="/offerings"     element={<Offerings />} />
                <Route path="/enrollments"   element={<Enrollments />} />
                <Route path="/sessions"      element={<Sessions />} />
                <Route path="/attendance"    element={<Attendance />} />
                <Route path="/connection"    element={<Connection />} />
                <Route path="/settings"      element={<Settings />} />
                <Route path="/early-warning" element={<EarlyWarning />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  )
}
