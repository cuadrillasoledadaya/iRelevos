// ══════════════════════════════════════════════════════════════════
// TESTS — Style helpers (styles/helpers.ts)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import {
  buildStyle,
  theadCell,
  bodyCell,
  cellBase,
  headerCell,
  nombreTramoCell,
  fueraCell,
} from '../styles/helpers'

// ── buildStyle ────────────────────────────────────────────────────

describe('buildStyle', () => {
  it('debe retornar string CSS vacío sin argumentos', () => {
    const result = buildStyle()
    expect(result).toBe('')
  })

  it('debe construir string CSS con una propiedad', () => {
    const result = buildStyle({ border: '1px solid' })
    expect(result).toBe('border:1px solid;')
  })

  it('debe construir string CSS con múltiples propiedades', () => {
    const result = buildStyle({
      border: '1px solid',
      padding: '8px',
      background: '#fff',
    })
    expect(result).toBe('border:1px solid;padding:8px;background:#fff;')
  })

  it('debe omitir propiedades undefined', () => {
    const result = buildStyle({
      border: '1px solid',
      fontWeight: undefined,
      padding: '8px',
    })
    expect(result).toBe('border:1px solid;padding:8px;')
  })

  it('debe aceptar objeto vacío y retornar string vacío', () => {
    const result = buildStyle({})
    expect(result).toBe('')
  })
})

// ── theadCell ─────────────────────────────────────────────────────

describe('theadCell', () => {
  it('debe retornar estilo por defecto con color primario', () => {
    const result = theadCell()
    expect(result).toContain('border:1px solid #000')
    expect(result).toContain('padding:8px')
    expect(result).toContain('text-align:center')
    expect(result).toContain('font-weight:700')
    expect(result).toContain('background:#c9a84c')
    expect(result).toContain('color:white')
  })

  it('debe aceptar override de background', () => {
    const result = theadCell('#888')
    expect(result).toContain('background:#888')
    expect(result).toContain('color:white')
  })

  it('debe aceptar override completo de StyleConfig', () => {
    const result = theadCell({ background: '#333', color: '#fff', fontSize: '10pt' })
    expect(result).toContain('background:#333')
    expect(result).toContain('color:#fff')
    expect(result).toContain('font-size:10pt')
  })
})

// ── bodyCell ──────────────────────────────────────────────────────

describe('bodyCell', () => {
  it('debe retornar estilo base sin extras', () => {
    const result = bodyCell()
    expect(result).toContain('border:1px solid #000')
    expect(result).toContain('padding:8px')
    expect(result).toContain('text-align:center')
  })

  it('debe inyectar estilos extra al final', () => {
    const result = bodyCell('font-weight:700')
    expect(result).toBe(
      'border:1px solid #000;padding:8px;text-align:center;font-weight:700'
    )
  })
})

// ── cellBase ──────────────────────────────────────────────────────

describe('cellBase', () => {
  it('debe retornar bordes y padding base', () => {
    const result = cellBase()
    expect(result).toContain('border:1px solid #000')
    expect(result).toContain('padding:8px')
  })

  it('debe aceptar estilos extra', () => {
    const result = cellBase('text-align:right')
    expect(result).toBe(
      'border:1px solid #000;padding:8px;text-align:right'
    )
  })
})

// ── headerCell ────────────────────────────────────────────────────

describe('headerCell', () => {
  it('debe retornar estilo de header con bg por defecto', () => {
    const result = headerCell()
    expect(result).toContain('border:1px solid #000')
    expect(result).toContain('padding:8px')
    expect(result).toContain('font-weight:700')
    expect(result).toContain('text-align:center')
    expect(result).toContain('background:#e8d5c4')
  })

  it('debe aceptar override de background', () => {
    const result = headerCell('#f0f0f0')
    expect(result).toContain('background:#f0f0f0')
  })
})

// ── nombreTramoCell ───────────────────────────────────────────────

describe('nombreTramoCell', () => {
  it('debe retornar estilo de celda de nombre de tramo', () => {
    const result = nombreTramoCell()
    expect(result).toContain('border:1px solid #000')
    expect(result).toContain('padding:8px')
    expect(result).toContain('font-weight:600')
    expect(result).toContain('text-align:left')
    expect(result).toContain('background:#f5f5f5')
  })
})

// ── fueraCell ─────────────────────────────────────────────────────

describe('fueraCell', () => {
  it('debe retornar estilo de celda FUERA', () => {
    const result = fueraCell()
    expect(result).toContain('border:1px solid #000')
    expect(result).toContain('padding:8px')
    expect(result).toContain('text-align:center')
    expect(result).toContain('font-size:11px')
    expect(result).toContain('color:#555')
    expect(result).toContain('font-weight:600')
  })
})
