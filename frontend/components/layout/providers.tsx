"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ClerkProvider } from "@clerk/nextjs"
import { useAuth } from "@clerk/nextjs"
import React, { useEffect, useState } from "react"
import { setFastApiAuthTokenProvider } from "@/lib/fastapi-fetcher"

function FastApiAuthBridge() {
  const { getToken, isSignedIn } = useAuth()

  useEffect(() => {
    if (!isSignedIn) {
      setFastApiAuthTokenProvider(null)
      return
    }

    setFastApiAuthTokenProvider(async ({ skipCache } = {}) => {
      try {
        return await getToken({ skipCache: Boolean(skipCache) })
      } catch {
        return null
      }
    })

    return () => {
      setFastApiAuthTokenProvider(null)
    }
  }, [getToken, isSignedIn])

  return null
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  )

  return (
    <ClerkProvider>
      <QueryClientProvider client={queryClient}>
        <FastApiAuthBridge />
        {children}
      </QueryClientProvider>
    </ClerkProvider>
  )
}
