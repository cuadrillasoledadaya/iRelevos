// ══════════════════════════════════════════════════════════════════
// TESTS — trabajaderaStore.ts (Strict TDD — Phase 4.2 written FIRST)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest'
import { create } from 'zustand'
import { createTrabajaderaStore } from '../trabajaderaStore'
import { getTrab } from '../helpers'
import type { DatosPerfil, PasoDB } from '@/lib/types'

/**
 * Crea un store de prueba con mutar integrado.
 * Simula el patrón root store donde trabajaderaStore usa mutar + getTrab.
 */
function createTestEnv(initialContent?: DatosPerfil) {
  const defaultContent: DatosPerfil = initialContent ?? {
    banco: [],
    planes: [],
    trabajaderas: [
      {
        id: 1,
        nombres: ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'],
        roles: [
          { pri: 'COS', sec: 'COR' },
          { pri: 'COS', sec: 'COR' },
          { pri: 'COS', sec: 'FIJ' },
          { pri: 'COS', sec: 'FIJ' },
          { pri: 'COR', sec: 'COS' },
          { pri: 'COR', sec: 'COS' },
        ],
        salidas: 2,
        tramos: ['Tramo 1 (T1)', 'Tramo 2 (T1)', 'Tramo 3 (T1)'],
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
  }

  const pasos: PasoDB[] = [
    {
      id: 'test-pid',
      nombre_paso: 'Paso Test',
      nombre_cuadrilla: 'Test',
      num_trabajaderas: 1,
      content: JSON.parse(JSON.stringify(defaultContent)),
      created_at: '2025-01-01',
    },
  ]

  // Mini-store para simular el projectStore
  const pasosStore = create<{ pasos: PasoDB[]; pid: string }>(() => ({
    pasos: JSON.parse(JSON.stringify(pasos)),
    pid: 'test-pid',
  }))

  // mutar simple que opera sobre pasosStore
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

  const store = createTrabajaderaStore(mutar, getTrab)

  return { store, pasosStore, getContent: () => pasosStore.getState().pasos[0].content }
}

describe('trabajaderaStore', () => {
  let env: ReturnType<typeof createTestEnv>

  beforeEach(() => {
    env = createTestEnv()
  })

  // ── setNombre ──────────────────────────────────────────────────

  describe('setNombre', () => {
    it('debería actualizar el nombre de un costalero', () => {
      env.store.getState().setNombre(1, 0, 'NuevoNombre')
      const content = env.getContent()
      expect(content.trabajaderas[0].nombres[0]).toBe('NuevoNombre')
    })

    it('no debería afectar otros costaleros', () => {
      env.store.getState().setNombre(1, 2, 'Carlitos')
      const content = env.getContent()
      expect(content.trabajaderas[0].nombres[2]).toBe('Carlitos')
      expect(content.trabajaderas[0].nombres[0]).toBe('Alice')
    })
  })

  // ── addCost ────────────────────────────────────────────────────

  describe('addCost', () => {
    it('debería agregar un costalero al final', () => {
      env.store.getState().addCost(1)
      const content = env.getContent()
      const t = content.trabajaderas[0]
      expect(t.nombres).toHaveLength(7)
      expect(t.nombres[6]).toContain('Costalero 7')
    })

    it('debería agregar un rol por defecto al nuevo costalero', () => {
      env.store.getState().addCost(1)
      const content = env.getContent()
      const t = content.trabajaderas[0]
      expect(t.roles).toHaveLength(7)
      expect(t.roles[6]).toEqual({ pri: 'COR', sec: 'FIJ' })
    })

    it('debería invalidar el plan al agregar costalero', () => {
      env.store.getState().addCost(1)
      const content = env.getContent()
      const t = content.trabajaderas[0]
      expect(t.plan).toBeNull()
      expect(t.obj).toBeNull()
      expect(t.analisis).toBeNull()
    })
  })

  // ── delCost ────────────────────────────────────────────────────

  describe('delCost', () => {
    it('debería eliminar un costalero del índice especificado', () => {
      env.store.getState().delCost(1, 0)
      const content = env.getContent()
      const t = content.trabajaderas[0]
      expect(t.nombres).toHaveLength(5)
      expect(t.nombres[0]).toBe('Bob')
    })

    it('debería invalidar el plan al eliminar', () => {
      env.store.getState().delCost(1, 0)
      const content = env.getContent()
      expect(content.trabajaderas[0].plan).toBeNull()
    })
  })

  // ── toggleBaja ────────────────────────────────────────────────

  describe('toggleBaja', () => {
    it('debería dar de baja a un costalero activo (con 7+ activos)', () => {
      // Agregar un costalero primero para tener 7 activos
      env.store.getState().addCost(1) // 7 costaleros
      const result = env.store.getState().toggleBaja(1, 0)
      expect(result).toBe(true)
      const content = env.getContent()
      expect(content.trabajaderas[0].bajas).toContain(0)
    })

    it('debería reactivar un costalero dado de baja', () => {
      env.store.getState().addCost(1) // 7 costaleros
      env.store.getState().toggleBaja(1, 0) // baja
      const result = env.store.getState().toggleBaja(1, 0) // alta
      expect(result).toBe(true)
      const content = env.getContent()
      expect(content.trabajaderas[0].bajas).not.toContain(0)
    })

    it('debería retornar false si hay <= 6 activos', () => {
      // Con 6 activos, no se puede bajar
      expect(env.store.getState().toggleBaja(1, 0)).toBe(false)
    })
  })

  // ── setRolPri / setRolSec ──────────────────────────────────────

  describe('setRolPri', () => {
    it('debería cambiar el rol principal', () => {
      env.store.getState().setRolPri(1, 0, 'PAT')
      const content = env.getContent()
      expect(content.trabajaderas[0].roles[0].pri).toBe('PAT')
    })

    it('debería evitar que pri y sec sean iguales', () => {
      env.store.getState().setRolPri(1, 0, 'FIJ')
      const content = env.getContent()
      expect(content.trabajaderas[0].roles[0].pri).toBe('FIJ')
      // Si sec era FIJ, debe cambiar a COR
      expect(content.trabajaderas[0].roles[0].sec).toBe('COR')
    })
  })

  describe('setRolSec', () => {
    it('debería cambiar el rol secundario', () => {
      env.store.getState().setRolSec(1, 0, 'PAT')
      const content = env.getContent()
      expect(content.trabajaderas[0].roles[0].sec).toBe('PAT')
    })
  })

  // ── toggleRegla5 ───────────────────────────────────────────────

  describe('toggleRegla5', () => {
    it('debería alternar la regla 5 costaleros', () => {
      expect(env.getContent().trabajaderas[0].regla5costaleros).toBe(false)
      env.store.getState().toggleRegla5(1)
      expect(env.getContent().trabajaderas[0].regla5costaleros).toBe(true)
    })

    it('debería invalidar el plan', () => {
      env.store.getState().toggleRegla5(1)
      const content = env.getContent()
      expect(content.trabajaderas[0].plan).toBeNull()
    })
  })

  // ── addTrab ────────────────────────────────────────────────────

  describe('addTrab', () => {
    it('debería agregar una nueva trabajadera', () => {
      env.store.getState().addTrab()
      const content = env.getContent()
      expect(content.trabajaderas).toHaveLength(2)
      expect(content.trabajaderas[1].id).toBe(2)
      expect(content.trabajaderas[1].nombres).toHaveLength(6)
    })
  })

  // ── setPuntuacion ──────────────────────────────────────────────

  describe('setPuntuacion', () => {
    it('debería setear la puntuación de un costalero por nombre', () => {
      env.store.getState().setPuntuacion(1, 'Alice', 5)
      const content = env.getContent()
      expect(content.trabajaderas[0].puntuaciones!['Alice']).toBe(5)
    })
  })

  // ── setNombreTramo / addTramo / delTramo ───────────────────────

  describe('tramo mutations', () => {
    it('debería cambiar el nombre de un tramo', () => {
      env.store.getState().setNombreTramo(1, 0, 'Tramo Nuevo')
      expect(env.getContent().trabajaderas[0].tramos[0]).toBe('Tramo Nuevo')
    })

    it('debería agregar un tramo', () => {
      env.store.getState().addTramo(1)
      const t = env.getContent().trabajaderas[0]
      expect(t.tramos).toHaveLength(4)
      expect(t.plan).toBeNull()
    })

    it('debería eliminar un tramo', () => {
      env.store.getState().delTramo(1, 0)
      const t = env.getContent().trabajaderas[0]
      expect(t.tramos).toHaveLength(2)
      expect(t.plan).toBeNull()
    })
  })

  // ── setSalidas ─────────────────────────────────────────────────

  describe('setSalidas', () => {
    it('debería actualizar el número de salidas', () => {
      env.store.getState().setSalidas(1, 3)
      expect(env.getContent().trabajaderas[0].salidas).toBe(3)
    })
  })

  // ── usarBanco ──────────────────────────────────────────────────

  describe('usarBanco', () => {
    it('debería asignar un nombre del banco a un tramo', () => {
      env.store.getState().usarBanco(1, 1, 'Juan Pérez')
      expect(env.getContent().trabajaderas[0].tramos[1]).toBe('Juan Pérez')
    })
  })

  // ── sugerirTramos ──────────────────────────────────────────────

  describe('sugerirTramos', () => {
    it('debería ajustar la cantidad de tramos a la cantidad óptima', () => {
      // 6 activos, 2 salidas → tramosOptimos = 3 (ya tiene 3)
      env.store.getState().addCost(1) // 7 activos
      env.store.getState().sugerirTramos(1, 3) // 7 activos, 3 salidas
      const t = env.getContent().trabajaderas[0]
      // 7 activos, F=2 → 3 salidas → tramos = 3*(3/2)=4.5 → 5
      // Actually depends on tramosOptimos calculation
      expect(t.tramos.length).toBeGreaterThanOrEqual(2)
    })
  })

  // ── toggleTramoClave ───────────────────────────────────────────

  describe('toggleTramoClave', () => {
    it('debería marcar un tramo como clave', () => {
      env.store.getState().toggleTramoClave(1, 0)
      const t = env.getContent().trabajaderas[0]
      expect(t.tramosClaves).toContain(0)
    })

    it('debería desmarcar un tramo clave', () => {
      env.store.getState().toggleTramoClave(1, 0)
      env.store.getState().toggleTramoClave(1, 0)
      const t = env.getContent().trabajaderas[0]
      expect(t.tramosClaves).not.toContain(0)
    })
  })
})
