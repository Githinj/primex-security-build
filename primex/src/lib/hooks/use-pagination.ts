'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

interface UsePaginationOptions {
  /** Default page size when ?pageSize= is not in the URL. Defaults to 25. */
  defaultPageSize?: number
}

interface UsePaginationReturn {
  page: number
  pageSize: number
  /** Navigate to a new page. Updates ?page= in the URL via router.replace (no history entry). */
  setPage: (page: number) => void
}

/**
 * URL-based pagination state. Reads ?page= from searchParams.
 * Pass the returned { page, pageSize } directly to query functions as PaginationParams.
 */
export function usePagination(
  options: UsePaginationOptions = {}
): UsePaginationReturn {
  const { defaultPageSize = 25 } = options
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = defaultPageSize

  const setPage = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString())
      if (newPage <= 1) {
        params.delete('page')
      } else {
        params.set('page', String(newPage))
      }
      const qs = params.toString()
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`)
    },
    [router, pathname, searchParams]
  )

  return { page, pageSize, setPage }
}
