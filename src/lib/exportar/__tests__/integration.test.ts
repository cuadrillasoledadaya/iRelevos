// ══════════════════════════════════════════════════════════════════
// INTEGRATION TESTS — Pipeline end-to-end: mapper → template → engine
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { exportarPDF } from '../pdf-capataz'
import { exportarPDFMasivoTodas } from '../pdf-masivo'
import { exportarRelevos, exportarRelevosIndividual, exportarRelevosMultiplesItems } from '../relevos'
import { createTrabajaderaValida, createTrabajaderaConProblemas } from './helpers'

// ── Mock setup ─────────────────────────────────────────────────────

interface MockWindow {
  document: {
    write: ReturnType<typeof vi.fn>
    close: ReturnType<typeof vi.fn>
  }
}

function setupMockWindow(): { mockWin: MockWindow; originalOpen: typeof window.open } {
  const mockWin: MockWindow = {
    document: {
      write: vi.fn(),
      close: vi.fn(),
    },
  }
  const originalOpen = window.open
  window.open = vi.fn().mockReturnValue(mockWin) as unknown as typeof window.open
  return { mockWin, originalOpen }
}

function restoreWindow(originalOpen: typeof window.open): void {
  window.open = originalOpen
}

// ── Helper: extraer HTML escrito ───────────────────────────────────

function getWrittenHTML(mockWin: MockWindow): string {
  const calls = mockWin.document.write.mock.calls
  if (calls.length === 0) return ''
  return calls[0][0] as string
}

// ══════════════════════════════════════════════════════════════════
// exportarPDF — Capataz
// ══════════════════════════════════════════════════════════════════

describe('Integration: exportarPDF (Capataz)', () => {
  let mockWin: MockWindow
  let originalOpen: typeof window.open

  beforeEach(() => {
    const setup = setupMockWindow()
    mockWin = setup.mockWin
    originalOpen = setup.originalOpen
  })

  afterEach(() => {
    restoreWindow(originalOpen)
  })

  it('debe llamar window.open y escribir HTML con estructura de capataz', () => {
    const t = createTrabajaderaValida(1, 3, 6)
    exportarPDF([t])

    expect(window.open).toHaveBeenCalledWith('', '_blank')

    const html = getWrittenHTML(mockWin)
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<title>Hoja del Capataz — Costaleros</title>')
    expect(html).toContain('@page{size:A4 landscape')
    expect(html).toContain('Hoja del Capataz')
    expect(html).toContain('Trabajadera 1')
    expect(html).toContain('window.print()')
    // Debe contener secciones (al menos una)
    expect(html).toContain('<section>')
    expect(mockWin.document.close).toHaveBeenCalled()
  })

  it('debe generar múltiples secciones para múltiples trabajaderas', () => {
    const t1 = createTrabajaderaValida(1, 3, 6)
    const t2 = createTrabajaderaValida(2, 2, 6)
    exportarPDF([t1, t2])

    const html = getWrittenHTML(mockWin)
    // Debe contener dos secciones
    const sectionMatches = (html.match(/<section>/g) || []).length
    expect(sectionMatches).toBe(2)
    expect(html).toContain('Trabajadera 1')
    expect(html).toContain('Trabajadera 2')
  })

  it('debe mostrar alerta si no hay trabajaderas con plan', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    const t = createTrabajaderaValida(1, 3, 6)
    // Quitar plan y análisis
    const sinPlan = { ...t, plan: null, analisis: null } as unknown as typeof t
    exportarPDF([sinPlan])

    expect(alertSpy).toHaveBeenCalledWith(
      '⚠ Calcula las rotaciones de al menos una trabajadera primero.',
    )
    expect(mockWin.document.write).not.toHaveBeenCalled()
    alertSpy.mockRestore()
  })

  it('debe manejar popup bloqueado', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    window.open = vi.fn().mockReturnValue(null) as unknown as typeof window.open

    const t = createTrabajaderaValida(1, 3, 6)
    exportarPDF([t])

    expect(alertSpy).toHaveBeenCalledWith('⚠ Permite ventanas emergentes para generar el PDF.')
    expect(mockWin.document.write).not.toHaveBeenCalled()
    alertSpy.mockRestore()
  })

  it('debe incluir estructura de tabla con thead, tbody y tfoot', () => {
    const t = createTrabajaderaValida(1, 3, 6)
    exportarPDF([t])

    const html = getWrittenHTML(mockWin)
    expect(html).toContain('<thead>')
    expect(html).toContain('<tbody>')
    expect(html).toContain('<tfoot>')
    expect(html).toContain('Costalero')
    expect(html).toContain('FUERA') // tfoot label
  })

  it('debe mostrar badge de estado correcto cuando el plan es válido', () => {
    const t = createTrabajaderaValida(1, 3, 6)
    exportarPDF([t])

    const html = getWrittenHTML(mockWin)
    expect(html).toContain('status-badge good')
    expect(html).toContain('✓ Plan correcto')
  })

  it('debe mostrar badge de advertencia cuando el plan tiene problemas', () => {
    const t = createTrabajaderaConProblemas(2, 3, 6)
    exportarPDF([t])

    const html = getWrittenHTML(mockWin)
    expect(html).toContain('status-badge bad')
    expect(html).toContain('⚠')
  })
})

// ══════════════════════════════════════════════════════════════════
// exportarPDFMasivoTodas — Masivo
// ══════════════════════════════════════════════════════════════════

describe('Integration: exportarPDFMasivoTodas (Masivo)', () => {
  let mockWin: MockWindow
  let originalOpen: typeof window.open

  beforeEach(() => {
    const setup = setupMockWindow()
    mockWin = setup.mockWin
    originalOpen = setup.originalOpen
  })

  afterEach(() => {
    restoreWindow(originalOpen)
  })

  it('debe generar una página por costalero activo', () => {
    const t = createTrabajaderaValida(1, 3, 6)
    exportarPDFMasivoTodas([t], 'Paso de Prueba')

    const html = getWrittenHTML(mockWin)
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<title>Relevos — Paso de Prueba</title>')
    expect(html).toContain('@page { size: A5 portrait')

    // 6 costaleros activos → 6 páginas
    const pageMatches = (html.match(/page-break-after:always/g) || []).length
    expect(pageMatches).toBe(6)

    expect(html).toContain('TRABAJADERA 1')
    expect(html).toContain('window.print()')
    expect(mockWin.document.close).toHaveBeenCalled()
  })

  it('debe excluir costaleros marcados como bajas', () => {
    const t = createTrabajaderaConProblemas(2, 3, 6) // bajas: [1, 4]
    exportarPDFMasivoTodas([t], 'Paso X')

    const html = getWrittenHTML(mockWin)
    // 6 costaleros - 2 bajas = 4 páginas
    const pageMatches = (html.match(/page-break-after:always/g) || []).length
    expect(pageMatches).toBe(4)

    // Costalero 2 (idx 1) es baja → no debe aparecer
    expect(html).not.toContain('Costalero 2')
  })

  it('debe mostrar alerta si no hay trabajaderas con plan', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    const t = createTrabajaderaValida(1, 3, 6)
    const sinPlan = { ...t, plan: null, analisis: null } as unknown as typeof t
    exportarPDFMasivoTodas([sinPlan], 'Paso')

    expect(alertSpy).toHaveBeenCalledWith(
      '⚠ Calcula las rotaciones de al menos una trabajadera primero.',
    )
    expect(mockWin.document.write).not.toHaveBeenCalled()
    alertSpy.mockRestore()
  })

  it('debe manejar popup bloqueado', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    window.open = vi.fn().mockReturnValue(null) as unknown as typeof window.open

    const t = createTrabajaderaValida(1, 3, 6)
    exportarPDFMasivoTodas([t], 'Paso')

    expect(alertSpy).toHaveBeenCalledWith('⚠ Permite ventanas emergentes para generar el PDF.')
    expect(mockWin.document.write).not.toHaveBeenCalled()
    alertSpy.mockRestore()
  })

  it('debe incluir estructura de tabla con TRAMO y TU ESTADO', () => {
    const t = createTrabajaderaValida(1, 3, 6)
    exportarPDFMasivoTodas([t], 'Paso')

    const html = getWrittenHTML(mockWin)
    expect(html).toContain('TRAMO')
    expect(html).toContain('TU ESTADO')
    expect(html).toContain('DENTRO')
    expect(html).toContain('FUERA')
  })

  it('debe incluir estadísticas de salidas y tramos', () => {
    const t = createTrabajaderaValida(1, 3, 6)
    exportarPDFMasivoTodas([t], 'Paso')

    const html = getWrittenHTML(mockWin)
    expect(html).toContain('Salidas')
    expect(html).toContain('Primer tramo')
    expect(html).toContain('Último tramo')
  })
})

// ══════════════════════════════════════════════════════════════════
// exportarRelevos — Relevos tables
// ══════════════════════════════════════════════════════════════════

describe('Integration: exportarRelevos (Relevos)', () => {
  let mockWin: MockWindow
  let originalOpen: typeof window.open

  beforeEach(() => {
    const setup = setupMockWindow()
    mockWin = setup.mockWin
    originalOpen = setup.originalOpen
  })

  afterEach(() => {
    restoreWindow(originalOpen)
  })

  it('debe generar tabla de relevos con roles y tramos', () => {
    const t = createTrabajaderaValida(1, 2, 6)
    exportarRelevos([t])

    expect(window.open).toHaveBeenCalledWith('', 'relevos', 'width=900,height=1000')

    const html = getWrittenHTML(mockWin)
    expect(html).toContain('COSTALEROS — TRABAJADERA 1')
    expect(html).toContain('RELEVOS')
    expect(html).toContain('FUERA')
    expect(html).toContain('btn-grupo') // from abrirVentanaImpresion
    expect(html).toContain('btn-print')
    expect(mockWin.document.close).toHaveBeenCalled()
  })

  it('debe generar múltiples tablas para múltiples trabajaderas', () => {
    const t1 = createTrabajaderaValida(1, 2, 6)
    const t2 = createTrabajaderaValida(2, 2, 6)
    exportarRelevos([t1, t2])

    const html = getWrittenHTML(mockWin)
    expect(html).toContain('TRABAJADERA 1')
    expect(html).toContain('TRABAJADERA 2')
  })
})

describe('Integration: exportarRelevosIndividual', () => {
  let mockWin: MockWindow
  let originalOpen: typeof window.open

  beforeEach(() => {
    const setup = setupMockWindow()
    mockWin = setup.mockWin
    originalOpen = setup.originalOpen
  })

  afterEach(() => {
    restoreWindow(originalOpen)
  })

  it('debe resaltar el costalero indicado en la tabla', () => {
    const t = createTrabajaderaValida(1, 2, 6)
    exportarRelevosIndividual(t, 2, 'Costalero 3')

    expect(window.open).toHaveBeenCalledWith(
      '',
      'relevos-individual',
      'width=900,height=1000',
    )

    const html = getWrittenHTML(mockWin)
    expect(html).toContain('Relevos - Costalero 3')
    expect(html).toContain('COSTALEROS — TRABAJADERA 1')
    // El costalero resaltado debe tener estilo de highlight (background:#4a4a4a)
    expect(html).toContain('background:#4a4a4a')
  })
})

describe('Integration: exportarRelevosMultiplesItems', () => {
  let mockWin: MockWindow
  let originalOpen: typeof window.open

  beforeEach(() => {
    const setup = setupMockWindow()
    mockWin = setup.mockWin
    originalOpen = setup.originalOpen
  })

  afterEach(() => {
    restoreWindow(originalOpen)
  })

  it('debe generar una tabla por cada índice con page-break-after', () => {
    const t = createTrabajaderaValida(1, 2, 6)
    exportarRelevosMultiplesItems(t, [0, 2])

    const html = getWrittenHTML(mockWin)
    // Debe haber page-break-after:always entre las tablas (las envolvemos con ese estilo)
    expect(html).toContain('page-break-after:always')
    // Dos tablas (dos índices)
    const tableMatches = (html.match(/COSTALEROS — TRABAJADERA 1/g) || []).length
    expect(tableMatches).toBe(2)
    expect(html).toContain('Relevos - Trabajadera 1')
  })
})
