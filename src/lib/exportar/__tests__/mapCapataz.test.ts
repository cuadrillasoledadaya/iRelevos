// ══════════════════════════════════════════════════════════════════
// TESTS — mapCapataz (pure mapper for Capataz)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { mapCapataz } from '../mappers/mapCapataz'
import { createTrabajaderaValida, createTrabajaderaConProblemas } from './helpers'
import type { Trabajadera } from '../../types'

// ── Happy path: trabajadera válida ─────────────────────────────────

describe('mapCapataz — happy path', () => {
  const t = createTrabajaderaValida(1, 3, 6)

  it('debe computar totalCostaleros correctamente', () => {
    const data = mapCapataz(t)
    expect(data.totalCostaleros).toBe(6)
  })

  it('debe computar fueraPorTramo como total - 5', () => {
    const data = mapCapataz(t)
    expect(data.fueraPorTramo).toBe(1)
  })

  it('debe computar numTramos correctamente', () => {
    const data = mapCapataz(t)
    expect(data.numTramos).toBe(3)
  })

  it('debe retornar workersaderaId correcto', () => {
    const data = mapCapataz(t)
    expect(data.trabajaderaId).toBe(1)
  })

  it('debe generar distDesc cuando todas las salidas son iguales', () => {
    const data = mapCapataz(t)
    expect(data.distDesc).toBe('3 salidas por costalero')
  })

  it('debe generar distDesc cuando hay distribución desigual', () => {
    const desigual = createTrabajaderaValida(1, 3, 6)
    // Modificar obj para que no todos tengan las mismas salidas
    desigual.obj = { 0: 3, 1: 3, 2: 3, 3: 2, 4: 2, 5: 2 }
    const data = mapCapataz(desigual)
    expect(data.distDesc).toBe('2 salidas (3 costaleros) · 3 salidas (3 costaleros)')
  })

  it('debe retornar statusGood = true para análisis sin problemas', () => {
    const data = mapCapataz(t)
    expect(data.statusGood).toBe(true)
  })

  it('debe retornar statusTxt = "✓ Plan correcto" para análisis limpio', () => {
    const data = mapCapataz(t)
    expect(data.statusTxt).toBe('✓ Plan correcto')
  })

  it('debe generar theadCells con una celda por tramo', () => {
    const data = mapCapataz(t)
    expect(data.theadCells).toHaveLength(3)
  })

  it('debe marcar primer tramo con clase "pri" y emoji verde', () => {
    const data = mapCapataz(t)
    expect(data.theadCells[0]).toContain('class="pri"')
    expect(data.theadCells[0]).toContain('🟢')
    expect(data.theadCells[0]).toContain('Tramo 1')
  })

  it('debe marcar último tramo con clase "ult" y emoji rojo', () => {
    const data = mapCapataz(t)
    expect(data.theadCells[2]).toContain('class="ult"')
    expect(data.theadCells[2]).toContain('🔴')
    expect(data.theadCells[2]).toContain('Tramo 3')
  })

  it('debe dejar tramos intermedios sin clase especial y sin emoji', () => {
    const data = mapCapataz(t)
    expect(data.theadCells[1]).toContain('class=""')
    expect(data.theadCells[1]).not.toContain('🟢')
    expect(data.theadCells[1]).not.toContain('🔴')
    expect(data.theadCells[1]).toContain('Tramo 2')
  })

  it('debe generar tbodyRows con una fila por costalero', () => {
    const data = mapCapataz(t)
    expect(data.tbodyRows).toHaveLength(6)
  })

  it('cada tbody row debe ser un <tr> con celdas', () => {
    const data = mapCapataz(t)
    for (const row of data.tbodyRows) {
      expect(row).toContain('<tr>')
      expect(row).toContain('</tr>')
      expect(row).toContain('<td')
    }
  })

  it('debe incluir nombre del costalero en la primera celda de cada fila', () => {
    const data = mapCapataz(t)
    expect(data.tbodyRows[0]).toContain('Costalero 1')
    expect(data.tbodyRows[1]).toContain('Costalero 2')
    expect(data.tbodyRows[2]).toContain('Costalero 3')
  })

  it('debe mostrar salidas/objetivo en la segunda celda de cada fila', () => {
    const data = mapCapataz(t)
    // Todas las salidas son 3 (3 tramos) y objetivo 3
    expect(data.tbodyRows[0]).toContain('class="td-sal ok"')
    expect(data.tbodyRows[0]).toContain('3/3')
  })

  it('para costaleros dentro de un tramo, debe mostrar celda "DENTRO"', () => {
    const data = mapCapataz(t)
    // Costalero 0 está dentro en todos los tramos
    expect(data.tbodyRows[0]).toContain('cel-d')
    expect(data.tbodyRows[0]).toContain('DENTRO')
  })

  it('para costaleros fuera de un tramo, debe mostrar celda "FUERA"', () => {
    const data = mapCapataz(t)
    // Costalero 5 está fuera en todos los tramos (6 costaleros, 5 dentro)
    expect(data.tbodyRows[5]).toContain('cel-f')
    expect(data.tbodyRows[5]).toContain('FUERA')
  })

  it('debe generar footerCells con una celda por tramo', () => {
    const data = mapCapataz(t)
    expect(data.footerCells).toHaveLength(3)
  })

  it('cada footer cell debe mostrar cuántos dentro vs 5', () => {
    const data = mapCapataz(t)
    // Plan válido: 5 dentro por tramo
    expect(data.footerCells[0]).toContain('5/5')
    expect(data.footerCells[0]).toContain('class="td-foot ok"')
  })

  it('debe incluir nombres de los costaleros fuera en el footer', () => {
    const data = mapCapataz(t)
    // Costalero 5 está fuera en todos los tramos
    expect(data.footerCells[0]).toContain('Costalero 6')
  })

  it('debe incluir una propiedad fecha con formato de fecha', () => {
    const data = mapCapataz(t)
    expect(data.fecha).toBeTruthy()
    expect(typeof data.fecha).toBe('string')
    // El formato es "DD de {mes} de YYYY" en español
    expect(data.fecha).toMatch(/\d{2} de [a-z]+ de \d{4}/i)
  })
})

// ── Problems path: trabajadera con problemas ───────────────────────

describe('mapCapataz — con problemas', () => {
  const t = createTrabajaderaConProblemas(2, 3, 6)

  it('debe retornar statusGood = false para análisis con problemas', () => {
    const data = mapCapataz(t)
    expect(data.statusGood).toBe(false)
  })

  it('debe retornar statusTxt que indica problemas', () => {
    const data = mapCapataz(t)
    expect(data.statusTxt).toContain('⚠')
    expect(data.statusTxt).not.toBe('✓ Plan correcto')
  })

  it('debe generar theadCells incluso cuando hay problemas', () => {
    const data = mapCapataz(t)
    expect(data.theadCells).toHaveLength(3)
  })

  it('debe generar tbodyRows aun con bajas (costaleros marcados como baja)', () => {
    const data = mapCapataz(t)
    expect(data.tbodyRows).toHaveLength(6)
  })

  it('debe clasificar como warn las salidas que no coinciden con objetivo', () => {
    const data = mapCapataz(t)
    // Costalero 2 (índice 1) es baja, tiene menos salidas (2 en vez de 3)
    expect(data.tbodyRows[1]).toContain('class="td-sal warn"')
    expect(data.tbodyRows[1]).toContain('2/')
  })

  it('debe marcar celdas repetidas con clase cel-rep cuando costalero en primer está fuera en último tramo', () => {
    // Crear trabajadera donde costalero 0 está en primer Y fuera en el último tramo
    const tRep = createTrabajaderaConProblemas(10, 3, 6)
    tRep.analisis!.primer = [5] // Costalero 6 (idx 5) está en primer
    tRep.plan = [
      { dentro: [0, 1, 2, 3, 4], fuera: [5] },
      { dentro: [0, 1, 2, 3, 4], fuera: [5] },
      { dentro: [0, 1, 2, 3, 4], fuera: [5] }, // Último tramo: costalero 5 fuera
    ]
    const data = mapCapataz(tRep)
    // Costalero 6 (idx 5) está fuera en el último tramo Y en primer
    const rowIdx5 = data.tbodyRows[5]
    expect(rowIdx5).toContain('cel-rep')
    expect(rowIdx5).toContain('FUERA ⚠')
  })

  it('debe marcar celdas consecutivas con clase cel-cons cuando costalero está fuera en tramos consecutivos', () => {
    // Crear trabajadera donde costalero 5 está fuera en tramo 0 y tramo 1
    const tCons = createTrabajaderaConProblemas(11, 3, 6)
    tCons.plan = [
      { dentro: [0, 1, 2, 3, 4], fuera: [5] },  // Tramo 0: idx 5 fuera
      { dentro: [0, 1, 2, 3, 5], fuera: [4] },  // Tramo 1: idx 4 fuera (pero no consecutivo con 5)
      { dentro: [0, 1, 2, 3, 4], fuera: [5] },  // Tramo 2
    ]
    // Necesitamos que el mismo costalero esté fuera en dos tramos consecutivos
    tCons.plan = [
      { dentro: [0, 1, 2, 3, 4], fuera: [5] },
      { dentro: [0, 1, 2, 3, 4], fuera: [5] },  // Mismo costalero fuera en tramo 0 y 1
      { dentro: [0, 1, 2, 3, 5], fuera: [4] },
    ]
    const data = mapCapataz(tCons)
    const anyRowHasCons = data.tbodyRows.some(row => row.includes('cel-cons'))
    expect(anyRowHasCons).toBe(true)
  })

  it('footer debe mostrar warn cuando un tramo no tiene exactamente 5 dentro', () => {
    // Crear trabajadera con un tramo que tiene 4 dentro (no 5)
    const tWarn = createTrabajaderaConProblemas(12, 3, 7)
    tWarn.plan = [
      { dentro: [0, 1, 2, 3, 4], fuera: [5, 6] },
      { dentro: [0, 1, 2, 3], fuera: [4, 5, 6] },     // Solo 4 dentro → warn
      { dentro: [0, 1, 2, 3, 4], fuera: [5, 6] },
    ]
    const data = mapCapataz(tWarn)
    expect(data.footerCells[1]).toContain('class="td-foot warn"')
  })
})

// ── Edge cases ─────────────────────────────────────────────────────

describe('mapCapataz — edge cases', () => {
  it('debe manejar trabajadera con un solo tramo', () => {
    const t = createTrabajaderaValida(3, 1, 6)
    const data = mapCapataz(t)
    expect(data.numTramos).toBe(1)
    expect(data.theadCells).toHaveLength(1)
    expect(data.tbodyRows).toHaveLength(6)
    expect(data.footerCells).toHaveLength(1)
    // Primer y último tramo son el mismo — debe ser "pri" (primer)
    expect(data.theadCells[0]).toContain('class="pri"')
    expect(data.theadCells[0]).toContain('🟢')
  })

  it('debe manejar plan null gracefully (sin plan)', () => {
    const t: Trabajadera = {
      id: 4,
      nombres: ['A', 'B', 'C', 'D', 'E', 'F'],
      roles: [],
      salidas: 3,
      tramos: ['T1', 'T2'],
      bajas: [],
      regla5costaleros: true,
      plan: null,
      obj: null,
      analisis: null,
      pinned: null,
      puntuaciones: {},
      tramosClaves: [],
    }
    const data = mapCapataz(t)
    expect(data.totalCostaleros).toBe(6)
    expect(data.numTramos).toBe(2)
    expect(data.theadCells).toHaveLength(2)
    expect(data.tbodyRows).toHaveLength(6)
    expect(data.footerCells).toHaveLength(2)
  })

  it('debe manejar un solo costalero con valores límite', () => {
    const t = createTrabajaderaValida(5, 3, 1)
    const data = mapCapataz(t)
    // Con 1 costalero, fueraPorTramo = 1 - 5 = -4 → pero se usa para display
    expect(data.totalCostaleros).toBe(1)
    expect(data.tbodyRows).toHaveLength(1)
    // distDesc debe mostrar 3 salidas si obj tiene {0: 3}
    expect(data.distDesc).toBe('3 salidas por costalero')
  })

  it('debe retornar una fecha no vacía', () => {
    const t = createTrabajaderaValida(1)
    const data = mapCapataz(t)
    expect(data.fecha.length).toBeGreaterThan(5)
  })

  it('los thead cells deben ser strings HTML válidos (contener tags th)', () => {
    const t = createTrabajaderaValida(1)
    const data = mapCapataz(t)
    for (const cell of data.theadCells) {
      expect(cell).toContain('<th')
      expect(cell).toContain('</th>')
    }
  })

  it('los tbody rows deben ser strings HTML válidos (contener tags tr)', () => {
    const t = createTrabajaderaValida(1)
    const data = mapCapataz(t)
    for (const row of data.tbodyRows) {
      expect(row).toContain('<tr>')
      expect(row).toContain('</tr>')
    }
  })

  it('los footer cells deben incluir el conteo de fuera', () => {
    const t = createTrabajaderaValida(1, 3, 7)
    const data = mapCapataz(t)
    // 7 costaleros, 5 dentro → 2 fuera
    expect(data.fueraPorTramo).toBe(2)
    expect(data.footerCells[0]).toContain('5/5')
    expect(data.footerCells[0]).toContain('<small>')
    expect(data.footerCells[0]).toContain('Costalero 6, Costalero 7')
  })
})
