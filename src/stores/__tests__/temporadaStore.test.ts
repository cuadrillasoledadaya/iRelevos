// ══════════════════════════════════════════════════════════════════
// TESTS — temporadaStore.ts (Strict TDD — Phase 3.4 written FIRST)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest'
import { temporadaStore } from '../temporadaStore'
import type { Temporada } from '@/lib/types'

const mockTemporadas: Temporada[] = [
  { id: 'temp-1', nombre: 'Temporada 2024', activa: false, created_at: '2024-01-01' },
  { id: 'temp-2', nombre: 'Temporada 2025', activa: true, created_at: '2025-01-01' },
]

describe('temporadaStore', () => {
  beforeEach(() => {
    temporadaStore.setState({ temporadas: [], activeTemporadaId: '' })
  })

  // ── Estado inicial ──────────────────────────────────────────────

  describe('initial state', () => {
    it('debería inicializar temporadas como array vacío', () => {
      expect(temporadaStore.getState().temporadas).toEqual([])
    })

    it('debería inicializar activeTemporadaId como string vacío', () => {
      expect(temporadaStore.getState().activeTemporadaId).toBe('')
    })
  })

  // ── setTemporadas ───────────────────────────────────────────────

  describe('setTemporadas', () => {
    it('debería actualizar la lista de temporadas', () => {
      temporadaStore.getState().setTemporadas(mockTemporadas)
      expect(temporadaStore.getState().temporadas).toHaveLength(2)
      expect(temporadaStore.getState().temporadas[0].id).toBe('temp-1')
      expect(temporadaStore.getState().temporadas[1].nombre).toBe('Temporada 2025')
    })

    it('debería reemplazar la lista existente', () => {
      temporadaStore.getState().setTemporadas(mockTemporadas)
      temporadaStore.getState().setTemporadas([mockTemporadas[0]])
      expect(temporadaStore.getState().temporadas).toHaveLength(1)
    })
  })

  // ── setActiveTemporadaId ────────────────────────────────────────

  describe('setActiveTemporadaId', () => {
    it('debería actualizar el id de temporada activa', () => {
      temporadaStore.getState().setActiveTemporadaId('temp-2')
      expect(temporadaStore.getState().activeTemporadaId).toBe('temp-2')
    })

    it('debería permitir cambiar entre temporadas', () => {
      temporadaStore.getState().setActiveTemporadaId('temp-1')
      expect(temporadaStore.getState().activeTemporadaId).toBe('temp-1')
      temporadaStore.getState().setActiveTemporadaId('temp-2')
      expect(temporadaStore.getState().activeTemporadaId).toBe('temp-2')
    })
  })
})
