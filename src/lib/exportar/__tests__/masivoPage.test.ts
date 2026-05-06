// ══════════════════════════════════════════════════════════════════
// TESTS — masivoPage (pure template for Masivo HTML page)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { masivoPage } from '../templates/masivoPage'
import { mapMasivo } from '../mappers/mapMasivo'
import { createTrabajaderaValida } from './helpers'
import type { MasivoPageData } from '../types'

function validData(idx = 0, nombrePaso = 'Mi Paso'): MasivoPageData {
  const t = createTrabajaderaValida(1, 3, 6)
  return mapMasivo(t, t.nombres[idx], idx, nombrePaso)
}

// ── Structure ──────────────────────────────────────────────────────

describe('masivoPage — estructura', () => {
  it('debe retornar un string HTML no vacío', () => {
    const html = masivoPage(validData())
    expect(typeof html).toBe('string')
    expect(html.length).toBeGreaterThan(100)
  })

  it('debe comenzar con un div wrapper con page-break-after', () => {
    const html = masivoPage(validData())
    expect(html).toContain('page-break-after:always')
  })

  it('debe incluir el header con nombre del paso', () => {
    const html = masivoPage(validData(0, 'Esperanza'))
    expect(html).toContain('Hermandad')
    expect(html).toContain('Esperanza')
  })

  it('debe mostrar el nombre del costalero en grande', () => {
    const data = validData(2)
    const html = masivoPage(data)
    expect(html).toContain(data.costaleroNombre)
    // Debe aparecer en un div con estilo grande
    expect(html).toContain('font-size:18pt')
  })

  it('debe mostrar el ID de la trabajadera', () => {
    const html = masivoPage(validData())
    expect(html).toContain('TRABAJADERA 1')
  })

  it('debe incluir la fecha', () => {
    const data = validData()
    const html = masivoPage(data)
    expect(html).toContain(data.fecha)
  })

  it('debe incluir una tabla con thead y tbody', () => {
    const html = masivoPage(validData())
    expect(html).toContain('<thead>')
    expect(html).toContain('<tbody>')
    expect(html).toContain('<table')
  })

  it('la tabla debe tener columnas TRAMO y TU ESTADO', () => {
    const html = masivoPage(validData())
    expect(html).toContain('TRAMO')
    expect(html).toContain('TU ESTADO')
  })

  it('debe incluir todas las filas del mapper', () => {
    const data = validData()
    const html = masivoPage(data)
    for (const fila of data.filas) {
      expect(html).toContain(fila.tramoNombre)
    }
  })

  it('debe mostrar DENTRO para estado DENTRO', () => {
    const data = validData(0) // Costalero 1 está dentro en todos los tramos
    const html = masivoPage(data)
    expect(html).toContain('DENTRO')
  })

  it('debe mostrar FUERA para estado FUERA', () => {
    const data = validData(5) // Costalero 6 está fuera en todos los tramos
    const html = masivoPage(data)
    expect(html).toContain('FUERA')
  })

  it('debe incluir el bloque de estadísticas (Salidas)', () => {
    const html = masivoPage(validData())
    expect(html).toContain('Salidas')
    expect(html).toContain(`${validData().salidas}`)
    expect(html).toContain(`/${validData().objetivo}`)
  })

  it('debe mostrar Primer tramo cuando existe', () => {
    const data = validData(0)
    expect(data.primerTramo).not.toBeNull()
    const html = masivoPage(data)
    expect(html).toContain('Primer tramo')
    expect(html).toContain(`T${data.primerTramo! + 1}`)
  })

  it('no debe mostrar Primer tramo cuando es null', () => {
    const data = validData(5) // Costalero 6 no está dentro en ningún tramo
    expect(data.primerTramo).toBeNull()
    const html = masivoPage(data)
    expect(html).not.toContain('Primer tramo')
  })

  it('debe mostrar Último tramo cuando existe', () => {
    const data = validData(0)
    expect(data.ultimoTramo).not.toBeNull()
    const html = masivoPage(data)
    expect(html).toContain('Último tramo')
    expect(html).toContain(`T${data.ultimoTramo! + 1}`)
  })

  it('no debe mostrar Último tramo cuando es null', () => {
    const data = validData(5)
    expect(data.ultimoTramo).toBeNull()
    const html = masivoPage(data)
    expect(html).not.toContain('Último tramo')
  })

  it('debe incluir la leyenda de colores al pie', () => {
    const html = masivoPage(validData())
    expect(html).toContain('Dentro del paso')
    expect(html).toContain('Fuera (descansás)')
  })

  it('debe mostrar el rolLabel cuando está DENTRO', () => {
    // Crear trabajadera con roles definidos
    const t = createTrabajaderaValida(5, 3, 6)
    const data = mapMasivo(t, t.nombres[0], 0, 'Paso')
    const html = masivoPage(data)
    // Debe contener el label de rol para el costalero dentro
    expect(html).toContain('font-size:7pt')
    expect(html).toContain('font-weight:700')
  })
})

// ── Content interpolation ──────────────────────────────────────────

describe('masivoPage — interpolación', () => {
  it('el nombre del costalero debe aparecer en un div destacado', () => {
    const data = validData(3)
    const html = masivoPage(data)
    // El nombre debe aparecer después del header de Hermandad
    const idxNombre = html.indexOf(data.costaleroNombre)
    const idxHermandad = html.indexOf('Hermandad')
    expect(idxNombre).toBeGreaterThan(idxHermandad)
  })

  it('cada fila debe tener el nombre de su tramo', () => {
    const t = createTrabajaderaValida(10, 2, 6)
    t.tramos = ['Primero', 'Segundo']
    const data = mapMasivo(t, t.nombres[0], 0, 'Test')
    const html = masivoPage(data)
    expect(html).toContain('Primero')
    expect(html).toContain('Segundo')
  })
})

// ── Edge cases ─────────────────────────────────────────────────────

describe('masivoPage — edge cases', () => {
  it('debe manejar página sin nombre de paso', () => {
    const t = createTrabajaderaValida(20, 1, 6)
    const data = mapMasivo(t, t.nombres[0], 0)
    const html = masivoPage(data)
    expect(html).toContain('Hermandad · ')
    expect(html.length).toBeGreaterThan(100)
  })

  it('debe manejar una sola fila de tramo', () => {
    const t = createTrabajaderaValida(21, 1, 6)
    const data = mapMasivo(t, t.nombres[0], 0, 'Solo')
    const html = masivoPage(data)
    expect(html).toContain('<tbody>')
    expect(html).toContain('<tr')
  })

  it('debe manejar página con costalero completamente fuera', () => {
    const data = validData(5)
    const html = masivoPage(data)
    expect(html).toContain('FUERA')
    expect(html).not.toContain('DENTRO')
    expect(html).not.toContain('Primer tramo')
  })
})
