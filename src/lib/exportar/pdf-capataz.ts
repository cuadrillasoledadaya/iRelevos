// ══════════════════════════════════════════════════════════════════
// PDF CAPATAZ — Hoja del capataz con análisis de rotaciones
// ══════════════════════════════════════════════════════════════════

import type { Trabajadera } from '../types'

function nombrCompleto(t: Trabajadera, idx: number): string {
  return t.nombres[+idx] ?? (String(+idx + 1))
}

export function exportarPDF(trabajaderas: Trabajadera[]): void {
  const conPlan = trabajaderas.filter(t => t.plan && t.analisis)
  if (!conPlan.length) {
    alert('⚠ Calcula las rotaciones de al menos una trabajadera primero.')
    return
  }

  const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })

  const paginas = conPlan.map(t => {
    const total = t.nombres.length, F = total - 5, nAct = t.tramos.length
    const an = t.analisis!
    const objV = Object.values(t.obj!)
    const minS = Math.min(...objV), maxS = Math.max(...objV)
    const extC = objV.filter(v => v === maxS).length
    const distDesc = minS === maxS
      ? `${minS} salidas por costalero`
      : `${minS} salidas (${total - extC} costaleros) · ${maxS} salidas (${extC} costaleros)`

    const statusTxt = an.rep.length === 0 && an.cons === 0 && an.dentro5 && an.okObj
      ? '✓ Plan correcto'
      : `⚠ ${[
        an.rep.length ? `${an.rep.length} repite 1º/último` : '',
        an.cons ? `${an.cons} consecutivo(s)` : '',
        !an.dentro5 ? 'Algún tramo sin 5 dentro' : '',
        !an.okObj ? 'Desequilibrio de salidas' : '',
      ].filter(Boolean).join(' · ')}`

    const theadCells = t.tramos.map((nombre, ti) => {
      const esPri = ti === 0, esUlt = ti === nAct - 1
      const cls = esPri ? 'pri' : esUlt ? 'ult' : ''
      return `<th class="${cls}">${esPri ? '🟢 ' : esUlt ? '🔴 ' : ''}${nombre}</th>`
    }).join('')

    const tbodyRows = t.nombres.map((nombre, ci) => {
      const salV = an.conteo[ci] ?? 0, espV = t.obj?.[ci] ?? 0
      const salCls = salV === espV ? 'ok' : 'warn'
      const cells = t.tramos.map((_, ti) => {
        const r = t.plan?.[ti] ?? { dentro: [], fuera: [] }
        const esUlt = ti === nAct - 1
        const esDentro = r.dentro.includes(ci)
        const esFuera = r.fuera.includes(ci)
        const esRep = esUlt && an.primer.includes(ci) && esFuera
        const esCons = ti > 0 && (t.plan?.[ti - 1]?.fuera?.includes(ci) ?? false) && esFuera
        if (esDentro) return `<td class="cel-d">DENTRO</td>`
        if (esFuera) {
          const cls = esRep ? 'cel-rep' : esCons ? 'cel-cons' : 'cel-f'
          return `<td class="${cls}">FUERA${esRep ? ' ⚠' : ''}</td>`
        }
        return `<td class="cel-x">—</td>`
      }).join('')
      return `<tr><td class="td-nombre">${nombre}</td><td class="td-sal ${salCls}">${salV}/${espV}</td>${cells}</tr>`
    }).join('')

    const footerCells = t.tramos.map((_, ti) => {
      const r = t.plan?.[ti] ?? { dentro: [], fuera: [] }
      const ok = r.dentro.length === 5
      return `<td class="td-foot ${ok ? 'ok' : 'warn'}">${r.dentro.length}/5<br><small>${r.fuera.map(i => nombrCompleto(t, i)).join(', ')}</small></td>`
    }).join('')

    return `<section>
      <div class="page-header"><div class="page-title">⚙ Relevos de Costaleros — Hoja del Capataz</div><div class="page-fecha">${fecha}</div></div>
      <div class="trab-title">
        <span class="trab-num">${t.id}</span>
        <div class="trab-info"><strong>Trabajadera ${t.id}</strong><span>${total} costaleros · ${F} fuera por tramo · ${nAct} tramos</span><span>${distDesc}</span></div>
        <div class="status-badge ${an.rep.length || an.cons || !an.dentro5 || !an.okObj ? 'bad' : 'good'}">${statusTxt}</div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th class="th-nombre">Costalero</th><th class="th-sal">Sal.</th>${theadCells}</tr></thead>
        <tbody>${tbodyRows}</tbody>
        <tfoot><tr><td class="td-nombre" style="font-weight:700;font-size:8pt">FUERA</td><td class="td-sal"></td>${footerCells}</tr></tfoot>
      </table></div>
      <div class="leyenda">
        <span class="ley-item ley-d">DENTRO</span><span class="ley-item ley-f">FUERA</span>
        <span class="ley-item ley-rep">FUERA ⚠ = repite 1º/último</span><span class="ley-item ley-cons">Naranja = consecutivo</span>
        <span style="margin-left:auto;font-size:7pt;color:#888">Sal. = salidas realizadas / objetivo</span>
      </div>
    </section>`
  }).join('')

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Hoja del Capataz — Costaleros</title>
<style>
@page{size:A4 landscape;margin:12mm 10mm}*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Arial',sans-serif;font-size:9pt;color:#111;background:#fff;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}
tr, td, th { page-break-inside: avoid; break-inside: avoid; }
section{page-break-after:always;display:flex;flex-direction:column;min-height:calc(100vh - 24mm);padding-bottom:4mm}
section:last-child{page-break-after:avoid}
.page-header{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #8a6d2f;padding-bottom:3mm;margin-bottom:3mm}
.page-title{font-size:11pt;font-weight:700;color:#5a3e10;letter-spacing:.05em}.page-fecha{font-size:8pt;color:#888}
.trab-title{display:flex;align-items:flex-start;gap:3mm;margin-bottom:3mm;padding:2mm 3mm;background:#f9f3e3;border-left:4px solid #c9a84c;border-radius:2px}
.trab-num{font-size:22pt;font-weight:900;color:#c9a84c;line-height:1;flex-shrink:0}
.trab-info{display:flex;flex-direction:column;gap:1px;flex:1}.trab-info strong{font-size:11pt;color:#3d2b1f}.trab-info span{font-size:7.5pt;color:#666}
.status-badge{font-size:7.5pt;padding:2px 6px;border-radius:3px;font-weight:700;flex-shrink:0;align-self:center}
.status-badge.good{background:#d4edda;color:#155724;border:1px solid #c3e6cb}.status-badge.bad{background:#fff3cd;color:#856404;border:1px solid #ffc107}
.table-wrap{flex:1;overflow:hidden}table{border-collapse:collapse;width:100%;table-layout:fixed}
thead tr{background:#3d2b1f;color:#fff}thead th{padding:2.5mm 2mm;font-size:7.5pt;font-weight:700;text-align:center;border:1px solid #2a1f15;letter-spacing:.03em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
thead th.th-nombre{text-align:left;width:22mm}thead th.th-sal{width:10mm;font-size:7pt}thead th.pri{background:#1a5c2a}thead th.ult{background:#8b1a1a}
tbody tr:nth-child(even){background:#faf6f0}tbody td{padding:2mm 2mm;border:1px solid #ddd;text-align:center;font-size:7.5pt;font-weight:600}
.td-nombre{text-align:left;font-weight:700;font-size:8pt;color:#3d2b1f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.td-sal{font-size:7pt;color:#666;font-weight:400}.td-sal.ok{color:#155724;font-weight:700}.td-sal.warn{color:#856404;font-weight:700}
.cel-d{background:#d4edda;color:#155724;border-color:#c3e6cb;font-size:7pt;letter-spacing:.05em}
.cel-f{background:#f8d7da;color:#721c24;border-color:#f5c6cb;font-size:7pt;letter-spacing:.05em}
.cel-rep{background:#ff9800;color:#fff;border-color:#e65100;font-size:7pt;font-weight:900}
.cel-cons{background:#ffe082;color:#5d4037;border-color:#ffb300;font-size:7pt}.cel-x{color:#ccc;font-size:7pt}
tfoot td{padding:1.5mm 2mm;background:#f0e8d8;border:1px solid #ccc;font-size:6.5pt;color:#555;text-align:center;vertical-align:top;line-height:1.3}
tfoot .td-nombre{font-size:7pt;font-weight:700;color:#3d2b1f}.tfoot .td-foot.ok{color:#155724}.tfoot .td-foot.warn{color:#856404}
tfoot small{font-weight:400;display:block;margin-top:1px;white-space:normal;word-break:break-word}
.leyenda{display:flex;gap:4mm;align-items:center;flex-wrap:wrap;margin-top:2mm;padding-top:2mm;border-top:1px solid #ddd}
.ley-item{font-size:7pt;padding:1px 5px;border-radius:2px;font-weight:600}
.ley-d{background:#d4edda;color:#155724;border:1px solid #c3e6cb}.ley-f{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb}
.ley-rep{background:#ff9800;color:#fff;border:1px solid #e65100}.ley-cons{background:#ffe082;color:#5d4037;border:1px solid #ffb300}
</style></head><body>${paginas}<script>window.onload=function(){window.print();}<\/script></body></html>`

  const win = window.open('', '_blank')
  if (!win) { alert('⚠ Permite ventanas emergentes para generar el PDF.'); return }
  win.document.write(html)
  win.document.close()
}
