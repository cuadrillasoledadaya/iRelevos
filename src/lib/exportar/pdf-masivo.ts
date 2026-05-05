// ══════════════════════════════════════════════════════════════════
// PDF MASIVO — Una página por costalero para WhatsApp
// ══════════════════════════════════════════════════════════════════

import type { Trabajadera } from '../types'
import { esc } from '../nombres'
import { estructuraPaso, getDentroFisico, rolLabel } from '../roles'

export function exportarPDFMasivoTodas(trabajaderas: Trabajadera[], nombrePaso: string): void {
  const conPlan = trabajaderas.filter(t => t.plan && t.analisis)
  if (!conPlan.length) {
    alert('⚠ Calcula las rotaciones de al menos una trabajadera primero.')
    return
  }

  const hoy = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  }).replace(/^\w/, c => c.toUpperCase())

  const paginas: string[] = []

  conPlan.forEach(t => {
    const activos = t.nombres
      .map((nombre, ci) => ({ nombre, ci }))
      .filter(({ ci }) => !t.bajas?.includes(ci))

    activos.forEach(({ nombre: nombreCostalero, ci: costaleroIdx }) => {
      const filas = t.tramos.map((nombreTramo, ti) => {
        const r = t.plan![ti] ?? { dentro: [], fuera: [] }
        const esDentro = r.dentro.includes(costaleroIdx)
        const esFuera = r.fuera.includes(costaleroIdx)

        let rolLabel2 = ''
        if (esDentro) {
          const dentroF = getDentroFisico(t, r)
          const posIdx = dentroF.findIndex(ci => ci === costaleroIdx)
          const estructura = estructuraPaso(t.id)
          const rolCode = posIdx !== -1 ? estructura[posIdx] : null
          if (rolCode) rolLabel2 = rolLabel(rolCode, t.id)
        }

        const colorFila = esDentro
          ? 'background:#ffffff;color:#000;'
          : esFuera
          ? 'background:#e0e0e0;color:#333;'
          : 'background:#f9f9f9;color:#aaa;'

        const celdaEstado = esDentro
          ? `<div style="font-size:11pt;font-weight:900;line-height:1.1;">DENTRO</div>
             <div style="font-size:7pt;font-weight:700;margin-top:1px;">${rolLabel2}</div>`
          : esFuera
          ? `<div style="font-size:11pt;font-weight:700;">FUERA</div>`
          : `<div style="font-size:11pt;">—</div>`

        return `<tr style="${colorFila}">
          <td style="border:1px solid #bbb;padding:4px 8px;font-weight:600;font-size:9pt;">${esc(nombreTramo)}</td>
          <td style="border:1px solid #bbb;padding:4px;text-align:center;">${celdaEstado}</td>
        </tr>`
      }).join('')

      const salidas = t.analisis?.conteo[costaleroIdx] ?? 0
      const objetivo = t.obj?.[costaleroIdx] ?? 0
      const primerTramo = t.tramos.findIndex((_, ti) => t.plan?.[ti]?.dentro.includes(costaleroIdx))
      const ultimoTramo = [...t.tramos].reverse().findIndex((_, ti) => {
        const realTi = t.tramos.length - 1 - ti
        return t.plan?.[realTi]?.dentro.includes(costaleroIdx)
      })
      const ultimoReal = ultimoTramo !== -1 ? t.tramos.length - 1 - ultimoTramo : -1

      paginas.push(`<div style="page-break-after:always;padding:10px 15px;font-family:Arial,sans-serif;">
        <div style="text-align:center;border-bottom:3px solid #c9a84c;padding-bottom:8px;margin-bottom:10px;">
          <div style="font-size:9pt;color:#888;letter-spacing:2px;text-transform:uppercase;">Hermandad · ${esc(nombrePaso)}</div>
          <div style="font-size:18pt;font-weight:900;color:#3d2b1f;letter-spacing:1px;margin:4px 0;">${esc(nombreCostalero)}</div>
          <div style="font-size:10pt;color:#c9a84c;font-weight:700;">TRABAJADERA ${t.id}</div>
          <div style="font-size:8pt;color:#888;margin-top:2px;">${hoy}</div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
          <thead>
            <tr style="background:#3d2b1f;color:white;">
              <th style="padding:6px;text-align:left;border:1px solid #222;font-size:9pt;">TRAMO</th>
              <th style="padding:6px;text-align:center;border:1px solid #222;width:100px;font-size:9pt;">TU ESTADO</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:6px;">
          <div style="background:#f9f3e3;border:1px solid #c9a84c;border-radius:6px;padding:6px 12px;text-align:center;">
            <div style="font-size:8pt;color:#888;">Salidas</div>
            <div style="font-size:14pt;font-weight:900;color:#c9a84c;">${salidas}<span style="font-size:9pt;color:#888;">/${objetivo}</span></div>
          </div>
          ${primerTramo !== -1 ? `<div style="background:#f9f3e3;border:1px solid #c9a84c;border-radius:6px;padding:6px 12px;text-align:center;">
            <div style="font-size:8pt;color:#888;">Primer tramo</div>
            <div style="font-size:12pt;font-weight:900;color:#3d2b1f;">T${primerTramo + 1}</div>
          </div>` : ''}
          ${ultimoReal !== -1 ? `<div style="background:#f9f3e3;border:1px solid #c9a84c;border-radius:6px;padding:6px 12px;text-align:center;">
            <div style="font-size:8pt;color:#888;">Último tramo</div>
            <div style="font-size:12pt;font-weight:900;color:#3d2b1f;">T${ultimoReal + 1}</div>
          </div>` : ''}
        </div>
        <div style="margin-top:10px;padding:6px;background:#f5f5f5;border-radius:6px;text-align:center;font-size:8pt;color:#888;">
          <span style="display:inline-block;width:12px;height:12px;background:#ffffff;border:1px solid #999;vertical-align:middle;margin-right:4px;"></span> = Dentro del paso &nbsp;&nbsp;
          <span style="display:inline-block;width:12px;height:12px;background:#e0e0e0;border:1px solid #999;vertical-align:middle;margin-right:4px;"></span> = Fuera (descansás)
        </div>
      </div>`)
    })
  })

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Relevos — ${esc(nombrePaso)}</title>
  <style>
    @page { size: A5 portrait; margin: 10mm }
    * { box-sizing: border-box; margin: 0; padding: 0 }
    body { 
      background: white; 
      -webkit-print-color-adjust: exact !important; 
      print-color-adjust: exact !important; 
    }
    tr, td, th { page-break-inside: avoid; break-inside: avoid; }
    @media print { .btn-grupo { display: none } }
  </style>
  </head><body>${paginas.join('')}<script>window.onload=function(){window.print();}<\/script></body></html>`

  const win = window.open('', '_blank')
  if (!win) { alert('⚠ Permite ventanas emergentes para generar el PDF.'); return }
  win.document.write(html)
  win.document.close()
}
