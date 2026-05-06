// ══════════════════════════════════════════════════════════════════
// STYLES RELEVOS — Funciones de estilo para tablas de Relevos
// ══════════════════════════════════════════════════════════════════

import { COLORS } from './colors'
import { theadCell, headerCell, bodyCell, nombreTramoCell, fueraCell } from './helpers'

/** CSS de tabla compartido para Relevos (sin modificar respecto al original) */
export const relevosTableCSS: string =
  `width:100%;border-collapse:collapse;margin-bottom:10px;`

/** CSS de título de página */
export function pageTitleCSS(bg?: string): string {
  return `border:1px solid #000;padding:12px;text-align:center;font-weight:700;background:${bg ?? COLORS.tableHeader};color:white;font-size:16px;font-family:'Cinzel',serif;letter-spacing:1px;`
}

/**
 * HTML de celda de encabezado de rol (con emoji y label).
 * Replica exactamente el HTML inline de relevos.ts.
 */
export function roleHeaderHTML(emoji: string, label: string, bg?: string): string {
  return `<td style="${theadCell(bg)}"><strong>${emoji}<br>${label}</strong></td>`
}

/**
 * HTML de celda de encabezado FUERA.
 */
export function fueraHeaderHTML(bg?: string): string {
  return `<td style="${theadCell(bg ?? COLORS.gray)}width:150px;"><strong>FUERA<br>(Descansan)</strong></td>`
}

/**
 * HTML de celda de contenido de rol (con nombre del costalero).
 */
export function roleCellHTML(nombre: string): string {
  return `<td style="${bodyCell('font-weight:700')}"><strong>${nombre}</strong></td>`
}

/**
 * HTML de celda de costalero resaltado (highlight gris oscuro).
 */
export function highlightedCellHTML(nombre: string): string {
  return `<td style="${bodyCell(`border:2px solid ${COLORS.highlightBorder};background:${COLORS.highlightBg};color:white;font-weight:700`)}"><strong>${nombre}</strong></td>`
}

/**
 * HTML de celda normal (fondo blanco, texto negro) para Relevos individual.
 */
export function normalCellHTML(nombre: string): string {
  return `<td style="${bodyCell('background:white;color:black')}"><strong>${nombre}</strong></td>`
}

/**
 * HTML de celda de nombre de tramo.
 */
export function tramoNameCellHTML(nombre: string): string {
  return `<td style="${nombreTramoCell()}"><strong>${nombre}</strong></td>`
}

/**
 * HTML de celda FUERA con lista de nombres.
 */
export function fueraCellHTML(nombres: string): string {
  return `<td style="${fueraCell()}">${nombres}</td>`
}

/**
 * HTML de celda de cabecera de la fila RELEVOS.
 */
export function relevosHeaderCellHTML(): string {
  return `<td style="${headerCell()}"><strong>RELEVOS</strong></td>`
}

/**
 * HTML del título de tabla con ID de trabajadera y fecha.
 */
export function relevosPageTitleHTML(trabajaderaId: number, fecha: string, subtitle?: string): string {
  const subtitleHTML = subtitle
    ? `<br><span style="font-size:12px;margin-top:4px;display:block;">${subtitle}</span>`
    : `<br><span style="font-size:12px;margin-top:4px;display:block;">${fecha}</span>`
  return `<td style="${pageTitleCSS()}" colspan="100%">COSTALEROS — TRABAJADERA ${trabajaderaId}${subtitleHTML}</td>`
}

/** Wrapper div con page-break-inside:avoid */
export function tableWrapperHTML(content: string, pageBreakAfter = false): string {
  const extra = pageBreakAfter ? ' page-break-after:always; margin-bottom: 40px;' : 'margin-bottom:30px;'
  return `<div style="page-break-inside:avoid;${extra}">${content}</div>`
}
