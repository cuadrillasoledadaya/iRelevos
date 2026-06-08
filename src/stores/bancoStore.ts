// ══════════════════════════════════════════════════════════════════
// BANCO STORE — Slice del banco de costaleros (Phase 6.1)
// ══════════════════════════════════════════════════════════════════

import { create } from 'zustand'
import type { DatosPerfil } from '@/lib/types'

export interface BancoStore {
  addBanco: (nombre: string) => void
  delBanco: (i: number) => void
  editBanco: (i: number, nombre: string) => void
  reorderBanco: (from: number, to: number) => void
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

  editBanco: (i, nombre) => {
    _mutar(d => { d.banco[i] = nombre })
  },

  reorderBanco: (from, to) => {
    _mutar(d => {
      const item = d.banco.splice(from, 1)[0]
      d.banco.splice(to, 0, item)
    })
  },

  limpiarBanco: () => {
    _mutar(d => { d.banco = [] })
  },
}))
