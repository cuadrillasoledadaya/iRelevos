// ══════════════════════════════════════════════════════════════════
// TESTS — planStore.ts (Strict TDD — Phase 5.2)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest'
import { create } from 'zustand'
import { createPlanStore } from '../planStore'
import { getTrab } from '../helpers'
import type { DatosPerfil, PasoDB } from '@/lib/types'

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

  const pasos: PasoDB[] = [{
    id: 'test-pid',
    nombre_paso: 'Paso Test',
    nombre_cuadrilla: 'Test',
    num_trabajaderas: 1,
    content: JSON.parse(JSON.stringify(defaultContent)),
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

  const store = createPlanStore(mutar, getTrab)
  return { store, pasosStore, getContent: () => pasosStore.getState().pasos[0].content }
}

describe('planStore', () => {
  let env: ReturnType<typeof createTestEnv>

  beforeEach(() => {
    env = createTestEnv()
  })

  // ── calcularTrab ──────────────────────────────────────────────

  describe('calcularTrab', () => {
    it('debería producir un plan para una trabajadera', () => {
      expect(env.getContent().trabajaderas[0].plan).toBeNull()
      env.store.getState().calcularTrab(1)
      const t = env.getContent().trabajaderas[0]
      expect(t.plan).not.toBeNull()
      expect(t.plan!.length).toBeGreaterThan(0)
      expect(t.obj).not.toBeNull()
      expect(t.analisis).not.toBeNull()
    })

    it('debería limpiar pinned al calcular', () => {
      env.store.getState().calcularTrab(1)
      const t = env.getContent().trabajaderas[0]
      expect(t.pinned).toBeNull()
    })
  })

  // ── calcularTodo ──────────────────────────────────────────────

  describe('calcularTodo', () => {
    it('debería calcular plan para todas las trabajaderas', () => {
      env.store.getState().calcularTodo()
      const content = env.getContent()
      content.trabajaderas.forEach(t => {
        expect(t.plan).not.toBeNull()
      })
    })
  })

  // ── completarPlan ─────────────────────────────────────────────

  describe('completarPlan', () => {
    it('debería completar el plan automáticamente', () => {
      env.store.getState().calcularTrab(1)
      env.store.getState().completarPlan(1)
      const t = env.getContent().trabajaderas[0]
      expect(t.plan).not.toBeNull()
    })
  })

  // ── limpiarPlan / quitarBloqueos ──────────────────────────────

  describe('limpiarPlan', () => {
    it('debería limpiar plan, obj y analisis', () => {
      env.store.getState().calcularTrab(1)
      expect(env.getContent().trabajaderas[0].plan).not.toBeNull()
      env.store.getState().limpiarPlan(1)
      const t = env.getContent().trabajaderas[0]
      expect(t.plan).toBeNull()
      expect(t.obj).toBeNull()
      expect(t.analisis).toBeNull()
    })
  })

  describe('quitarBloqueos', () => {
    it('debería limpiar pinned', () => {
      env.store.getState().calcularTrab(1)
      // Simular pinned
      env.pasosStore.setState(s => {
        const next = [...s.pasos]
        next[0] = { ...next[0], content: { ...next[0].content, trabajaderas: [{ ...next[0].content.trabajaderas[0], pinned: [['L', 'D', 'F']] }] } }
        return { pasos: next }
      })
      env.store.getState().quitarBloqueos(1)
      const t = env.getContent().trabajaderas[0]
      expect(t.pinned).toBeNull()
    })
  })

  // ── setPinned / getErroresPinned ──────────────────────────────

  describe('setPinned', () => {
    it('debería fijar un costalero en una posición', () => {
      env.store.getState().calcularTrab(1) // necesita plan para pinned
      env.store.getState().setPinned(1, 0, 0, 'L')
      const t = env.getContent().trabajaderas[0]
      expect(t.pinned).not.toBeNull()
    })
  })

  // ── Limpieza global ──────────────────────────────────────────

  describe('limpiarPlanificacion', () => {
    it('debería limpiar plan de todas las trabajaderas', () => {
      env.store.getState().calcularTodo()
      env.store.getState().limpiarPlanificacion()
      env.getContent().trabajaderas.forEach(t => {
        expect(t.plan).toBeNull()
        expect(t.analisis).toBeNull()
        expect(t.obj).toBeNull()
      })
    })
  })

  describe('limpiarTrabajaderas', () => {
    it('debería resetear nombres y limpiar plan', () => {
      env.store.getState().limpiarTrabajaderas()
      const t = env.getContent().trabajaderas[0]
      expect(t.nombres[0]).toBe('Costalero 1')
      expect(t.bajas).toEqual([])
      expect(t.plan).toBeNull()
      expect(t.puntuaciones).toEqual({})
    })
  })

  describe('resetTodo', () => {
    it('debería resetear todo a valores por defecto', () => {
      env.store.getState().resetTodo()
      const content = env.getContent()
      expect(content.trabajaderas).toHaveLength(1)
      expect(content.trabajaderas[0].id).toBe(1)
      expect(content.banco).toEqual([])
    })
  })

  // ── Planes de Relevos ────────────────────────────────────────

  describe('planes de relevos', () => {
    it('debería agregar un plan', () => {
      env.store.getState().addPlan('Mi Plan', ['Tramo A', 'Tramo B'])
      const content = env.getContent()
      expect(content.planes).toHaveLength(1)
      expect(content.planes[0].nombre).toBe('Mi Plan')
    })

    it('debería actualizar un plan', () => {
      env.store.getState().addPlan('Original')
      const planId = env.getContent().planes[0].id
      env.store.getState().updatePlan(planId, 'Actualizado')
      expect(env.getContent().planes[0].nombre).toBe('Actualizado')
    })

    it('debería eliminar un plan', () => {
      env.store.getState().addPlan('Para borrar')
      const planId = env.getContent().planes[0].id
      env.store.getState().delPlan(planId)
      expect(env.getContent().planes).toHaveLength(0)
    })
  })
})
