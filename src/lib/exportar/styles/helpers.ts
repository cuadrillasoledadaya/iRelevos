// ══════════════════════════════════════════════════════════════════
// HELPERS — Funciones de estilo compartidas (tipadas)
// ══════════════════════════════════════════════════════════════════

import type { StyleConfig } from '../types'
import { COLORS } from './colors'

/**
 * Construye un string CSS a partir de un objeto StyleConfig.
 * Las propiedades `undefined` se omiten.
 */
export function buildStyle(config?: Partial<StyleConfig>): string {
  if (!config) return ''
  const parts: string[] = []
  for (const [key, value] of Object.entries(config)) {
    if (value !== undefined) {
      parts.push(`${key.replace(/([A-Z])/g, '-$1').toLowerCase()}:${value}`)
    }
  }
  return parts.length ? parts.join(';') + ';' : ''
}

/**
 * Celda base con borde y padding para tablas.
 * @param extra Estilos adicionales a inyectar al final del string CSS.
 */
export function cellBase(extra?: string): string {
  let base = 'border:1px solid #000;padding:8px;'
  if (extra) base += extra
  return base
}

/**
 * Celda de encabezado de tabla.
 * @param override Color de fondo (string), o config completo de estilo.
 *        Por defecto usa COLORS.tableHeaderAlt (#e8d5c4).
 */
export function headerCell(override?: string | Partial<StyleConfig>): string {
  if (typeof override === 'string') {
    return `border:1px solid #000;padding:8px;font-weight:700;text-align:center;background:${override};`
  }
  const bg = override?.background ?? COLORS.tableHeaderAlt
  return `border:1px solid #000;padding:8px;font-weight:700;text-align:center;background:${bg};`
}

/**
 * Celda de cabecera de columna (thead).
 * @param override Color de fondo (string), o config completo de estilo.
 *        Por defecto usa COLORS.primary (#c9a84c).
 */
export function theadCell(override?: string | Partial<StyleConfig>): string {
  if (typeof override === 'string') {
    return `border:1px solid #000;padding:8px;text-align:center;font-weight:700;background:${override};color:white;`
  }
  const overrides = override ?? {}
  const bg = overrides.background ?? COLORS.primary
  const color = overrides.color ?? 'white'
  const fontSize = overrides.fontSize
  let result = `border:1px solid #000;padding:8px;text-align:center;font-weight:700;background:${bg};color:${color};`
  if (fontSize) result += `font-size:${fontSize};`
  return result
}

/**
 * Celda de cuerpo de tabla.
 * @param extra Estilos extra a inyectar, o nada para solo el base.
 */
export function bodyCell(extra?: string): string {
  return cellBase('text-align:center;' + (extra ?? ''))
}

/**
 * Celda de nombre de tramo (columna izquierda, gris claro, alineada a la izquierda).
 */
export function nombreTramoCell(): string {
  return cellBase('font-weight:600;text-align:left;background:#f5f5f5;')
}

/**
 * Celda de la columna FUERA — texto más pequeño y gris.
 */
export function fueraCell(): string {
  return cellBase('text-align:center;font-size:11px;color:#555;font-weight:600;')
}
