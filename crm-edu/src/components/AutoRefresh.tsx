import { useEffect, useRef } from 'react'

interface AutoRefreshProps {
  /** Callback invoked each time the interval fires */
  onRefresh: () => void
  /** Skip setting up the interval (e.g., when loading or no connection) */
  skip?: boolean
  /** Interval in milliseconds. Default: 60 000 ms (60 s) */
  interval?: number
}

/**
 * Headless component that fires `onRefresh` on a configurable interval.
 * Renders nothing – pure side-effect.
 *
 * Usage:
 *   <AutoRefresh onRefresh={refresh} skip={loading} interval={60_000} />
 */
export function AutoRefresh({
  onRefresh,
  skip = false,
  interval = 60_000,
}: AutoRefreshProps) {
  // Keep a stable ref so the interval closure always calls the latest handler
  const cbRef = useRef(onRefresh)
  useEffect(() => {
    cbRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    if (skip) return

    const id = setInterval(() => {
      cbRef.current()
    }, interval)

    return () => clearInterval(id)
  }, [skip, interval])

  return null
}
