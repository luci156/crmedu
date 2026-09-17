import { useState, useEffect, useRef } from 'react'

/**
 * Trả về giá trị được debounce sau `delay` ms.
 * Dùng cho ô search để tránh filter lại mỗi lần gõ.
 */
export function useDebounce<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}

/**
 * Đếm ngược từ `seconds` về 0, reset khi `resetKey` thay đổi.
 */
export function useCountdown(seconds: number, resetKey: unknown): number {
  const [count, setCount] = useState(seconds)
  const keyRef = useRef(resetKey)

  useEffect(() => {
    if (keyRef.current !== resetKey) {
      keyRef.current = resetKey
      setCount(seconds)
    }
  }, [resetKey, seconds])

  useEffect(() => {
    setCount(seconds)
    const id = setInterval(() => setCount((c) => (c <= 1 ? seconds : c - 1)), 1000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  return count
}
