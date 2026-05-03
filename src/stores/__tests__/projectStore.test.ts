// ══════════════════════════════════════════════════════════════════
// TESTS — projectStore.ts (Strict TDD — Phase 3.3 written FIRST)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { projectStore } from '../projectStore'
import { datosVacios } from '@/lib/algoritmos'
import { supabase } from '@/lib/supabase'
import type { PasoDB } from '@/lib/types'

const mockPasos: PasoDB[] = [
  {
    id: 'proj-1',
    nombre_paso: 'Paso del Cristo',
    nombre_cuadrilla: 'Cuadrilla A',
    num_trabajaderas: 2,
    content: {
      banco: ['Juan', 'María'],
      planes: [],
      trabajaderas: [
        {
          id: 1,
          nombres: ['A', 'B', 'C', 'D', 'E', 'F'],
          roles: [],
          salidas: 2,
          tramos: ['T1', 'T2'],
          bajas: [],
          regla5costaleros: false,
          plan: null,
          obj: null,
          analisis: null,
          pinned: null,
          puntuaciones: {},
          tramosClaves: [],
        },
      ],
    },
    created_at: '2025-01-01',
    temporada_id: 'temp-1',
  },
  {
    id: 'proj-2',
    nombre_paso: 'Paso de la Virgen',
    nombre_cuadrilla: 'Cuadrilla B',
    num_trabajaderas: 1,
    content: {
      banco: [],
      planes: [],
      trabajaderas: [],
    },
    created_at: '2025-01-02',
    temporada_id: 'temp-1',
  },
]

describe('projectStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    projectStore.setState({
      pasos: [],
      pid: '',
      activeTemporadaId: '',
      nombrePaso: 'Sin Paso',
      nombreCuadrilla: 'Sin Cuadrilla',
      S: datosVacios(),
    })
  })

  // ── Estado inicial ──────────────────────────────────────────────

  describe('initial state', () => {
    it('debería inicializar pasos como array vacío', () => {
      const store = projectStore
      expect(store.getState().pasos).toEqual([])
    })

    it('debería inicializar pid como string vacío', () => {
      const store = projectStore
      expect(store.getState().pid).toBe('')
    })

    it('debería inicializar nombrePaso como "Sin Paso"', () => {
      const store = projectStore
      expect(store.getState().nombrePaso).toBe('Sin Paso')
    })

    it('debería inicializar nombreCuadrilla como "Sin Cuadrilla"', () => {
      const store = projectStore
      expect(store.getState().nombreCuadrilla).toBe('Sin Cuadrilla')
    })
  })

  // ── setPasos ────────────────────────────────────────────────────

  describe('setPasos', () => {
    it('debería setear la lista de pasos y auto-seleccionar el primero', () => {
      const store = projectStore
      store.getState().setPasos(mockPasos)
      expect(store.getState().pasos).toHaveLength(2)
      expect(store.getState().pid).toBe('proj-1')
      expect(store.getState().nombrePaso).toBe('Paso del Cristo')
      expect(store.getState().nombreCuadrilla).toBe('Cuadrilla A')
    })

    it('debería preservar el pid guardado en localStorage si existe', () => {
      localStorage.setItem('cpwa_active_paso_id', 'proj-2')
      const store = projectStore
      store.getState().setPasos(mockPasos)
      expect(store.getState().pid).toBe('proj-2')
      expect(store.getState().nombrePaso).toBe('Paso de la Virgen')
    })

    it('debería limpiar pid si la lista está vacía', () => {
      const store = projectStore
      store.getState().setPasos(mockPasos)
      store.getState().setPasos([])
      expect(store.getState().pid).toBe('')
    })
  })

  // ── setPid ──────────────────────────────────────────────────────

  describe('setPid', () => {
    it('debería actualizar el pid y los nombres derivados', () => {
      const store = projectStore
      store.getState().setPasos(mockPasos)
      store.getState().setPid('proj-2')
      expect(store.getState().pid).toBe('proj-2')
      expect(store.getState().nombrePaso).toBe('Paso de la Virgen')
      expect(store.getState().nombreCuadrilla).toBe('Cuadrilla B')
    })

    it('debería guardar el pid en localStorage', () => {
      const store = projectStore
      store.getState().setPasos(mockPasos)
      store.getState().setPid('proj-1')
      expect(localStorage.getItem('cpwa_active_paso_id')).toBe('proj-1')
    })
  })

  // ── S (DatosPerfil derivado) ────────────────────────────────────

  describe('S (derived data)', () => {
    it('debería retornar el content del proyecto activo', () => {
      const store = projectStore
      store.getState().setPasos(mockPasos)
      const S = store.getState().S
      expect(S.banco).toEqual(['Juan', 'María'])
      expect(S.trabajaderas).toHaveLength(1)
    })

    it('debería retornar datos vacíos si no hay proyecto activo', () => {
      const store = projectStore
      const S = store.getState().S
      // datosVacios() retorna estructura con defaults (tramos por defecto, etc.)
      expect(S).toBeDefined()
      expect(Array.isArray(S.banco)).toBe(true)
      expect(Array.isArray(S.trabajaderas)).toBe(true)
      expect(Array.isArray(S.planes)).toBe(true)
    })
  })

  // ── refetchPasos ────────────────────────────────────────────────

  describe('refetchPasos', () => {
    it('debería llamar a supabase y popular pasos', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockPasos,
          error: null,
        }),
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const store = projectStore

      // Necesitamos que activeTemporadaId esté seteado para que refetch funcione
      // Usamos setPasos internamente para setear el estado previo
      store.setState({ activeTemporadaId: 'temp-1' })
      await store.getState().refetchPasos()

      expect(supabase.from).toHaveBeenCalledWith('proyectos')
      expect(store.getState().pasos).toHaveLength(2)
    })

    it('no debería hacer nada si no hay activeTemporadaId', async () => {
      const store = projectStore
      await store.getState().refetchPasos()
      expect(supabase.from).not.toHaveBeenCalled()
    })
  })
})
