"use client"

import { useEffect, useState } from "react"

const TRANSACTIONS_CHANGED_EVENT = "fricmx:transactions-changed"

export function notifyTransactionsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TRANSACTIONS_CHANGED_EVENT))
  }
}

export function useTransactionRefresh() {
  const [refreshVersion, setRefreshVersion] = useState(0)

  useEffect(() => {
    const refresh = () => setRefreshVersion((version) => version + 1)

    window.addEventListener(TRANSACTIONS_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(TRANSACTIONS_CHANGED_EVENT, refresh)
  }, [])

  return refreshVersion
}
