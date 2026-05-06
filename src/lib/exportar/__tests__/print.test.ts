// ══════════════════════════════════════════════════════════════════
// TESTS — Print engine (engine/print.ts)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildPrintDoc, abrirVentanaImpresion } from '../engine/print'

// ── buildPrintDoc ─────────────────────────────────────────────────

describe('buildPrintDoc', () => {
  it('debe envolver body HTML en documento completo con <html>, <head>, <body>', () => {
    const result = buildPrintDoc('<p>Hola</p>', 'Test Title')
    expect(result).toContain('<!DOCTYPE html>')
    expect(result).toContain('<html lang="es">')
    expect(result).toContain('<title>Test Title</title>')
    expect(result).toContain('<p>Hola</p>')
    expect(result).toContain('</body>')
    expect(result).toContain('</html>')
  })

  it('debe incluir botones de imprimir y cerrar en .btn-grupo', () => {
    const result = buildPrintDoc('<p>Content</p>', 'Test')
    expect(result).toContain('btn-grupo')
    expect(result).toContain('btn-print')
    expect(result).toContain('btn-close')
    expect(result).toContain('window.print()')
    expect(result).toContain('window.close()')
  })

  it('debe incluir CSS de impresión con -webkit-print-color-adjust', () => {
    const result = buildPrintDoc('<p>Test</p>', 'Print Test')
    expect(result).toContain('-webkit-print-color-adjust: exact')
    expect(result).toContain('print-color-adjust: exact')
    expect(result).toContain('@media print')
    expect(result).toContain('.btn-grupo{display:none}')
  })

  it('debe incluir page-break-inside: avoid en regla de impresión', () => {
    const result = buildPrintDoc('<p>Test</p>', 'Test')
    expect(result).toContain('page-break-inside: avoid')
  })

  it('debe manejar body HTML vacío', () => {
    const result = buildPrintDoc('', 'Empty')
    expect(result).toContain('<title>Empty</title>')
    expect(result).toContain('<body>')
    expect(result).toContain('</body>')
  })
})

// ── abrirVentanaImpresion ─────────────────────────────────────────

describe('abrirVentanaImpresion', () => {
  let mockWindow: { document: { write: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> } }
  let originalOpen: typeof window.open

  beforeEach(() => {
    mockWindow = {
      document: {
        write: vi.fn(),
        close: vi.fn(),
      },
    }
    originalOpen = window.open
    window.open = vi.fn().mockReturnValue(mockWindow) as unknown as typeof window.open
  })

  afterEach(() => {
    window.open = originalOpen
  })

  it('debe llamar window.open con nombre y dimensiones', () => {
    abrirVentanaImpresion('<p>Hola</p>', 'Mi Título', 'miVentana')
    expect(window.open).toHaveBeenCalledWith('', 'miVentana', 'width=900,height=1000')
  })

  it('debe escribir HTML en el documento de la ventana', () => {
    abrirVentanaImpresion('<p>Contenido</p>', 'Título', 'ventana')
    expect(mockWindow.document.write).toHaveBeenCalledTimes(1)
    const writtenHTML = mockWindow.document.write.mock.calls[0][0] as string
    expect(writtenHTML).toContain('<p>Contenido</p>')
    expect(writtenHTML).toContain('<title>Título</title>')
    expect(mockWindow.document.close).toHaveBeenCalledTimes(1)
  })

  it('debe incluir el HTML del body dentro del wrapper de buildPrintDoc', () => {
    abrirVentanaImpresion('<div>Body Content</div>', 'Test', 'w')
    const writtenHTML = mockWindow.document.write.mock.calls[0][0] as string
    expect(writtenHTML).toContain('<div>Body Content</div>')
    expect(writtenHTML).toContain('btn-grupo')
  })

  it('debe mostrar alerta cuando window.open retorna null (popup bloqueado)', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    window.open = vi.fn().mockReturnValue(null) as unknown as typeof window.open

    abrirVentanaImpresion('<p>Test</p>', 'Título', 'ventana')

    expect(alertSpy).toHaveBeenCalledWith('⚠ Permite ventanas emergentes.')
    expect(mockWindow.document.write).not.toHaveBeenCalled()

    alertSpy.mockRestore()
  })

  it('no debe llamar document.write cuando ventana es null', () => {
    window.open = vi.fn().mockReturnValue(null) as unknown as typeof window.open

    abrirVentanaImpresion('<p>Test</p>', 'Título', 'ventana')

    expect(mockWindow.document.write).not.toHaveBeenCalled()
  })
})
