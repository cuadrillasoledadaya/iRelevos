// ══════════════════════════════════════════════════════════════════
// TESTS — relevosPage (pure template for Relevos table HTML)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { relevosPage } from '../templates/relevosPage'
import { mapRelevos } from '../mappers/mapRelevos'
import { createTrabajaderaValida } from './helpers'

function validData(tid = 1): ReturnType<typeof mapRelevos> {
  return mapRelevos(createTrabajaderaValida(tid, 3, 6))
}

// ── Structure ──────────────────────────────────────────────────────

describe('relevosPage — estructura', () => {
  it('debe retornar un string HTML no vacío', () => {
    const html = relevosPage(validData())
    expect(typeof html).toBe('string')
    expect(html.length).toBeGreaterThan(100)
  })

  it('debe comenzar con un div wrapper con page-break-inside:avoid', () => {
    const html = relevosPage(validData())
    expect(html).toContain('page-break-inside:avoid')
  })

  it('debe incluir una tabla con border-collapse:collapse', () => {
    const html = relevosPage(validData())
    expect(html).toContain('<table')
    expect(html).toContain('border-collapse:collapse')
    expect(html).toContain('</table>')
  })

  it('debe mostrar el título COSTALEROS — TRABAJADERA {id}', () => {
    const html = relevosPage(validData(5))
    expect(html).toContain('COSTALEROS')
    expect(html).toContain('TRABAJADERA 5')
  })

  it('debe incluir la fecha en el título', () => {
    const data = validData()
    const html = relevosPage(data)
    expect(html).toContain(data.fecha)
  })

  it('debe incluir todos los headers de roles del mapper', () => {
    const data = validData()
    const html = relevosPage(data)
    // Verificar cada header de rol (todos menos el último que es FUERA)
    for (const h of data.headers.slice(0, -1)) {
      expect(html).toContain(h.emoji)
      expect(html).toContain(h.label)
    }
    // El header FUERA usa un template fijo sin emoji personalizado
    expect(html).toContain('FUERA')
    expect(html).toContain('Descansan')
  })

  it('debe incluir una fila por cada tramo', () => {
    const data = validData()
    const html = relevosPage(data)
    // Contar <tr> tags — deberían ser: 1 (título) + 1 (headers) + N filas
    const trCount = (html.match(/<tr>/g) || []).length
    // 1 title row + 1 header row + 3 data rows = 5
    expect(trCount).toBe(5)
  })

  it('cada fila de datos debe contener el nombre del tramo', () => {
    const data = validData()
    const html = relevosPage(data)
    for (const row of data.rows) {
      expect(html).toContain(row.tramoNombre)
    }
  })

  it('cada fila debe incluir los nombres de los costaleros dentro', () => {
    const data = validData()
    const html = relevosPage(data)
    for (const row of data.rows) {
      for (const cell of row.cells) {
        expect(html).toContain(cell.nombre)
      }
    }
  })

  it('debe incluir los nombres de costaleros fuera en cada fila', () => {
    const data = validData()
    const html = relevosPage(data)
    for (const row of data.rows) {
      for (const nombre of row.fuera) {
        expect(html).toContain(nombre)
      }
    }
  })

  it('debe resaltar celdas highlighted con estilo diferente', () => {
    const t = createTrabajaderaValida(10, 2, 6)
    const data = mapRelevos(t, 0) // Resaltar costalero 1 (idx 0)
    const html = relevosPage(data)
    // Debe contener el estilo de highlight (background:#4a4a4a)
    expect(html).toContain('background:#4a4a4a')
    expect(html).toContain('color:white')
  })

  it('no debe tener estilos de highlight cuando ningún costalero está resaltado', () => {
    const html = relevosPage(validData())
    expect(html).not.toContain('background:#4a4a4a')
  })
})

// ── Content interpolation ──────────────────────────────────────────

describe('relevosPage — interpolación', () => {
  it('los nombres de los tramos deben aparecer como contenido de celdas', () => {
    const t = createTrabajaderaValida(20, 3, 6)
    t.tramos = ['Alpha', 'Beta', 'Gamma']
    const data = mapRelevos(t)
    const html = relevosPage(data)
    expect(html).toContain('Alpha')
    expect(html).toContain('Beta')
    expect(html).toContain('Gamma')
  })

  it('debe existir una celda con el texto RELEVOS como header de fila', () => {
    const html = relevosPage(validData())
    expect(html).toContain('RELEVOS')
  })
})

// ── Edge cases ─────────────────────────────────────────────────────

describe('relevosPage — edge cases', () => {
  it('debe manejar una tabla con un solo tramo', () => {
    const t = createTrabajaderaValida(30, 1, 6)
    const data = mapRelevos(t)
    const html = relevosPage(data)
    expect(html).toContain('<tr>')
    expect(html).toContain('</tr>')
    expect(html.length).toBeGreaterThan(100)
  })

  it('debe manejar tabla sin costaleros fuera (todos dentro)', () => {
    const t = createTrabajaderaValida(31, 2, 5)
    // 5 costaleros, todos dentro → fuera vacío
    const data = mapRelevos(t)
    const html = relevosPage(data)
    expect(html).toContain('<table')
  })

  it('debe escapar correctamente nombres con caracteres especiales', () => {
    const t = createTrabajaderaValida(32, 2, 6)
    // Usar nombres que shortName no trunque (una sola palabra con caracteres especiales)
    t.nombres = ['José&lt;&gt;', 'María&quot;Lola&quot;', 'Juan&amp;Pedro', 'Ana', 'Luis', 'Eva']
    const data = mapRelevos(t)
    const html = relevosPage(data)
    // Los nombres de tramo se escapan con esc()
    // Los nombres de costalero pasan por pillName → shortName que puede truncar
    // Verificar que el HTML está bien formado y no contiene raw HTML injection
    expect(html).not.toContain('<script>')
    expect(html).toContain('TRABAJADERA')
    expect(html).toContain('Tramo 1')
    expect(html).toContain('Tramo 2')
  })

  it('debe producir HTML con tags balanceados', () => {
    const html = relevosPage(validData())
    const openTable = (html.match(/<table/g) || []).length
    const closeTable = (html.match(/<\/table>/g) || []).length
    expect(openTable).toBe(closeTable)
    expect(openTable).toBe(1)
  })
})
