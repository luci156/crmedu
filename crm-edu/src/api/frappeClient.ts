import axios, { AxiosInstance, AxiosError, isAxiosError } from 'axios'
import type { ConnectionProfile } from '../types/models'

// ─── Storage Keys ─────────────────────────────────────────────────────────────
export const PROFILES_KEY = 'crm_edu_profiles'
export const ACTIVE_PROFILE_KEY = 'crm_edu_active_profile'

// ─── Error Messages (Vietnamese) ─────────────────────────────────────────────
const ERROR_MESSAGES: Record<number, string> = {
  401: 'Phiên đăng nhập đã hết hạn. Vui lòng kiểm tra API Key.',
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy dữ liệu.',
  409: 'Dữ liệu đã tồn tại hoặc bị trùng.',
  422: 'Dữ liệu không hợp lệ.',
  429: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
  500: 'Frappe Server đang gặp lỗi. Vui lòng thử lại.',
}

// ─── Error Formatter ──────────────────────────────────────────────────────────
export function formatApiError(err: unknown): string {
  if (isAxiosError(err)) {
    const status = err.response?.status
    if (status && ERROR_MESSAGES[status]) return ERROR_MESSAGES[status]
    const responseData = err.response?.data as Record<string, unknown> | undefined
    if (responseData) {
      if (typeof responseData.exception === 'string' && responseData.exception) {
        const msg = responseData.exception.split(':').slice(1).join(':').trim()
        if (msg) return msg
      }
      if (typeof responseData.message === 'string' && responseData.message) {
        return responseData.message
      }
      if (typeof responseData._server_messages === 'string') {
        try {
          const parsed = JSON.parse(responseData._server_messages as string)
          if (Array.isArray(parsed) && parsed.length > 0) {
            const first = JSON.parse(parsed[0])
            if (first?.message) return first.message
          }
        } catch { /* ignore parse errors */ }
      }
    }
    if (err.message === 'Network Error') {
      return 'Không thể kết nối tới Frappe. Kiểm tra URL và kết nối mạng.'
    }
    return err.message || 'Đã xảy ra lỗi không xác định.'
  }
  if (err instanceof Error) return err.message
  return 'Đã xảy ra lỗi không xác định.'
}

// ─── Profile Management ───────────────────────────────────────────────────────
export function loadProfiles(): ConnectionProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY)
    if (!raw) return []
    return JSON.parse(raw) as ConnectionProfile[]
  } catch { return [] }
}

export function saveProfiles(profiles: ConnectionProfile[]): void {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
}

export function getActiveProfile(): ConnectionProfile | null {
  try {
    const activeId = localStorage.getItem(ACTIVE_PROFILE_KEY)
    if (!activeId) return null
    return loadProfiles().find((p) => p.id === activeId) ?? null
  } catch { return null }
}

export function setActiveProfile(id: string): void {
  localStorage.setItem(ACTIVE_PROFILE_KEY, id)
  const profile = loadProfiles().find((p) => p.id === id)
  if (profile) initClientFromProfile(profile)
}

export function addProfile(profile: ConnectionProfile): void {
  const profiles = loadProfiles()
  profiles.push(profile)
  saveProfiles(profiles)
}

export function updateProfile(id: string, updates: Partial<ConnectionProfile>): void {
  const profiles = loadProfiles()
  const idx = profiles.findIndex((p) => p.id === id)
  if (idx !== -1) {
    profiles[idx] = { ...profiles[idx], ...updates }
    saveProfiles(profiles)
    const activeId = localStorage.getItem(ACTIVE_PROFILE_KEY)
    if (activeId === id) initClientFromProfile(profiles[idx])
  }
}

export function deleteProfile(id: string): void {
  saveProfiles(loadProfiles().filter((p) => p.id !== id))
  if (localStorage.getItem(ACTIVE_PROFILE_KEY) === id) {
    localStorage.removeItem(ACTIVE_PROFILE_KEY)
    currentClient = null
  }
}

// ─── Axios Client ──────────────────────────────────────────────────────────────
let currentClient: AxiosInstance | null = null

export function initClientFromProfile(profile: ConnectionProfile): void {
  const baseURL = profile.baseURL.replace(/\/$/, '')
  currentClient = axios.create({
    baseURL,
    timeout: 30_000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `token ${profile.apiKey}:${profile.apiSecret}`,
    },
    withCredentials: false,
  })
}

export function getClient(): AxiosInstance | null {
  if (currentClient) return currentClient
  const profile = getActiveProfile()
  if (profile) { initClientFromProfile(profile); return currentClient }
  return null
}

export function autoInitClient(): void {
  const profile = getActiveProfile()
  if (profile) initClientFromProfile(profile)
}

// Auto-init on module load
autoInitClient()

// ─── List Params ──────────────────────────────────────────────────────────────
export interface ListParams {
  fields?: string[]
  filters?: [string, string, string, unknown][]
  order_by?: string
  limit?: number
  limit_start?: number
  signal?: AbortSignal
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

/** Fetch a list. Returns [] if no client configured – does NOT throw. */
const resolvedDoctypeMap = new Map<string, string>()

async function resolveDoctype(doctype: string): Promise<string> {
  if (resolvedDoctypeMap.has(doctype)) return resolvedDoctypeMap.get(doctype)!
  
  const aliases = [doctype]
  if (doctype === 'Course') aliases.push('Courses', 'LMS Course')
  if (doctype === 'Student') aliases.push('Students')
  if (doctype === 'Department') aliases.push('Departments')
  if (doctype === 'Program') aliases.push('Programs')
  if (doctype === 'Academic Term') aliases.push('Academic Terms', 'Terms', 'Term')
  if (doctype === 'Course Offering') aliases.push('Course Offerings', 'Offerings', 'Offering')
  if (doctype === 'Student Course Enrollment') aliases.push('Student Course Enrollments', 'Enrollments', 'Enrollment', 'Course Enrollment')
  if (doctype === 'Class Session') aliases.push('Class Sessions', 'Class Sesion', 'Class Sesions', 'Sessions', 'Session')
  if (doctype === 'Student Attendance') aliases.push('Student Attendances', 'Attendances', 'Attendance')
  
  const client = getClient()
  if (!client) return doctype
  
  let lastError: unknown
  for (const dt of aliases) {
    try {
      // Just fetch 1 record to test existence
      await client.get(`/api/resource/${encodeURIComponent(dt)}`, { params: { limit_page_length: 1 } })
      resolvedDoctypeMap.set(doctype, dt)
      return dt
    } catch (err) {
      lastError = err
      if (isAxiosError(err) && err.response?.status === 404) continue
      // If 403 Forbidden or other errors, the doctype exists but we might not have access, we still map it
      resolvedDoctypeMap.set(doctype, dt)
      return dt
    }
  }
  return doctype // fallback to original if all fail
}

export async function getList<T = Record<string, unknown>>(
  doctype: string,
  params?: ListParams,
): Promise<T[]> {
  const client = getClient()
  if (!client) return []
  const { signal, filters, order_by, limit = 500, limit_start = 0 } = params ?? {}

  const actualDoctype = await resolveDoctype(doctype)
  try {
    const response = await client.get<{ data: T[] }>(
      `/api/resource/${encodeURIComponent(actualDoctype)}`,
      {
        signal,
        params: {
          fields: JSON.stringify(['*']),
          filters: filters ? JSON.stringify(filters) : undefined,
          order_by,
          limit_page_length: limit,
          limit_start,
        },
      }
    )
    return response.data?.data ?? []
  } catch (err: unknown) {
    if (axios.isCancel(err)) return []
    if (isAxiosError(err) && err.code === 'ERR_CANCELED') return []
    if (isAxiosError(err) && err.name === 'AbortError') return []
    throw new Error(formatApiError(err))
  }
}

/** Fetch single doc. Returns null on 404 or no client. */
export async function getDoc<T = Record<string, unknown>>(
  doctype: string,
  name: string,
  signal?: AbortSignal,
): Promise<T | null> {
  const client = getClient()
  if (!client) return null
  const actualDoctype = await resolveDoctype(doctype)
  try {
    const response = await client.get<{ data: T }>(
      `/api/resource/${encodeURIComponent(actualDoctype)}/${encodeURIComponent(name)}`,
      { signal }
    )
    return response.data?.data ?? null
  } catch (err) {
    if (axios.isCancel(err)) return null
    if (isAxiosError(err) && err.code === 'ERR_CANCELED') return null
    if (isAxiosError(err) && err.response?.status === 404) return null
    throw new Error(formatApiError(err))
  }
}

/** Create new doc. Throws on error. */
export async function createDoc<T = Record<string, unknown>>(doctype: string, doc: Partial<T>): Promise<T> {
  const client = getClient()
  if (!client) throw new Error('Chưa kết nối Frappe.')
  const actualDoctype = await resolveDoctype(doctype)
  try {
    const response = await client.post<{ data: T }>(`/api/resource/${encodeURIComponent(actualDoctype)}`, doc)
    return response.data.data
  } catch (err) {
    throw new Error(formatApiError(err))
  }
}

/** Update existing doc. Throws on error. */
export async function updateDoc<T = Record<string, unknown>>(
  doctype: string,
  name: string,
  doc: Partial<T>,
): Promise<T> {
  const client = getClient()
  if (!client) throw new Error('Chưa kết nối Frappe.')
  const actualDoctype = await resolveDoctype(doctype)
  try {
    const response = await client.put<{ data: T }>(
      `/api/resource/${encodeURIComponent(actualDoctype)}/${encodeURIComponent(name)}`,
      doc,
    )
    return response.data.data
  } catch (err) {
    throw new Error(formatApiError(err))
  }
}

/** Delete a doc. Throws on error. */
export async function deleteDoc(doctype: string, name: string): Promise<void> {
  const client = getClient()
  if (!client) throw new Error('Chưa kết nối Frappe.')
  const actualDoctype = await resolveDoctype(doctype)
  try {
    await client.delete(`/api/resource/${encodeURIComponent(actualDoctype)}/${encodeURIComponent(name)}`)
  } catch (err) {
    throw new Error(formatApiError(err))
  }
}

/** Test a profile without touching the active client. */
export async function testConnectionProfile(
  profile: ConnectionProfile,
): Promise<{ ok: boolean; version?: string; user?: string; responseTime: number; error?: string }> {
  const baseURL = profile.baseURL.replace(/\/$/, '')
  const testClient = axios.create({
    baseURL,
    timeout: 10_000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `token ${profile.apiKey}:${profile.apiSecret}`,
    },
    withCredentials: false,
  })
  const start = Date.now()
  try {
    await testClient.get('/api/method/frappe.client.get_value', {
      params: { doctype: 'System Settings', fieldname: 'language' },
    })
    const responseTime = Date.now() - start
    let user: string | undefined
    let version: string | undefined
    try {
      const r = await testClient.get<{ message: string }>('/api/method/frappe.auth.get_logged_user')
      user = r.data?.message
    } catch { /* non-fatal */ }
    try {
      const r = await testClient.get('/api/method/frappe.utils.get_site_info')
      version = (r.data as Record<string, unknown>)?.frappe_version as string | undefined
    } catch { /* non-fatal */ }
    return { ok: true, version, user, responseTime }
  } catch (err: unknown) {
    let errMsg = formatApiError(err);
    if (isAxiosError(err) && err.message === 'Network Error') {
        errMsg = 'Lỗi mạng hoặc CORS (Trình duyệt chặn kết nối). Hãy đảm bảo Frappe server đang chạy và cho phép CORS (allow_cors).';
    }
    return { ok: false, responseTime: Date.now() - start, error: errMsg }
  }
}

/** Get Frappe version and current user from the active connection. */
export async function getSystemInfo(): Promise<{ version: string; user: string } | null> {
  const client = getClient()
  if (!client) return null
  try {
    const [userRes, versionRes] = await Promise.allSettled([
      client.get<{ message: string }>('/api/method/frappe.auth.get_logged_user'),
      client.get('/api/method/frappe.utils.get_site_info'),
    ])
    const user = userRes.status === 'fulfilled' ? (userRes.value.data?.message ?? '') : ''
    const version =
      versionRes.status === 'fulfilled'
        ? ((versionRes.value.data as Record<string, unknown>)?.frappe_version as string) ?? ''
        : ''
    if (!user && !version) return null
    return { version, user }
  } catch { return null }
}
