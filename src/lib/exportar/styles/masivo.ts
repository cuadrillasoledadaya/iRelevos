// ══════════════════════════════════════════════════════════════════
// STYLES MASIVO — Funciones de estilo para PDF Masivo (A5 portrait)
// ══════════════════════════════════════════════════════════════════

import { COLORS } from './colors'

/** CSS base para el documento A5 portrait masivo */
export function masivoBaseCSS(): string {
  return `@page { size: A5 portrait; margin: 10mm }
    * { box-sizing: border-box; margin: 0; padding: 0 }
    body { 
      background: white; 
      -webkit-print-color-adjust: exact !important; 
      print-color-adjust: exact !important; 
    }
    tr, td, th { page-break-inside: avoid; break-inside: avoid; }
    @media print { .btn-grupo { display: none } }`
}

/**
 * CSS inline para el color de fondo de una fila según estado.
 * Replica exactamente los valores del código original en pdf-masivo.ts.
 */
export function filaColorStyle(estado: 'DENTRO' | 'FUERA' | '—'): string {
  switch (estado) {
    case 'DENTRO':
      return 'background:#ffffff;color:#000;'
    case 'FUERA':
      return `background:${COLORS.masivoFueraBg};color:${COLORS.masivoFueraText};`
    case '—':
      return `background:${COLORS.masivoNeutral};color:${COLORS.masivoDimText};`
  }
}

/**
 * HTML de celda de estado con rol (DENTRO, FUERA, —).
 * Replica exactamente el HTML inline de pdf-masivo.ts.
 */
export function estadoCellHTML(estado: 'DENTRO' | 'FUERA' | '—', rolLabel?: string): string {
  switch (estado) {
    case 'DENTRO':
      return `<div style="font-size:11pt;font-weight:900;line-height:1.1;">DENTRO</div>
             <div style="font-size:7pt;font-weight:700;margin-top:1px;">${rolLabel ?? ''}</div>`
    case 'FUERA':
      return `<div style="font-size:11pt;font-weight:700;">FUERA</div>`
    case '—':
      return `<div style="font-size:11pt;">—</div>`
  }
}

/**
 * HTML de fila de tabla con tramo y estado.
 */
export function filaHTML(tramoNombre: string, estadoHTML: string, estilo: string): string {
  return `<tr style="${estilo}">
          <td style="border:1px solid ${COLORS.masivoBorder};padding:4px 8px;font-weight:600;font-size:9pt;">${tramoNombre}</td>
          <td style="border:1px solid ${COLORS.masivoBorder};padding:4px;text-align:center;">${estadoHTML}</td>
        </tr>`
}

/**
 * HTML de encabezado de tabla (TRAMO | TU ESTADO).
 */
export function masivoTableHeaderHTML(): string {
  return `<thead>
            <tr style="background:${COLORS.dark};color:white;">
              <th style="padding:6px;text-align:left;border:1px solid ${COLORS.masivoDarkBorder};font-size:9pt;">TRAMO</th>
              <th style="padding:6px;text-align:center;border:1px solid ${COLORS.masivoDarkBorder};width:100px;font-size:9pt;">TU ESTADO</th>
            </tr>
          </thead>`
}

/**
 * HTML del header de página (Hermandad, nombre, trabajadera ID, fecha).
 */
export function masivoPageHeaderHTML(
  nombrePaso: string,
  costaleroNombre: string,
  trabajaderaId: number,
  fecha: string
): string {
  return `<div style="text-align:center;border-bottom:3px solid ${COLORS.primary};padding-bottom:8px;margin-bottom:10px;">
          <div style="font-size:9pt;color:${COLORS.gray};letter-spacing:2px;text-transform:uppercase;">Hermandad · ${nombrePaso}</div>
          <div style="font-size:18pt;font-weight:900;color:${COLORS.dark};letter-spacing:1px;margin:4px 0;">${costaleroNombre}</div>
          <div style="font-size:10pt;color:${COLORS.primary};font-weight:700;">TRABAJADERA ${trabajaderaId}</div>
          <div style="font-size:8pt;color:${COLORS.gray};margin-top:2px;">${fecha}</div>
        </div>`
}

/**
 * HTML del bloque de estadísticas (salidas, primer tramo, último tramo).
 */
export function masivoStatsHTML(
  salidas: number,
  objetivo: number,
  primerTramo: number | null,
  ultimoTramo: number | null
): string {
  const statBox = (label: string, value: string) =>
    `<div style="background:${COLORS.warmPage};border:1px solid ${COLORS.primary};border-radius:6px;padding:6px 12px;text-align:center;">
       <div style="font-size:8pt;color:${COLORS.gray};">${label}</div>
       <div style="font-size:14pt;font-weight:900;color:${COLORS.primary};">${value}</div>
     </div>`

  return `<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:6px;">
          <div style="background:${COLORS.warmPage};border:1px solid ${COLORS.primary};border-radius:6px;padding:6px 12px;text-align:center;">
            <div style="font-size:8pt;color:${COLORS.gray};">Salidas</div>
            <div style="font-size:14pt;font-weight:900;color:${COLORS.primary};">${salidas}<span style="font-size:9pt;color:${COLORS.gray};">/${objetivo}</span></div>
          </div>
          ${primerTramo !== null ? statBox('Primer tramo', `T${primerTramo + 1}`) : ''}
          ${ultimoTramo !== null ? statBox('Último tramo', `T${ultimoTramo + 1}`) : ''}
        </div>`
}

/**
 * HTML de la leyenda de colores al pie de cada página.
 */
export function masivoLegendHTML(): string {
  return `<div style="margin-top:10px;padding:6px;background:${COLORS.grayBg};border-radius:6px;text-align:center;font-size:8pt;color:${COLORS.gray};">
          <span style="display:inline-block;width:12px;height:12px;background:#ffffff;border:1px solid #999;vertical-align:middle;margin-right:4px;"></span> = Dentro del paso &nbsp;&nbsp;
          <span style="display:inline-block;width:12px;height:12px;background:${COLORS.masivoFueraBg};border:1px solid #999;vertical-align:middle;margin-right:4px;"></span> = Fuera (descansás)
        </div>`
}

/**
 * Wrapper de página individual para Masivo (page-break-after: always).
 */
export function masivoPageWrapperHTML(content: string): string {
  return `<div style="page-break-after:always;padding:10px 15px;font-family:Arial,sans-serif;">${content}</div>`
}
