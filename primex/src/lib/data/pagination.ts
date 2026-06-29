export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Apply pagination to a Supabase query builder.
 * Must be called after .order() — adds .range() to slice the sorted result.
 * The query must use .select('*', { count: 'exact' }) for the total count.
 */
export function applyPagination(
  query: { range: (from: number, to: number) => any },
  pagination: PaginationParams
) {
  const from = (pagination.page - 1) * pagination.pageSize
  const to = from + pagination.pageSize - 1
  return query.range(from, to)
}

/**
 * Wrap raw Supabase response into a PaginatedResult.
 * count is null only if { count: 'exact' } was omitted — should not occur
 * when used with the paginated query branch.
 */
export function toPaginatedResult<T>(
  data: T[],
  count: number | null,
  pagination: PaginationParams
): PaginatedResult<T> {
  const total = count ?? data.length
  return {
    data,
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.ceil(total / pagination.pageSize),
  }
}
