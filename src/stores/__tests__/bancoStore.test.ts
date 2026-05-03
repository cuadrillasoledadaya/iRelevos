// ══════════════════════════════════════════════════════════════════
// TESTS — bancoStore.ts (Strict TDD — Phase 6.2)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest'
import { create } from 'zustand'
import { createBancoStore } from '../bancoStore'
import type { DatosPerfil, PasoDB } from '@/lib/types'

function createBancoTestEnv() {
  const content: DatosPerfil = {
    banco: ['Juan', 'María'],
    planes: [],
    trabajaderas: [],
  }

  const pasos: PasoDB[] = [{
    id: 'test-pid',
    nombre_paso: 'Test',
    nombre_cuadrilla: 'Test',
    num_trabajaderas: 0,
    content: JSON.parse(JSON.stringify(content)),
    created_at: '2025-01-01',
  }]

  const pasosStore = create<{ pasos: PasoDB[]; pid: string }>(() => ({
    pasos: JSON.parse(JSON.stringify(pasos)),
    pid: 'test-pid',
  }))

  const mutar = (fn: (draft: DatosPerfil) => void): void => {
    const state = pasosStore.getState()
    if (!state.pid) return
    pasosStore.setState(s => {
      const nextPasos = [...s.pasos]
      const idx = nextPasos.findIndex(p => p.id === s.pid)
      if (idx === -1) return s
      const draft: DatosPerfil = JSON.parse(JSON.stringify(nextPasos[idx].content))
      fn(draft)
      nextPasos[idx] = { ...nextPasos[idx], content: draft }
      return { pasos: nextPasos }
    })
  }

  const store = createBancoStore(mutar)
  return { store, getContent: () => pasosStore.getState().pasos[0].content }
}

describe('bancoStore', () => {
  let env: ReturnType<typeof createBancoTestEnv>

  beforeEach(() => {
    env = createBancoTestEnv()
  })

  describe('addBanco', () => {
    it('debería agregar entrada al banco', () => {
      env.store.getState().addBanco('Pedro')
      expect(env.getContent().banco).toContain('Pedro')
      expect(env.getContent().banco).toHaveLength(3)
    })
  })

  describe('delBanco', () => {
    it('debería eliminar entrada por índice', () => {
      env.store.getState().delBanco(0)
      expect(env.getContent().banco).toEqual(['María'])
    })

    it('debería manejar eliminación del último ítem', () => {
      env.store.getState().delBanco(0)
      env.store.getState().delBanco(0)
      expect(env.getContent().banco).toEqual([])
    })
  })

  describe('limpiarBanco', () => {
    it('debería vaciar el banco', () => {
      env.store.getState().limpiarBanco()
      expect(env.getContent().banco).toEqual([])
    })
  })
})
