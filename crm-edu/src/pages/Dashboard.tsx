import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  Users,
  UserCheck,
  Building2,
  BookOpen,
  Layers,
  Clock,
  CheckCircle,
  AlertTriangle,
  WifiOff,
  Settings,
  RefreshCw,
} from 'lucide-react'
import { Layout } from '../components/Layout'
import { StatCard } from '../components/StatCard'
import { Card } from '../components/Card'
import { AutoRefresh } from '../components/AutoRefresh'
import { useFetch } from '../hooks/useFetch'
import { getList, getClient } from '../api/frappeClient'
import type { Student, Department, Course, CourseOffering, AcademicTerm, ClassSession, StudentAttendance, StudentCourseEnrollment } from '../types/models'

// ── Palette ──────────────────────────────────────────────────────────────────

const ORANGE_PALETTE = [
  '#f97316', '#fb923c', '#fdba74', '#fed7aa',
  '#ea580c', '#c2410c', '#9a3412', '#ffedd5',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupBy<T extends Record<string, unknown>>(
  arr: T[],
  key: keyof T
): Record<string, number> {
  return arr.reduce<Record<string, number>>((acc, item) => {
    const k = String(item[key] ?? 'Không rõ')
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})
}

function toChartData(obj: Record<string, number>) {
  return Object.entries(obj)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardData {
  students: Student[]
  departments: Department[]
  courses: Course[]
  offerings: CourseOffering[]
  terms: AcademicTerm[]
  sessions: ClassSession[]
  attendances: StudentAttendance[]
  enrollments: StudentCourseEnrollment[]
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
      <div className="flex gap-4 items-center">
        <div className="w-12 h-12 rounded-xl bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-7 w-16 bg-gray-200 rounded" />
          <div className="h-3 w-28 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

function SkeletonChart() {
  return (
    <div className="card animate-pulse">
      <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
      <div className="h-48 bg-gray-100 rounded" />
    </div>
  )
}

// ── Not Connected Banner ───────────────────────────────────────────────────────

function NotConnectedBanner() {
  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-orange-100 flex-shrink-0">
        <WifiOff className="w-6 h-6 text-orange-600" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-orange-800 text-lg">Chưa kết nối Frappe</p>
        <p className="text-orange-700 text-sm mt-1">
          Dashboard cần kết nối đến Frappe để hiển thị dữ liệu thực.
          Vui lòng cấu hình kết nối trước khi sử dụng.
        </p>
      </div>
      <Link
        to="/connection"
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 transition-colors flex-shrink-0"
      >
        <Settings className="w-4 h-4" />
        Kết nối Frappe
      </Link>
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

function Badge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Active: 'bg-green-100 text-green-700',
    'In Progress': 'bg-blue-100 text-blue-700',
    Scheduled: 'bg-orange-100 text-orange-700',
    Completed: 'bg-gray-100 text-gray-600',
    Inactive: 'bg-red-100 text-red-700',
    Suspended: 'bg-red-100 text-red-700',
    'On Leave': 'bg-yellow-100 text-yellow-700',
    Graduated: 'bg-purple-100 text-purple-700',
    Withdrawn: 'bg-gray-100 text-gray-500',
  }
  const cls = map[status] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const isConnected = !!getClient()

  const fetcher = useCallback(async (_signal: AbortSignal): Promise<DashboardData> => {
    if (!getClient()) {
      return {
        students: [], departments: [], courses: [],
        offerings: [], terms: [], sessions: [],
        attendances: [], enrollments: [],
      }
    }

    const [students, departments, courses, offerings, terms, sessions, attendances, enrollments] =
      await Promise.all([
        getList<Student>('Student', {
          fields: ['name', 'student_name', 'student_status', 'department', 'program', 'attendance_rate', 'total_absent', 'gpa'],
          limit: 2000,
        }),
        getList<Department>('Department', {
          fields: ['name', 'department_name'],
          limit: 200,
        }),
        getList<Course>('Course', {
          fields: ['name', 'status', 'department', 'course_type'],
          limit: 500,
        }),
        getList<CourseOffering>('Course Offering', {
          fields: ['name', 'status', 'academic_term'],
          limit: 500,
        }),
        getList<AcademicTerm>('Academic Term', {
          fields: ['name', 'status', 'is_current'],
          limit: 100,
        }),
        getList<ClassSession>('Class Session', {
          fields: ['name', 'status', 'session_date', 'course_offering'],
          limit: 1000,
        }),
        getList<StudentAttendance>('Student Attendance', {
          fields: ['name', 'status', 'session_date', 'course_offering'],
          limit: 5000,
        }),
        getList<StudentCourseEnrollment>('Student Course Enrollment', {
          fields: ['name', 'status', 'course_offering'],
          limit: 2000,
        }),
      ])

    return { students, departments, courses, offerings, terms, sessions, attendances, enrollments }
  }, [])

  const { data, loading, error, lastRefresh, refresh } = useFetch<DashboardData>(fetcher)

  // ── Derived metrics ───────────────────────────────────────────────────────

  const students     = data?.students     ?? []
  const departments  = data?.departments  ?? []
  const courses      = data?.courses      ?? []
  const offerings    = data?.offerings    ?? []
  const sessions     = data?.sessions     ?? []
  const attendances  = data?.attendances  ?? []
  const enrollments  = data?.enrollments  ?? []

  const activeStudents = students.filter(s => s.student_status === 'Active').length

  const presentCount = attendances.filter(a => a.status === 'Present').length
  const attendanceRate =
    attendances.length > 0
      ? ((presentCount / attendances.length) * 100).toFixed(1)
      : '0.0'

  const riskStudents = students.filter(
    s => (s.attendance_rate ?? 100) < 75 || (s.total_absent ?? 0) >= 3
  ).length

  // Charts data
  const studentByStatus = toChartData(groupBy(students, 'student_status'))
  const studentByDept   = toChartData(groupBy(students, 'department'))
  const studentByProg   = toChartData(groupBy(students, 'program'))
  const courseByType    = toChartData(groupBy(courses, 'course_type'))

  // Top 10 most absent
  const top10Absent = [...students]
    .sort((a, b) => (b.total_absent ?? 0) - (a.total_absent ?? 0))
    .slice(0, 10)

  // Upcoming sessions
  const upcomingSessions = sessions
    .filter(s => s.status === 'Scheduled')
    .sort((a, b) => (a.session_date ?? '').localeCompare(b.session_date ?? ''))
    .slice(0, 10)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Layout
      title="Dashboard"
      lastRefresh={lastRefresh}
      onRefreshNow={refresh}
      loading={loading}
    >
      <AutoRefresh onRefresh={refresh} skip={loading || !isConnected} interval={60_000} />

      <div className="space-y-6">

        {/* ── Not connected banner ── */}
        {!isConnected && <NotConnectedBanner />}

        {/* ── KPI Row ── */}
        {loading ? (
          <SkeletonGrid />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              icon={<Users className="w-6 h-6" />}
              value={students.length}
              label="Tổng sinh viên"
              color="orange"
            />
            <StatCard
              icon={<UserCheck className="w-6 h-6" />}
              value={activeStudents}
              label="Đang học"
              color="green"
            />
            <StatCard
              icon={<Building2 className="w-6 h-6" />}
              value={departments.length}
              label="Khoa"
              color="blue"
            />
            <StatCard
              icon={<BookOpen className="w-6 h-6" />}
              value={courses.length}
              label="Môn học"
              color="purple"
            />
            <StatCard
              icon={<Layers className="w-6 h-6" />}
              value={offerings.length}
              label="Lớp học phần"
              color="blue"
            />
            <StatCard
              icon={<Clock className="w-6 h-6" />}
              value={sessions.length}
              label="Buổi học"
              color="gray"
            />
            <StatCard
              icon={<CheckCircle className="w-6 h-6" />}
              value={`${attendanceRate}%`}
              label="Tỷ lệ điểm danh"
              color="green"
            />
            <StatCard
              icon={<AlertTriangle className="w-6 h-6" />}
              value={riskStudents}
              label="Sinh viên rủi ro"
              color="red"
              sub="Vắng ≥3 buổi hoặc tỷ lệ <75%"
            />
          </div>
        )}

        {/* ── Charts row ── */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonChart key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Pie: Student status */}
            <Card>
              <h3 className="text-base font-semibold text-gray-800 mb-4">Trạng thái sinh viên</h3>
              {studentByStatus.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={studentByStatus}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={45}
                      paddingAngle={3}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {studentByStatus.map((_, idx) => (
                        <Cell key={idx} fill={ORANGE_PALETTE[idx % ORANGE_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} SV`, '']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Bar: Students by department */}
            <Card>
              <h3 className="text-base font-semibold text-gray-800 mb-4">Sinh viên theo khoa</h3>
              {studentByDept.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={studentByDept} margin={{ top: 4, right: 8, left: -10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      angle={-30}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" name="Sinh viên" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Bar: Students by program */}
            <Card>
              <h3 className="text-base font-semibold text-gray-800 mb-4">Sinh viên theo chương trình</h3>
              {studentByProg.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={studentByProg} margin={{ top: 4, right: 8, left: -10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      angle={-30}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" name="Sinh viên" fill="#fb923c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Bar: Courses by type */}
            <Card>
              <h3 className="text-base font-semibold text-gray-800 mb-4">Môn học theo loại</h3>
              {courseByType.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={courseByType} margin={{ top: 4, right: 8, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" name="Môn học" radius={[4, 4, 0, 0]}>
                      {courseByType.map((_, idx) => (
                        <Cell key={idx} fill={ORANGE_PALETTE[idx % ORANGE_PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>
        )}

        {/* ── Attendance summary cards ── */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card text-center">
              <p className="text-2xl font-bold text-gray-800">{attendances.length}</p>
              <p className="text-sm text-gray-500 mt-1">Tổng bản ghi điểm danh</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-green-600">{presentCount}</p>
              <p className="text-sm text-gray-500 mt-1">Có mặt</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-red-500">
                {attendances.filter(a => a.status === 'Absent').length}
              </p>
              <p className="text-sm text-gray-500 mt-1">Vắng</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-orange-600">{attendanceRate}%</p>
              <p className="text-sm text-gray-500 mt-1">Tỷ lệ có mặt</p>
            </div>
          </div>
        )}

        {/* ── Tables row ── */}
        {!loading && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* Table 1: Top 10 most absent */}
            <Card>
              <h3 className="text-base font-semibold text-gray-800 mb-4">
                Top 10 sinh viên vắng nhiều nhất
              </h3>
              {top10Absent.length === 0 ? (
                <EmptyTable message="Chưa có dữ liệu sinh viên" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-2 text-gray-500 font-medium w-8">STT</th>
                        <th className="text-left py-2 px-2 text-gray-500 font-medium">Sinh viên</th>
                        <th className="text-left py-2 px-2 text-gray-500 font-medium hidden sm:table-cell">Mã SV</th>
                        <th className="text-left py-2 px-2 text-gray-500 font-medium hidden md:table-cell">Khoa</th>
                        <th className="text-center py-2 px-2 text-gray-500 font-medium">Vắng</th>
                        <th className="text-center py-2 px-2 text-gray-500 font-medium hidden sm:table-cell">Tỷ lệ</th>
                        <th className="text-left py-2 px-2 text-gray-500 font-medium">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {top10Absent.map((s, i) => {
                        const isRisk = (s.total_absent ?? 0) >= 3
                        return (
                          <tr
                            key={s.name}
                            className={`border-b border-gray-50 ${isRisk ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                          >
                            <td className="py-2 px-2 text-gray-400">{i + 1}</td>
                            <td className="py-2 px-2">
                              <span className={`font-medium ${isRisk ? 'text-red-700' : 'text-gray-800'}`}>
                                {s.student_name}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-gray-500 hidden sm:table-cell">{s.name}</td>
                            <td className="py-2 px-2 text-gray-500 hidden md:table-cell text-xs">{s.department || '—'}</td>
                            <td className="py-2 px-2 text-center">
                              <span className={`font-bold ${isRisk ? 'text-red-600' : 'text-gray-700'}`}>
                                {s.total_absent ?? 0}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center hidden sm:table-cell text-gray-600">
                              {s.attendance_rate != null
                                ? `${Number(s.attendance_rate).toFixed(1)}%`
                                : '—'}
                            </td>
                            <td className="py-2 px-2">
                              <Badge status={s.student_status} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Table 2: Upcoming sessions */}
            <Card>
              <h3 className="text-base font-semibold text-gray-800 mb-4">
                Buổi học sắp tới
                <span className="ml-2 text-xs font-normal text-gray-400">(trạng thái: Scheduled)</span>
              </h3>
              {upcomingSessions.length === 0 ? (
                <EmptyTable message="Không có buổi học sắp tới" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-2 text-gray-500 font-medium w-8">STT</th>
                        <th className="text-left py-2 px-2 text-gray-500 font-medium">Lớp học phần</th>
                        <th className="text-left py-2 px-2 text-gray-500 font-medium">Ngày</th>
                        <th className="text-left py-2 px-2 text-gray-500 font-medium">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcomingSessions.map((s, i) => (
                        <tr key={s.name} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2 px-2 text-gray-400">{i + 1}</td>
                          <td className="py-2 px-2 text-gray-700 truncate max-w-[160px]">
                            {s.course_offering || s.name}
                          </td>
                          <td className="py-2 px-2 text-gray-600">
                            {s.session_date
                              ? new Date(s.session_date).toLocaleDateString('vi-VN')
                              : '—'}
                          </td>
                          <td className="py-2 px-2">
                            <Badge status={s.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── Error state ── */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-700 font-medium text-sm">Lỗi tải dữ liệu</p>
              <p className="text-red-600 text-xs mt-0.5">{error}</p>
            </div>
            <button
              onClick={refresh}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-medium hover:bg-red-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Thử lại
            </button>
          </div>
        )}

        {/* ── No data at all (connected but empty) ── */}
        {!loading && !error && isConnected && students.length === 0 && courses.length === 0 && (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="w-14 h-14 text-gray-200 mb-4" />
            <p className="text-gray-500 font-medium text-lg">Chưa có dữ liệu</p>
            <p className="text-gray-400 text-sm mt-1 max-w-sm">
              Frappe đã kết nối nhưng chưa có sinh viên hoặc môn học nào.
              Hãy nhập dữ liệu vào Frappe để bắt đầu.
            </p>
            <button
              onClick={refresh}
              className="mt-4 flex items-center gap-2 btn-primary"
            >
              <RefreshCw className="w-4 h-4" />
              Tải lại
            </button>
          </div>
        )}

      </div>
    </Layout>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function EmptyChart() {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-gray-300">
      <BookOpen className="w-10 h-10 mb-2" />
      <p className="text-sm">Chưa có dữ liệu</p>
    </div>
  )
}

function EmptyTable({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-gray-300">
      <Users className="w-8 h-8 mb-2" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
