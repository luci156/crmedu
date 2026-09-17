import { ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

type Color = 'orange' | 'green' | 'blue' | 'purple' | 'red' | 'gray'

interface StatCardProps {
  /** Icon component (ReactNode) or emoji string */
  icon?: ReactNode | string
  /** The primary metric value */
  value: string | number
  /** Card label / title */
  label: string
  /** Optional sub-text beneath the label */
  sub?: string
  /** Colour theme */
  color?: Color
  /** Trend % (positive = up, negative = down) */
  trend?: number
  /** Trend label e.g. 'so với tháng trước' */
  trendLabel?: string
  /** Show skeleton while loading */
  loading?: boolean
}

// ── Colour map ───────────────────────────────────────────────────────────────

const colorMap: Record<Color, { card: string; icon: string; text: string }> = {
  orange: {
    card: 'border-orange-200 bg-orange-50',
    icon: 'bg-orange-100 text-orange-600',
    text: 'text-orange-600',
  },
  green: {
    card: 'border-green-200 bg-green-50',
    icon: 'bg-green-100 text-green-600',
    text: 'text-green-600',
  },
  blue: {
    card: 'border-blue-200 bg-blue-50',
    icon: 'bg-blue-100 text-blue-600',
    text: 'text-blue-600',
  },
  purple: {
    card: 'border-purple-200 bg-purple-50',
    icon: 'bg-purple-100 text-purple-600',
    text: 'text-purple-600',
  },
  red: {
    card: 'border-red-200 bg-red-50',
    icon: 'bg-red-100 text-red-600',
    text: 'text-red-600',
  },
  gray: {
    card: 'border-gray-200 bg-gray-50',
    icon: 'bg-gray-100 text-gray-500',
    text: 'text-gray-500',
  },
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 flex gap-4 items-center shadow-sm animate-pulse">
      <div className="w-12 h-12 rounded-xl bg-gray-200 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-7 w-16 bg-gray-200 rounded" />
        <div className="h-3 w-24 bg-gray-100 rounded" />
      </div>
    </div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

export function StatCard({
  icon,
  value,
  label,
  sub,
  color = 'orange',
  trend,
  trendLabel,
  loading = false,
}: StatCardProps) {
  if (loading) return <StatCardSkeleton />

  const c = colorMap[color]
  const isStringIcon = typeof icon === 'string'

  return (
    <div
      className={`rounded-2xl border p-5 flex gap-4 items-center shadow-sm transition-shadow hover:shadow-md ${c.card}`}
    >
      {/* Icon area */}
      {icon && (
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${c.icon}`}
        >
          {isStringIcon ? (
            <span className="text-2xl select-none">{icon}</span>
          ) : (
            <span className="w-6 h-6">{icon}</span>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-2xl font-bold leading-tight ${c.text}`}>{value}</p>
        <p className="text-sm font-medium text-gray-600 mt-0.5 truncate">{label}</p>

        {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}

        {/* Trend indicator */}
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-1">
            {trend >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
            )}
            <span
              className={`text-xs font-medium ${
                trend >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend >= 0 ? '+' : ''}
              {trend.toFixed(1)}%
            </span>
            {trendLabel && (
              <span className="text-xs text-gray-400">{trendLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
