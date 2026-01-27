import { useState, useEffect } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ipcLink } from "trpc-electron/renderer"
import { trpc } from "../lib/trpc"
import superjson from "superjson"

interface TRPCProviderProps {
  children: React.ReactNode
}

// Global query client instance for use outside React components
let globalQueryClient: QueryClient | null = null

export function getQueryClient(): QueryClient | null {
  return globalQueryClient
}

export function TRPCProvider({ children }: TRPCProviderProps) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5000,
          refetchOnWindowFocus: false,
          networkMode: "always",
          retry: false,
        },
        mutations: {
          networkMode: "always",
          retry: false,
        },
      },
    })
    globalQueryClient = client
    return client
  })

  const [trpcClient] = useState(() => {
    console.log("[TRPCProvider] Creating tRPC client...")
    try {
      const client = trpc.createClient({
        links: [
          ipcLink({
            transformer: superjson,
          }),
        ],
      })
      console.log("[TRPCProvider] tRPC client created successfully")
      return client
    } catch (error) {
      console.error("[TRPCProvider] Failed to create tRPC client:", error)
      throw error
    }
  })

  // Log when provider mounts
  useEffect(() => {
    console.log("[TRPCProvider] Mounted")
    return () => {
      console.log("[TRPCProvider] Unmounted")
    }
  }, [])

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}
