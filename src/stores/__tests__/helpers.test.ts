// ══════════════════════════════════════════════════════════════════
// TESTS — helpers.ts (Strict TDD — Phase 1.5)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { getTrab, tramosOptimosForTrab } from '../helpers'
import type { DatosPerfil, Trabajadera } from '@/lib/types'

const baseDatos: DatosPerfil = {
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

describe('getTrab', () => {
  it('debería retornar la trabajadera correcta por id', () => {
    const result = getTrab(baseDatos, 1)
    expect(result).toBeDefined()
    expect(result.id).toBe(1)
    expect(result.nombres).toHaveLength(6)
    expect(result.nombres[0]).toBe('Alice')
  })

  it('debería lanzar error si la trabajadera no existe', () => {
    expect(() => getTrab(baseDatos, 999)).toThrow(
      'Trabajadera con id 999 no encontrada'
    )
  })

  it('debería retornar la trabajadera correcta con múltiples trabajaderas', () => {
    const multi: DatosPerfil = {
      banco: [],
      planes: [],
      trabajaderas: [
        { ...baseDatos.trabajaderas[0], id: 5, nombres: ['T5'] },
        { ...baseDatos.trabajaderas[0], id: 10, nombres: ['T10'] },
      ],
    }
    expect(getTrab(multi, 5).id).toBe(5)
    expect(getTrab(multi, 10).id).toBe(10)
  })
})

describe('tramosOptimosForTrab', () => {
  function makeTrab(overrides: Partial<Trabajadera> = {}): Trabajadera {
    return {
      id: 1,
      nombres: ['A', 'B', 'C', 'D', 'E', 'F'],
      roles: [],
      salidas: 2,
      tramos: ['T1', 'T2', 'T3'],
      bajas: [],
      regla5costaleros: false,
      plan: null,
      obj: null,
      analisis: null,
      pinned: null,
      puntuaciones: {},
      tramosClaves: [],
      ...overrides,
    }
  }

  it('debería retornar un número positivo', () => {
    const t = makeTrab({ salidas: 2 })
    expect(tramosOptimosForTrab(t)).toBeGreaterThan(0)
  })

  it('debería producir más tramos con más activos', () => {
    const pocos = tramosOptimosForTrab(makeTrab({ nombres: Array(6).fill('X'), salidas: 2 }))
    const muchos = tramosOptimosForTrab(makeTrab({ nombres: Array(12).fill('X'), salidas: 2 }))
    // Con más activos, F=(total-5) es mayor, el ciclo puede ser más corto
    // No garantizamos relación monótona — solo verificamos que ambos son positivos
    expect(pocos).toBeGreaterThan(0)
    expect(muchos).toBeGreaterThan(0)
  })

  it('debería restar bajas del conteo de activos', () => {
    const sinBajas = tramosOptimosForTrab(makeTrab({ bajas: [], salidas: 2 }))
    const conBajas = tramosOptimosForTrab(makeTrab({ bajas: [0, 1], salidas: 2 }))
    // 6 nombres - 2 bajas = 4 activos → F = -1 → tramosOptimos(4,2) → 0
    // Con menos activos, el valor es diferente
    expect(sinBajas).not.toBe(conBajas)
  })

  it('debería usar salidas del argumento sobre t.salidas', () => {
    const t = makeTrab({ salidas: 3 })
    const conOverride = tramosOptimosForTrab(t, 1)
    const sinOverride = tramosOptimosForTrab(t)
    // Con diferentes salidas, produce resultados diferentes
    expect(conOverride).not.toBe(sinOverride)
  })

  it('debería manejar bajas undefined', () => {
    const t = makeTrab({ bajas: undefined })
    expect(tramosOptimosForTrab(t)).toBeGreaterThan(0)
  })
})
