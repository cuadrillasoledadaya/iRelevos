'use client'

import { useAppInit } from '@/hooks/useEstado'

export function AppInitializer({ children }: { children: React.ReactNode }) {
  useAppInit()
  return <>{children}</>
}
