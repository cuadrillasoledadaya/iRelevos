'use client'

import { useAppInit } from '@/hooks/useAppInit'

export function AppInitializer({ children }: { children: React.ReactNode }) {
  useAppInit()
  return <>{children}</>
}
