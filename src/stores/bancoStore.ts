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

let _mutar: MutarFn
export function setBancoMutar(m: MutarFn) { _mutar = m }

export const bancoStore = create<BancoStore>()(() => ({
  addBanco: (nombre) => {
    _mutar(d => { d.banco.push(nombre) })
  },

  delBanco: (i) => {
    _mutar(d => { d.banco.splice(i, 1) })
  },

  limpiarBanco: () => {
    _mutar(d => { d.banco = [] })
  },
}))
