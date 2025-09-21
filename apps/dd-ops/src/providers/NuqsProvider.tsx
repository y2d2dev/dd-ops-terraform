'use client'

import { NuqsAdapter } from 'nuqs/adapters/next/app'

interface NuqsProviderProps {
  children: React.ReactNode
}

/**
 * Nuqs provider for Next.js App Router
 */
export function NuqsProvider({ children }: NuqsProviderProps) {
  return <NuqsAdapter>{children}</NuqsAdapter>
}