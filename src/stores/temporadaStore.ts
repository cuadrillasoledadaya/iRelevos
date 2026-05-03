// ══════════════════════════════════════════════════════════════════
// TEMPORADA STORE — Slice de temporadas (Phase 3.2)
// ══════════════════════════════════════════════════════════════════

import { create } from 'zustand'
import type { Temporada } from '@/lib/types'

export interface TemporadaStoreState {
  temporadas: Temporada[]
  activeTemporadaId: string
}

export interface TemporadaStoreActions {
  setActiveTemporadaId: (id: string) => void
  setTemporadas: (temporadas: Temporada[]) => void
}

export type TemporadaStore = TemporadaStoreState & TemporadaStoreActions

export const createTemporadaStore = () => create<TemporadaStore>()((set) => ({
    temporadas: [],
    activeTemporadaId: '',

    setActiveTemporadaId: (id) => set({ activeTemporadaId: id }),

    setTemporadas: (temporadas) => set({ temporadas }),
  }))

export const temporadaStore = createTemporadaStore()
