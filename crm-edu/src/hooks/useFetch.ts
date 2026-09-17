import { useState, useEffect, useRef, useCallback } from 'react'

interface FetchState<T> {
  data: T | null
  loading: boolean
  error: string | null
  lastRefresh: Date
}

interface UseFetchOptions {
  /** Tự động fetch khi mount. Mặc định: true */
  immediate?: boolean
}

/**
 * Custom hook bọc data fetching với:
 * - AbortController: hủy request cũ khi có request mới
 * - Guard: không fetch đồng thời nhiều lần
 * - Error handling chuẩn
 */
export function useFetch<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: unknown[] = [],
  options: UseFetchOptions = {}
) {
  const { immediate = true } = options

  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: false,
    error: null,
    lastRefresh: new Date(),
  })

  const abortRef   = useRef<AbortController | null>(null)
  const loadingRef = useRef(false)

  const run = useCallback(async () => {
    // Hủy request đang chạy nếu có
    if (abortRef.current) abortRef.current.abort()

    const controller = new AbortController()
    abortRef.current = controller
    loadingRef.current = true

    setState((s) => ({ ...s, loading: true, error: null }))

    try {
      const data = await fetcher(controller.signal)
      if (controller.signal.aborted) return
      setState({ data, loading: false, error: null, lastRefresh: new Date() })
    } catch (err: unknown) {
      if (controller.signal.aborted) return
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định'
      setState((s) => ({ ...s, loading: false, error: msg }))
    } finally {
      loadingRef.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    if (immediate) run()
    return () => { abortRef.current?.abort() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run])

  return {
    ...state,
    data: state.data === null ? undefined : state.data,
    refresh: run,
  }
}
