import { useState, useDeferredValue } from 'react'
import { Layout } from '../components/Layout'
import { AutoRefresh } from '../components/AutoRefresh'
import { TableSkeleton } from '../components/Skeleton'
import { useFetch } from '../hooks/useFetch'
import { useDebounce } from '../hooks/useUtils'
import { getList } from '../api/frappeClient'
import type { Student } from '../types/models'

interface RiskStudent extends Student {
  riskLevel: 'high' | 'medium'
  reasons: string[]
}

function calcRisk(s: Student): RiskStudent | null {
  const reasons: string[] = []
  const rate = s.attendance_rate ?? 100
  const absent = s.total_absent ?? 0

  if (rate < 60) reasons.push(`Tỉ lệ điểm danh rất thấp (${rate.toFixed(1)}%)`)
  else if (rate < 75) reasons.push(`Tỉ lệ điểm danh thấp (${rate.toFixed(1)}%)`)

  if (absent >= 5) reasons.push(`Vắng nhiều buổi (${absent} buổi)`)
  else if (absent >= 3) reasons.push(`Có dấu hiệu vắng (${absent} buổi)`)

  if (s.gpa != null && s.gpa < 1.5) reasons.push(`GPA thấp (${s.gpa.toFixed(2)})`)

  if (reasons.length === 0) return null

  const riskLevel: 'high' | 'medium' = rate < 60 || absent >= 5 ? 'high' : 'medium'
  return { ...s, riskLevel, reasons }
}

export default function EarlyWarning() {
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<'all' | 'high' | 'medium'>('all')

  const debouncedSearch = useDebounce(search, 200)
  const deferredSearch = useDeferredValue(debouncedSearch)

  const { data: students = [], loading, error, lastRefresh, refresh } = useFetch<Student[]>(
    async (signal) => {
      return getList<Student>('Student', {
        fields: [
          'name', 'student_id', 'student_name', 'student_status', 'department',
          'program', 'attendance_rate', 'total_absent', 'gpa', 'advisor',
        ],
        filters: [['student_status', '=', 'Active'] as [string, string, string]],
        limit: 1000,
        signal,
      })
    }
  )

  const riskStudents: RiskStudent[] = (students ?? []).map(calcRisk).filter((r): r is RiskStudent => r !== null)

  const filtered = riskStudents.filter((s) => {
    const q = deferredSearch.toLowerCase()
    const matchQ = !q || (s.student_name ?? '').toLowerCase().includes(q) || (s.student_id ?? '').toLowerCase().includes(q)
    const matchL = levelFilter === 'all' || s.riskLevel === levelFilter
    return matchQ && matchL
  })

  const high = riskStudents.filter((s) => s.riskLevel === 'high').length
  const medium = riskStudents.filter((s) => s.riskLevel === 'medium').length

  return (
    <Layout title="⚠️ Cảnh Báo Sớm Sinh Viên" lastRefresh={lastRefresh} onRefreshNow={refresh} loading={loading}>
      <AutoRefresh onRefresh={refresh} skip={loading} />

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">⚠️ {error}</div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="card text-center">
          <p className="text-2xl font-bold text-red-600">{high}</p>
          <p className="text-xs text-gray-500 mt-1">Nguy Cơ Cao</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-yellow-600">{medium}</p>
          <p className="text-xs text-gray-500 mt-1">Nguy Cơ Trung Bình</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-primary-600">{riskStudents.length}</p>
          <p className="text-xs text-gray-500 mt-1">Tổng Cần Chú Ý</p>
        </div>
      </div>

      {/* Warning criteria */}
      <div className="card mb-4 bg-amber-50 border border-amber-200">
        <p className="text-sm font-semibold text-amber-800 mb-2">📌 Tiêu chí cảnh báo sớm</p>
        <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
          <li>Tỉ lệ điểm danh &lt; 75% → Nguy cơ trung bình</li>
          <li>Tỉ lệ điểm danh &lt; 60% → Nguy cơ cao</li>
          <li>Vắng mặt ≥ 3 buổi → Có dấu hiệu vắng</li>
          <li>Vắng mặt ≥ 5 buổi → Nguy cơ cao</li>
          <li>GPA &lt; 1.5 → Cảnh báo học lực</li>
        </ul>
      </div>

      {/* Filters */}
      <div className="card mb-4 flex flex-wrap gap-3 items-center">
        <input
          className="input flex-1 min-w-[180px]"
          placeholder="🔍 Tìm sinh viên nguy cơ…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-2">
          {(['all', 'high', 'medium'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLevelFilter(l)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                levelFilter === l
                  ? l === 'high' ? 'bg-red-500 text-white'
                  : l === 'medium' ? 'bg-yellow-400 text-white'
                  : 'bg-primary-500 text-white'
                  : 'border border-gray-200 text-gray-600 hover:border-primary-300'
              }`}
            >
              {l === 'all' ? 'Tất cả' : l === 'high' ? '🔴 Cao' : '🟡 Trung bình'}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-500">{filtered.length} sinh viên</span>
      </div>

      {/* Table */}
      {loading && riskStudents.length === 0 ? (
        <TableSkeleton rows={6} cols={9} />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Mức Độ</th><th>Mã SV</th><th>Họ Tên</th><th>Khoa</th>
                <th>Ngành</th><th>TL Điểm Danh</th><th>Vắng</th><th>GPA</th><th>Lý Do</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.name}>
                  <td>
                    <span className={`badge ${s.riskLevel === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {s.riskLevel === 'high' ? '🔴 Cao' : '🟡 TB'}
                    </span>
                  </td>
                  <td className="font-mono text-xs text-gray-500">{s.student_id ?? s.name}</td>
                  <td className="font-semibold text-gray-900">{s.student_name}</td>
                  <td className="text-gray-500">{s.department}</td>
                  <td className="text-gray-500">{s.program}</td>
                  <td className={s.riskLevel === 'high' ? 'text-red-600 font-bold' : 'text-yellow-600 font-semibold'}>
                    {s.attendance_rate != null ? `${s.attendance_rate.toFixed(1)}%` : '—'}
                  </td>
                  <td className="text-red-600 font-semibold">{s.total_absent ?? 0}</td>
                  <td>{s.gpa != null ? s.gpa.toFixed(2) : '—'}</td>
                  <td className="text-xs text-gray-600 max-w-[220px] whitespace-normal">
                    {s.reasons.join(' · ')}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-gray-400 py-10">
                    {riskStudents.length === 0 ? '✅ Không có sinh viên nguy cơ cần cảnh báo' : 'Không có kết quả phù hợp'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}
