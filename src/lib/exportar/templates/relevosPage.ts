// ══════════════════════════════════════════════════════════════════
// TEMPLATE RELEVOS — Construye el HTML de la tabla de Relevos
// ══════════════════════════════════════════════════════════════════

import type { RelevosTableData } from '../types'
import { esc } from '../../nombres'
import {
  relevosTableCSS,
  roleHeaderHTML,
  fueraHeaderHTML,
  roleCellHTML,
  highlightedCellHTML,
  normalCellHTML,
  tramoNameCellHTML,
  fueraCellHTML,
  relevosHeaderCellHTML,
  relevosPageTitleHTML,
  tableWrapperHTML,
} from '../styles/relevos'

/**
 * Construye el HTML de la tabla de Relevos para una trabajadera.
 *
 * Es pura: toma RelevosTableData y retorna un string HTML.
 * Soporta resaltado de un costalero (highlighted = true).
 *
 * @param data Datos mapeados (desde mapRelevos)
 * @returns HTML completo del wrapper + tabla
 */
export function relevosPage(data: RelevosTableData): string {
  const { trabajaderaId, fecha, headers, rows } = data

  // ── Headers row ────────────────────────────────────────────────
  const rolesHeadersHTML = headers
    .slice(0, -1) // Todos menos el último (FUERA)
    .map(h => roleHeaderHTML(h.emoji, h.label))
    .join('')

  const fueraHeaderHTMLStr = fueraHeaderHTML()

  // ── Data rows ──────────────────────────────────────────────────
  const filasHTML = rows
    .map(row => {
      // Celdas de rol
      const celdasHTML = row.cells
        .map(cell => {
          if (cell.highlighted) return highlightedCellHTML(cell.nombre)
          // Si la celda tiene un nombre real y no está resaltada, usar normalCellHTML
          if (cell.nombre !== '—') return roleCellHTML(cell.nombre)
          // Celda vacía
          return normalCellHTML(cell.nombre)
        })
        .join('')

      // Celda FUERA
      const fueraNombres =
        row.fuera.length > 0 ? row.fuera.join(', ') : '—'
      const fueraHTML = fueraCellHTML(fueraNombres)

      return `<tr>${tramoNameCellHTML(esc(row.tramoNombre))}${celdasHTML}${fueraHTML}</tr>`
    })
    .join('')

  // ── Table ──────────────────────────────────────────────────────
  const titleRow = `<tr>${relevosPageTitleHTML(trabajaderaId, fecha)}</tr>`
  const headerRow = `<tr>${relevosHeaderCellHTML()}${rolesHeadersHTML}${fueraHeaderHTMLStr}</tr>`

  const tableHTML = `<table style="${relevosTableCSS}">${titleRow}${headerRow}${filasHTML}</table>`

  return tableWrapperHTML(tableHTML, false)
}
