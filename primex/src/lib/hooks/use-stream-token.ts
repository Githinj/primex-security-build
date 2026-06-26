'use client'

import { useState, useEffect, useCallback } from 'react'
import { getStreamToken } from '@/lib/data/actions/streaming'
import type { StreamToken } from '@/lib/types'

interface UseStreamTokenReturn {
  token: StreamToken | null
  isLoading: boolean
  error: string | null
  refresh: () => void
}

export function useStreamToken(cameraId: string | null): UseStreamTokenReturn {
  const [token, setToken] = useState<StreamToken | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchToken = useCallback(async () => {
    if (!cameraId) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await getStreamToken(cameraId)
      if (!result) {
        setError('No stream available')
      } else {
        setToken(result)
      }
    } catch (err) {
      setError('Failed to get stream token')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [cameraId])

  useEffect(() => {
    fetchToken()
  }, [fetchToken])

  useEffect(() => {
    if (!token) return
    const refreshIn = token.expiresAt - Date.now() - 5 * 60 * 1000
    if (refreshIn <= 0) {
      fetchToken()
      return
    }
    const timer = setTimeout(fetchToken, refreshIn)
    return () => clearTimeout(timer)
  }, [token, fetchToken])

  return { token, isLoading, error, refresh: fetchToken }
}
