// ══════════════════════════════════════════════════════════════════
// TESTS — mapRelevos (pure mapper for Relevos view)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { mapRelevos } from '../mappers/mapRelevos'
import { createTrabajaderaValida } from './helpers'

// ── Happy path ─────────────────────────────────────────────────────

describe('mapRelevos — happy path', () => {
  const t = createTrabajaderaValida(1, 3, 6)

  it('debe retornar trabajaderaId correcto', () => {
    const data = mapRelevos(t)
    expect(data.trabajaderaId).toBe(1)
  })

  it('debe incluir una propiedad fecha no vacía', () => {
    const data = mapRelevos(t)
    expect(data.fecha).toBeTruthy()
    expect(typeof data.fecha).toBe('string')
  })

  it('debe generar headers con emoji y label para cada posición de la estructura', () => {
    const data = mapRelevos(t)
    expect(data.headers.length).toBeGreaterThan(0)
    // Para tid=1 (no es 1 ni 7), la estructura es ['COS','FIJ','COR','FIJ','COS']
    // Más el header FUERA al final
    expect(data.headers.length).toBe(6) // 5 roles + FUERA
    // Verificar que cada header tiene emoji y label
    for (const h of data.headers) {
      expect(h.emoji).toBeTruthy()
      expect(h.label).toBeTruthy()
    }
  })

  it('el último header debe ser FUERA', () => {
    const data = mapRelevos(t)
    const lastHeader = data.headers[data.headers.length - 1]
    expect(lastHeader.label.toLowerCase()).toContain('fuera')
  })

  it('debe generar una fila por cada tramo', () => {
    const data = mapRelevos(t)
    expect(data.rows).toHaveLength(3)
  })

  it('cada fila debe tener tramoNombre', () => {
    const data = mapRelevos(t)
    expect(data.rows[0].tramoNombre).toBe('Tramo 1')
    expect(data.rows[1].tramoNombre).toBe('Tramo 2')
    expect(data.rows[2].tramoNombre).toBe('Tramo 3')
  })

  it('cada fila debe tener cells para cada posición de rol', () => {
    const data = mapRelevos(t)
    // Estructura de 5 posiciones: 5 cells de rol
    expect(data.rows[0].cells).toHaveLength(5)
  })

  it('las cells deben tener nombre e highlighted', () => {
    const data = mapRelevos(t)
    for (const row of data.rows) {
      for (const cell of row.cells) {
        expect(typeof cell.nombre).toBe('string')
        expect(typeof cell.highlighted).toBe('boolean')
      }
    }
  })

  it('highlighted debe ser false por defecto (sin costalero resaltado)', () => {
    const data = mapRelevos(t)
    for (const row of data.rows) {
      for (const cell of row.cells) {
        expect(cell.highlighted).toBe(false)
      }
    }
  })

  it('highlighted debe ser true para el costalero resaltado cuando se pasa costaleroIdx', () => {
    const data = mapRelevos(t, 2) // Resaltar costalero 3 (idx 2)
    const hasHighlighted = data.rows.some(row =>
      row.cells.some(cell => cell.highlighted)
    )
    expect(hasHighlighted).toBe(true)
  })

  it('cada fila debe tener un array "fuera" con los nombres abreviados de costaleros fuera', () => {
    const data = mapRelevos(t)
    // 6 costaleros, 5 dentro → 1 fuera por tramo
    for (const row of data.rows) {
      expect(row.fuera.length).toBe(1)
      expect(typeof row.fuera[0]).toBe('string')
      expect(row.fuera[0].length).toBeGreaterThan(0)
    }
  })

  it('debe incluir el nombre de cada costalero dentro en las cells', () => {
    const data = mapRelevos(t)
    // Los costaleros 0-4 están dentro en cada tramo
    const allNombres = data.rows.flatMap(row => row.cells.map(c => c.nombre))
    // Todos deberían ser nombres de la forma abreviada (pillName)
    for (const nombre of allNombres) {
      expect(typeof nombre).toBe('string')
      expect(nombre.length).toBeGreaterThan(0)
    }
  })
})

// ── Different tid ──────────────────────────────────────────────────

describe('mapRelevos — diferentes tid', () => {
  it('tid=1 debe usar estructura PAT/FIJ/COR/FIJ/PAT', () => {
    const t = createTrabajaderaValida(1, 2, 6)
    const data = mapRelevos(t)
    // PAT = Patero (⚓), FIJ = Fijador (🔩), COR = Corriente (〰️)
    // Estructura: PAT_I, FIJ_I, COR, FIJ_D, PAT_D + FUERA = 6 headers
    expect(data.headers).toHaveLength(6)
    expect(data.headers[0].label).toBe('Patero_I') // Primer puesto: izquierdo
    expect(data.headers[0].emoji).toBe('⚓')
  })

  it('tid=7 debe usar estructura PAT/FIJ/COR/FIJ/PAT', () => {
    const t = createTrabajaderaValida(7, 2, 6)
    const data = mapRelevos(t)
    expect(data.headers[0].label).toBe('Patero_I')
  })

  it('tid=3 debe usar estructura COS/FIJ/COR/FIJ/COS', () => {
    const t = createTrabajaderaValida(3, 2, 6)
    const data = mapRelevos(t)
    expect(data.headers[0].label).toBe('Costero_I') // Primer puesto: izquierdo
    expect(data.headers[0].emoji).toBe('⚓')
  })
})

// ── Edge cases ─────────────────────────────────────────────────────

describe('mapRelevos — edge cases', () => {
  it('debe manejar trabajadera sin plan (plan null)', () => {
    const t = createTrabajaderaValida(20, 2, 6)
    t.plan = null
    const data = mapRelevos(t)
    expect(data.rows).toHaveLength(2)
    // Sin plan, todas las cells deben ser '—' y fuera vacío
    for (const row of data.rows) {
      for (const cell of row.cells) {
        expect(cell.nombre).toBe('—')
      }
      expect(row.fuera).toEqual([])
    }
  })

  it('debe manejar un solo tramo', () => {
    const t = createTrabajaderaValida(21, 1, 6)
    const data = mapRelevos(t)
    expect(data.rows).toHaveLength(1)
    expect(data.rows[0].tramoNombre).toBe('Tramo 1')
  })

  it('debe manejar costalero resaltado con índice fuera de rango', () => {
    const t = createTrabajaderaValida(22, 2, 6)
    const data = mapRelevos(t, 999)
    // No debería crashear, ningún highlighted = true
    const anyHighlighted = data.rows.some(row =>
      row.cells.some(cell => cell.highlighted)
    )
    expect(anyHighlighted).toBe(false)
  })

  it('los nombres de costaleros fuera deben ser accesibles como strings', () => {
    const t = createTrabajaderaValida(23, 2, 6)
    const data = mapRelevos(t)
    for (const row of data.rows) {
      for (const nombre of row.fuera) {
        expect(typeof nombre).toBe('string')
      }
    }
  })
})
