// ══════════════════════════════════════════════════════════════════
// BANCO STORE — Slice del banco de costaleros (Phase 6.1)
// ══════════════════════════════════════════════════════════════════

import { create } from 'zustand'
import type { DatosPerfil } from '@/lib/types'

export interface BancoStore {
  addBanco: (nombre: string) => void
  delBanco: (i: number) => void
  limpiarBanco: () => void
}

type MutarFn = (fn: (draft: DatosPerfil) => void) => void

export function createBancoStore(mutar: MutarFn) {
  return create<BancoStore>()(() => ({
    addBanco: (nombre) => {
      mutar(d => { d.banco.push(nombre) })
    },

    delBanco: (i) => {
      mutar(d => { d.banco.splice(i, 1) })
    },

    limpiarBanco: () => {
      mutar(d => { d.banco = [] })
    },
  }))
}
