// ══════════════════════════════════════════════════════════════════
// TESTS — mapMasivo (pure mapper for Masivo view)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { mapMasivo } from '../mappers/mapMasivo'
import { createTrabajaderaValida } from './helpers'

// ── Happy path ─────────────────────────────────────────────────────

describe('mapMasivo — happy path', () => {
  const t = createTrabajaderaValida(1, 3, 6)
  const costaleroIdx = 2 // Costalero 3 (idx 2) — dentro en todos los tramos
  const costaleroNombre = 'Costalero 3'

  it('debe retornar costaleroNombre correcto', () => {
    const data = mapMasivo(t, costaleroNombre, costaleroIdx)
    expect(data.costaleroNombre).toBe('Costalero 3')
  })

  it('debe retornar trabajaderaId correcto', () => {
    const data = mapMasivo(t, costaleroNombre, costaleroIdx)
    expect(data.trabajaderaId).toBe(1)
  })

  it('debe incluir una propiedad fecha con formato de fecha', () => {
    const data = mapMasivo(t, costaleroNombre, costaleroIdx)
    expect(data.fecha).toBeTruthy()
    expect(typeof data.fecha).toBe('string')
    expect(data.fecha).toMatch(/[a-záéíóú]+,\s?\d{2} de [a-z]+ de \d{4}/i)
  })

  it('debe retornar nombrePaso vacío por defecto', () => {
    const data = mapMasivo(t, costaleroNombre, costaleroIdx)
    expect(data.nombrePaso).toBe('')
  })

  it('debe aceptar nombrePaso como cuarto argumento opcional', () => {
    const data = mapMasivo(t, costaleroNombre, costaleroIdx, 'Mi Paso')
    expect(data.nombrePaso).toBe('Mi Paso')
  })

  it('debe generar una fila por cada tramo', () => {
    const data = mapMasivo(t, costaleroNombre, costaleroIdx)
    expect(data.filas).toHaveLength(3)
    expect(data.filas[0].tramoNombre).toBe('Tramo 1')
    expect(data.filas[1].tramoNombre).toBe('Tramo 2')
    expect(data.filas[2].tramoNombre).toBe('Tramo 3')
  })

  it('costalero dentro debe tener estado DENTRO en filas', () => {
    const data = mapMasivo(t, costaleroNombre, costaleroIdx)
    // Costalero 2 (idx 2) está dentro en todos los tramos
    for (const fila of data.filas) {
      expect(fila.estado).toBe('DENTRO')
    }
  })

  it('costalero dentro debe tener colorFila para DENTRO', () => {
    const data = mapMasivo(t, costaleroNombre, costaleroIdx)
    for (const fila of data.filas) {
      expect(fila.colorFila).toContain('background:#ffffff')
      expect(fila.colorFila).toContain('color:#000')
    }
  })

  it('debe retornar salidas y objetivo del costalero', () => {
    const data = mapMasivo(t, costaleroNombre, costaleroIdx)
    expect(data.salidas).toBe(3) // 3 tramos → 3 salidas
    expect(data.objetivo).toBe(3)
  })

  it('debe computar primerTramo y ultimoTramo correctamente', () => {
    const data = mapMasivo(t, costaleroNombre, costaleroIdx)
    // Costalero 2 está dentro en tramos 0, 1, 2
    expect(data.primerTramo).toBe(0)
    expect(data.ultimoTramo).toBe(2)
  })

  it('costalero fuera debe tener estado FUERA y color correspondiente', () => {
    const fueraIdx = 5 // Costalero 6 está fuera en todos los tramos
    const data = mapMasivo(t, 'Costalero 6', fueraIdx)
    for (const fila of data.filas) {
      expect(fila.estado).toBe('FUERA')
      expect(fila.colorFila).toContain('background:#e0e0e0')
      expect(fila.colorFila).toContain('color:#333')
    }
  })

  it('costalero fuera debe tener primerTramo y ultimoTramo null', () => {
    const data = mapMasivo(t, 'Costalero 6', 5)
    expect(data.primerTramo).toBeNull()
    expect(data.ultimoTramo).toBeNull()
  })
})

// ── Varied states ──────────────────────────────────────────────────

describe('mapMasivo — estados variados', () => {
  it('costalero que entra y sale debe alternar DENTRO/FUERA', () => {
    const t = createTrabajaderaValida(5, 4, 6)
    // Modificar plan: costalero 0 dentro en tramo 0, fuera en tramo 1, dentro en 2, fuera en 3
    t.plan = [
      { dentro: [0, 1, 2, 3, 4], fuera: [5] },
      { dentro: [1, 2, 3, 4, 5], fuera: [0] },
      { dentro: [0, 1, 2, 3, 4], fuera: [5] },
      { dentro: [1, 2, 3, 4, 5], fuera: [0] },
    ]
    const data = mapMasivo(t, 'Costalero 1', 0)
    expect(data.filas[0].estado).toBe('DENTRO')
    expect(data.filas[1].estado).toBe('FUERA')
    expect(data.filas[2].estado).toBe('DENTRO')
    expect(data.filas[3].estado).toBe('FUERA')
  })

  it('costalero que no está ni dentro ni fuera debe tener estado —', () => {
    const t = createTrabajaderaValida(6, 2, 8)
    // Costalero 7 (idx 7) no está en dentro ni fuera de ningún tramo
    t.plan = [
      { dentro: [0, 1, 2, 3, 4], fuera: [5, 6] },
      { dentro: [0, 1, 2, 3, 4], fuera: [5, 6] },
    ]
    const data = mapMasivo(t, 'Costalero 8', 7)
    for (const fila of data.filas) {
      expect(fila.estado).toBe('—')
      expect(fila.colorFila).toContain('background:#f9f9f9')
      expect(fila.colorFila).toContain('color:#aaa')
    }
  })

  it('debe incluir rolLabel solo cuando está DENTRO', () => {
    const t = createTrabajaderaValida(7, 2, 6)
    const data = mapMasivo(t, 'Costalero 1', 0)
    // Costalero 0 está dentro en todos los tramos → debe tener rolLabel
    for (const fila of data.filas) {
      if (fila.estado === 'DENTRO') {
        expect(fila.rolLabel.length).toBeGreaterThan(0)
      }
    }
  })

  it('rolLabel debe estar vacío cuando está FUERA', () => {
    const t = createTrabajaderaValida(8, 2, 6)
    const data = mapMasivo(t, 'Costalero 6', 5)
    for (const fila of data.filas) {
      if (fila.estado === 'FUERA') {
        expect(fila.rolLabel).toBe('')
      }
    }
  })
})

// ── Edge cases ─────────────────────────────────────────────────────

describe('mapMasivo — edge cases', () => {
  it('debe manejar trabajadera sin plan (plan null)', () => {
    const t = createTrabajaderaValida(9, 2, 6)
    t.plan = null
    const data = mapMasivo(t, 'Costalero 1', 0)
    expect(data.filas).toHaveLength(2)
    // Sin plan, todos deberían ser '—'
    for (const fila of data.filas) {
      expect(fila.estado).toBe('—')
    }
  })

  it('debe manejar costalero con índice fuera de rango', () => {
    const t = createTrabajaderaValida(10, 2, 6)
    const data = mapMasivo(t, 'Fantasma', 99)
    expect(data.salidas).toBe(0)
    expect(data.objetivo).toBe(0)
    expect(data.primerTramo).toBeNull()
    expect(data.ultimoTramo).toBeNull()
    // Todas las filas deben ser '—' (no está en dentro ni fuera)
    for (const fila of data.filas) {
      expect(fila.estado).toBe('—')
    }
  })

  it('debe manejar un solo tramo', () => {
    const t = createTrabajaderaValida(11, 1, 6)
    const data = mapMasivo(t, 'Costalero 1', 0)
    expect(data.filas).toHaveLength(1)
    expect(data.primerTramo).toBe(0)
    expect(data.ultimoTramo).toBe(0)
  })

  it('primerTramo debe ser el índice del primer tramo donde está DENTRO', () => {
    const t = createTrabajaderaValida(12, 4, 6)
    t.plan = [
      { dentro: [1, 2, 3, 4, 5], fuera: [0] },
      { dentro: [1, 2, 3, 4, 5], fuera: [0] },
      { dentro: [0, 1, 2, 3, 4], fuera: [5] },
      { dentro: [0, 1, 2, 3, 4], fuera: [5] },
    ]
    // Costalero 1 (idx 0) está fuera en 0,1 y dentro en 2,3
    const data = mapMasivo(t, 'Costalero 1', 0)
    expect(data.primerTramo).toBe(2)
    expect(data.ultimoTramo).toBe(3)
  })
})
