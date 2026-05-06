// ══════════════════════════════════════════════════════════════════
// TESTS — capatazPage (pure template for Capataz HTML page)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { capatazPage } from '../templates/capatazPage'
import { mapCapataz } from '../mappers/mapCapataz'
import { createTrabajaderaValida, createTrabajaderaConProblemas } from './helpers'
import type { CapatazTableData } from '../types'

/**
 * Helper: build CapatazTableData from a valid trabajadera.
 */
function validData(id = 1): CapatazTableData {
  return mapCapataz(createTrabajaderaValida(id))
}

/**
 * Helper: build CapatazTableData with problems.
 */
function problemsData(): CapatazTableData {
  return mapCapataz(createTrabajaderaConProblemas())
}

// ── Structure ──────────────────────────────────────────────────────

describe('capatazPage — estructura', () => {
  it('debe retornar un string HTML no vacío', () => {
    const html = capatazPage(validData())
    expect(typeof html).toBe('string')
    expect(html.length).toBeGreaterThan(100)
  })

  it('debe comenzar con tag <section>', () => {
    const html = capatazPage(validData())
    expect(html.trimStart()).toMatch(/^<section>/)
  })

  it('debe terminar con tag </section>', () => {
    const html = capatazPage(validData())
    expect(html.trimEnd()).toMatch(/<\/section>$/)
  })

  it('debe incluir el header de página con título y fecha', () => {
    const html = capatazPage(validData())
    expect(html).toContain('page-header')
    expect(html).toContain('Hoja del Capataz')
    expect(html).toContain('page-fecha')
  })

  it('debe contener la info de la trabajadera (trab-title)', () => {
    const html = capatazPage(validData())
    expect(html).toContain('trab-title')
    expect(html).toContain('trab-num')
    expect(html).toContain('trab-info')
  })

  it('debe mostrar el ID de la trabajadera', () => {
    const html = capatazPage(validData(7))
    expect(html).toContain('>7<')
    expect(html).toContain('Trabajadera 7')
  })

  it('debe mostrar total costaleros y fuera por tramo', () => {
    const data = validData()
    const html = capatazPage(data)
    expect(html).toContain(`${data.totalCostaleros} costaleros`)
    expect(html).toContain(`${data.fueraPorTramo} fuera por tramo`)
    expect(html).toContain(`${data.numTramos} tramos`)
  })

  it('debe mostrar distDesc en la info de la trabajadera', () => {
    const data = validData()
    const html = capatazPage(data)
    expect(html).toContain(data.distDesc)
  })

  it('debe incluir el badge de estado con la clase correcta', () => {
    const data = validData()
    const html = capatazPage(data)
    expect(html).toContain('status-badge')
    expect(html).toContain('class="status-badge good"')
    expect(html).toContain(data.statusTxt)
  })

  it('debe usar clase "bad" cuando statusGood es false', () => {
    const html = capatazPage(problemsData())
    expect(html).toContain('class="status-badge bad"')
  })

  it('debe contener la tabla dentro de un wrapper .table-wrap', () => {
    const html = capatazPage(validData())
    expect(html).toContain('table-wrap')
    expect(html).toContain('<table>')
    expect(html).toContain('</table>')
  })

  it('debe incluir <thead> con encabezados', () => {
    const html = capatazPage(validData())
    expect(html).toContain('<thead>')
    expect(html).toContain('</thead>')
    expect(html).toContain('th-nombre')
    expect(html).toContain('th-sal')
  })

  it('debe incluir las celdas del thead del mapper', () => {
    const data = validData()
    const html = capatazPage(data)
    for (const cell of data.theadCells) {
      expect(html).toContain(cell)
    }
  })

  it('debe incluir <tbody> con las filas de costaleros', () => {
    const html = capatazPage(validData())
    expect(html).toContain('<tbody>')
    expect(html).toContain('</tbody>')
  })

  it('debe incluir todas las filas tbody del mapper', () => {
    const data = validData()
    const html = capatazPage(data)
    for (const row of data.tbodyRows) {
      expect(html).toContain(row)
    }
  })

  it('debe incluir <tfoot> con footer cells', () => {
    const html = capatazPage(validData())
    expect(html).toContain('<tfoot>')
    expect(html).toContain('</tfoot>')
  })

  it('debe incluir todas las footer cells del mapper', () => {
    const data = validData()
    const html = capatazPage(data)
    for (const cell of data.footerCells) {
      expect(html).toContain(cell)
    }
  })

  it('debe incluir la leyenda al final', () => {
    const html = capatazPage(validData())
    expect(html).toContain('leyenda')
    expect(html).toContain('ley-d')
    expect(html).toContain('ley-f')
    expect(html).toContain('DENTRO')
    expect(html).toContain('FUERA')
  })
})

// ── Content interpolation ──────────────────────────────────────────

describe('capatazPage — interpolación', () => {
  it('los nombres de los costaleros deben aparecer en el HTML', () => {
    const t = createTrabajaderaValida(99, 2, 3)
    const data = mapCapataz(t)
    const html = capatazPage(data)
    // Los nombres deben estar en el output
    for (const nombre of t.nombres) {
      expect(html).toContain(nombre)
    }
  })

  it('los nombres de los tramos deben aparecer en el HTML', () => {
    const t = createTrabajaderaValida(50, 4, 6)
    const data = mapCapataz(t)
    const html = capatazPage(data)
    // Cada tramo debe aparecer (en thead)
    for (const tramo of t.tramos) {
      expect(html).toContain(tramo)
    }
  })

  it('la fecha del mapper debe aparecer en el HTML', () => {
    const data = validData()
    const html = capatazPage(data)
    expect(html).toContain(data.fecha)
  })
})

// ── Edge cases ─────────────────────────────────────────────────────

describe('capatazPage — edge cases', () => {
  it('debe manejar una sola fila de costalero sin errores', () => {
    const t = createTrabajaderaValida(200, 1, 1)
    const data = mapCapataz(t)
    const html = capatazPage(data)
    expect(html).toContain('<section>')
    expect(html).toContain('</section>')
    expect(html).toContain('<tbody>')
  })

  it('debe manejar datos sin tramos (vacío)', () => {
    const t = createTrabajaderaValida(201, 0, 6)
    t.tramos = [] // zero tramos
    const data = mapCapataz(t)
    const html = capatazPage(data)
    expect(html).toContain('<section>')
    expect(html).toContain('<table>')
    // Thead debe existir aunque vacío
    expect(html).toContain('<thead><tr><th')
  })

  it('debe producir HTML bien formado (tags balanceados)', () => {
    const html = capatazPage(validData())
    const openSection = (html.match(/<section/g) || []).length
    const closeSection = (html.match(/<\/section>/g) || []).length
    expect(openSection).toBe(closeSection)
    expect(openSection).toBeGreaterThan(0)
  })
})
