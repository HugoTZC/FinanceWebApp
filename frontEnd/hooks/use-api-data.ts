"use client"

import { useState, useEffect } from "react"

interface UseApiDataProps<T> {
  fetchFunction: () => Promise<T>
  dependencies?: any[]
  initialData?: T
}

export function useApiData<T>({ fetchFunction, dependencies = [], initialData }: UseApiDataProps<T>) {
  const [data, setData] = useState<T | undefined>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let isMounted = true

    async function fetchData() {
      try {
        setIsLoading(true)
        setError(null)
        const result = await fetchFunction()

        if (isMounted) {
          setData(result)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("An unknown error occurred"))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)

  return { data, isLoading, error, refetch: () => fetchFunction().then(setData) }
}

