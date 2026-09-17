/** Skeleton shimmer dùng cho loading state */
interface Props {
  rows?: number
  cols?: number
  className?: string
}

function ShimmerRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3 border-t border-gray-100">
          <div className="h-3 bg-gray-200 rounded-full animate-pulse" style={{ width: `${55 + (i * 17) % 40}%` }} />
        </td>
      ))}
    </tr>
  )
}

export function TableSkeleton({ rows = 6, cols = 6 }: Props) {
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}>
                <div className="h-3 bg-primary-200 rounded-full animate-pulse w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <ShimmerRow key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`card space-y-3 ${className}`}>
      <div className="h-4 bg-gray-200 rounded-full animate-pulse w-1/3" />
      <div className="h-3 bg-gray-100 rounded-full animate-pulse w-full" />
      <div className="h-3 bg-gray-100 rounded-full animate-pulse w-5/6" />
      <div className="h-3 bg-gray-100 rounded-full animate-pulse w-4/6" />
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 p-5 flex gap-4 items-center bg-white">
      <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse flex-shrink-0" />
      <div className="space-y-2 flex-1">
        <div className="h-5 bg-gray-200 rounded-full animate-pulse w-16" />
        <div className="h-3 bg-gray-100 rounded-full animate-pulse w-24" />
      </div>
    </div>
  )
}
