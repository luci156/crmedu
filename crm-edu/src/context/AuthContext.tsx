import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// ── Tài khoản cục bộ ─────────────────────────────────────
// Thay đổi ở đây nếu muốn đổi mật khẩu
const LOCAL_USERS = [
  { username: 'admin',   password: 'admin',    full_name: 'Quản Trị Viên', role: 'Admin' },
  { username: 'admin',   password: 'admin123', full_name: 'Quản Trị Viên', role: 'Admin' },
  { username: 'teacher', password: '123456',   full_name: 'Giảng Viên',    role: 'Teacher' },
]

// ── Types ────────────────────────────────────────────────
export interface AuthUser {
  username: string
  full_name: string
  role: string
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AUTH_KEY = 'crm_edu_local_auth'

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore session
  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY)
      if (raw) setUser(JSON.parse(raw) as AuthUser)
    } catch { /* ignore */ }
    setIsLoading(false)
  }, [])

  async function login(username: string, password: string) {
    // Giả lập delay nhỏ cho UX mượt
    await new Promise((r) => setTimeout(r, 600))

    const found = LOCAL_USERS.find(
      (u) => u.username === username.trim() && u.password === password
    )

    if (!found) {
      throw new Error('Sai tên đăng nhập hoặc mật khẩu.')
    }

    const authUser: AuthUser = {
      username: found.username,
      full_name: found.full_name,
      role: found.role,
    }

    localStorage.setItem(AUTH_KEY, JSON.stringify(authUser))
    setUser(authUser)
  }

  function logout() {
    localStorage.removeItem(AUTH_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
