// ══════════════════════════════════════════════════════════════════
// TEMPLATE MASIVO — Construye el HTML de una página individual Masivo
// ══════════════════════════════════════════════════════════════════

import type { MasivoPageData } from '../types'
import {
  masivoPageHeaderHTML,
  masivoTableHeaderHTML,
  filaHTML,
  estadoCellHTML,
  masivoStatsHTML,
  masivoLegendHTML,
  masivoPageWrapperHTML,
} from '../styles/masivo'
import { esc } from '../../nombres'

/**
 * Construye el HTML de una página individual para la vista Masivo
 * (una página por costalero, formato A5 portrait).
 *
 * Es pura: toma MasivoPageData y retorna un string HTML.
 *
 * @param data Datos mapeados de un costalero (desde mapMasivo)
 * @returns HTML completo de la página para ese costalero
 */
export function masivoPage(data: MasivoPageData): string {
  const { costaleroNombre, trabajaderaId, fecha, nombrePaso, filas, salidas, objetivo, primerTramo, ultimoTramo } = data

  // ── Filas de la tabla ──────────────────────────────────────────
  const tbodyHTML = filas
    .map(fila => {
      const estadoHTML = estadoCellHTML(fila.estado, fila.rolLabel)
      return filaHTML(esc(fila.tramoNombre), estadoHTML, fila.colorFila)
    })
    .join('')

  // ── Content ────────────────────────────────────────────────────
  const content =
    masivoPageHeaderHTML(esc(nombrePaso), esc(costaleroNombre), trabajaderaId, fecha) +
    `<table style="width:100%;border-collapse:collapse;margin-bottom:10px;">${masivoTableHeaderHTML()}<tbody>${tbodyHTML}</tbody></table>` +
    masivoStatsHTML(salidas, objetivo, primerTramo, ultimoTramo) +
    masivoLegendHTML()

  return masivoPageWrapperHTML(content)
}
