// ══════════════════════════════════════════════════════════════════
// STYLES CAPATAZ — Funciones de estilo para la Hoja del Capataz
// ══════════════════════════════════════════════════════════════════

import { COLORS } from './colors'

/** CSS completo del bloque <style> para el PDF del Capataz (A4 landscape) */
export function capatazBaseCSS(): string {
  return `@page{size:A4 landscape;margin:12mm 10mm}*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Arial',sans-serif;font-size:9pt;color:#111;background:#fff;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}
tr, td, th { page-break-inside: avoid; break-inside: avoid; }
section{page-break-after:always;display:flex;flex-direction:column;min-height:calc(100vh - 24mm);padding-bottom:4mm}
section:last-child{page-break-after:avoid}
.page-header{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid ${COLORS.primaryDark};padding-bottom:3mm;margin-bottom:3mm}
.page-title{font-size:11pt;font-weight:700;color:${COLORS.primaryText};letter-spacing:.05em}.page-fecha{font-size:8pt;color:${COLORS.gray}}
.trab-title{display:flex;align-items:flex-start;gap:3mm;margin-bottom:3mm;padding:2mm 3mm;background:${COLORS.warmPage};border-left:4px solid ${COLORS.primary};border-radius:2px}
.trab-num{font-size:22pt;font-weight:900;color:${COLORS.primary};line-height:1;flex-shrink:0}
.trab-info{display:flex;flex-direction:column;gap:1px;flex:1}.trab-info strong{font-size:11pt;color:${COLORS.dark}}.trab-info span{font-size:7.5pt;color:#666}
.status-badge{font-size:7.5pt;padding:2px 6px;border-radius:3px;font-weight:700;flex-shrink:0;align-self:center}
.status-badge.good{background:${COLORS.dentroBg};color:${COLORS.dentroText};border:1px solid ${COLORS.dentroBorder}}.status-badge.bad{background:${COLORS.warnBg};color:${COLORS.warnText};border:1px solid ${COLORS.warnBorder}}
.table-wrap{flex:1;overflow:hidden}table{border-collapse:collapse;width:100%;table-layout:fixed}
thead tr{background:${COLORS.dark};color:#fff}thead th{padding:2.5mm 2mm;font-size:7.5pt;font-weight:700;text-align:center;border:1px solid ${COLORS.darkBorder};letter-spacing:.03em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
thead th.th-nombre{text-align:left;width:22mm}thead th.th-sal{width:10mm;font-size:7pt}thead th.pri{background:${COLORS.headerPri}}thead th.ult{background:${COLORS.headerUlt}}
tbody tr:nth-child(even){background:${COLORS.warmBg}}tbody td{padding:2mm 2mm;border:1px solid ${COLORS.grayBorder};text-align:center;font-size:7.5pt;font-weight:600}
.td-nombre{text-align:left;font-weight:700;font-size:8pt;color:${COLORS.dark};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.td-sal{font-size:7pt;color:#666;font-weight:400}.td-sal.ok{color:${COLORS.dentroText};font-weight:700}.td-sal.warn{color:${COLORS.warnText};font-weight:700}
.cel-d{background:${COLORS.dentroBg};color:${COLORS.dentroText};border-color:${COLORS.dentroBorder};font-size:7pt;letter-spacing:.05em}
.cel-f{background:${COLORS.fueraBg};color:${COLORS.fueraText};border-color:${COLORS.fueraBorder};font-size:7pt;letter-spacing:.05em}
.cel-rep{background:${COLORS.repBg};color:${COLORS.repText};border-color:${COLORS.repBorder};font-size:7pt;font-weight:900}
.cel-cons{background:${COLORS.consBg};color:${COLORS.consText};border-color:${COLORS.consBorder};font-size:7pt}.cel-x{color:#ccc;font-size:7pt}
tfoot td{padding:1.5mm 2mm;background:${COLORS.footerBg};border:1px solid ${COLORS.grayLight};font-size:6.5pt;color:${COLORS.mutedText};text-align:center;vertical-align:top;line-height:1.3}
tfoot .td-nombre{font-size:7pt;font-weight:700;color:${COLORS.dark}}.tfoot .td-foot.ok{color:${COLORS.dentroText}}.tfoot .td-foot.warn{color:${COLORS.warnText}}
tfoot small{font-weight:400;display:block;margin-top:1px;white-space:normal;word-break:break-word}
.leyenda{display:flex;gap:4mm;align-items:center;flex-wrap:wrap;margin-top:2mm;padding-top:2mm;border-top:1px solid ${COLORS.grayBorder}}
.ley-item{font-size:7pt;padding:1px 5px;border-radius:2px;font-weight:600}
.ley-d{background:${COLORS.dentroBg};color:${COLORS.dentroText};border:1px solid ${COLORS.dentroBorder}}.ley-f{background:${COLORS.fueraBg};color:${COLORS.fueraText};border:1px solid ${COLORS.fueraBorder}}
.ley-rep{background:${COLORS.repBg};color:${COLORS.repText};border:1px solid ${COLORS.repBorder}}.ley-cons{background:${COLORS.consBg};color:${COLORS.consText};border:1px solid ${COLORS.consBorder}}`
}

/** Clase CSS para el badge de estado (good | bad) */
export function statusBadgeClass(good: boolean): 'good' | 'bad' {
  return good ? 'good' : 'bad'
}

/** Clase CSS para celda DENTRO */
export const cellDentroClass = 'cel-d'

/** Clase CSS para celda FUERA */
export const cellFueraClass = 'cel-f'

/** Clase CSS para celda repetida */
export const cellRepClass = 'cel-rep'

/** Clase CSS para celda consecutiva */
export const cellConsClass = 'cel-cons'

/** Clase CSS para celda vacía */
export const cellEmptyClass = 'cel-x'

/** Clase CSS para saldo OK */
export const saldoOkClass = 'ok'

/** Clase CSS para saldo warning */
export const saldoWarnClass = 'warn'

/** Clase CSS para thead primer tramo */
export const theadPriClass = 'pri'

/** Clase CSS para thead último tramo */
export const theadUltClass = 'ult'

/** Leyenda HTML fija para todas las hojas del Capataz */
export function capatazLegendHTML(): string {
  return `<div class="leyenda">
        <span class="ley-item ley-d">DENTRO</span><span class="ley-item ley-f">FUERA</span>
        <span class="ley-item ley-rep">FUERA ⚠ = repite 1º/último</span><span class="ley-item ley-cons">Naranja = consecutivo</span>
        <span style="margin-left:auto;font-size:7pt;color:#888">Sal. = salidas realizadas / objetivo</span>
      </div>`
}

/** Header de página con título y fecha */
export function capatazPageHeaderHTML(fecha: string): string {
  return `<div class="page-header"><div class="page-title">⚙ Relevos de Costaleros — Hoja del Capataz</div><div class="page-fecha">${fecha}</div></div>`
}
