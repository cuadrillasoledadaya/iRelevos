// ══════════════════════════════════════════════════════════════════
// TEMPLATE CAPATAZ — Construye el HTML de una página del Capataz
// ══════════════════════════════════════════════════════════════════

import type { CapatazTableData } from '../types'
import {
  statusBadgeClass,
  capatazPageHeaderHTML,
  capatazLegendHTML,
} from '../styles/capataz'

/**
 * Construye el HTML de una sección/página individual para la Hoja del Capataz.
 *
 * Es pura: toma datos estructurados y retorna un string HTML.
 * No tiene efectos secundarios (no llama a window, DOM, ni APIs externas).
 *
 * @param data Datos mapeados de una trabajadera (desde mapCapataz)
 * @returns HTML completo de la sección <section>...</section>
 */
export function capatazPage(data: CapatazTableData): string {
  const { trabajaderaId, totalCostaleros, fueraPorTramo, numTramos, distDesc, statusTxt, statusGood, theadCells, tbodyRows, footerCells, fecha } = data

  const badgeClass = statusBadgeClass(statusGood)

  // ── Thead completo ──────────────────────────────────────────────
  const theadHTML = `<thead><tr><th class="th-nombre">Costalero</th><th class="th-sal">Sal.</th>${theadCells.join('')}</tr></thead>`

  // ── Tbody ───────────────────────────────────────────────────────
  const tbodyHTML = `<tbody>${tbodyRows.join('')}</tbody>`

  // ── Tfoot ───────────────────────────────────────────────────────
  const tfootHTML = `<tfoot><tr><td class="td-nombre" style="font-weight:700;font-size:8pt">FUERA</td><td class="td-sal"></td>${footerCells.join('')}</tr></tfoot>`

  return `<section>
      ${capatazPageHeaderHTML(fecha)}
      <div class="trab-title">
        <span class="trab-num">${trabajaderaId}</span>
        <div class="trab-info"><strong>Trabajadera ${trabajaderaId}</strong><span>${totalCostaleros} costaleros · ${fueraPorTramo} fuera por tramo · ${numTramos} tramos</span><span>${distDesc}</span></div>
        <div class="status-badge ${badgeClass}">${statusTxt}</div>
      </div>
      <div class="table-wrap"><table>${theadHTML}${tbodyHTML}${tfootHTML}</table></div>
      ${capatazLegendHTML()}
    </section>`
}
