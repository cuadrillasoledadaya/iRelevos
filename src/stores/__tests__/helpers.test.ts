// ══════════════════════════════════════════════════════════════════
// TESTS — helpers.ts (Strict TDD — Phase 1.5)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { getTrab } from '../helpers'
import type { DatosPerfil } from '@/lib/types'

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
