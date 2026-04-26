// ══════════════════════════════════════════════════════════════════
// EXPORTAR — PDF, relevos, JSON (ported from HTML sin cambios)
// ══════════════════════════════════════════════════════════════════

import type { Perfil, Trabajadera } from './types'
import { esc, pillName } from './nombres'
import { estructuraPaso, getDentroFisico, rolEmoji, rolLabel } from './roles'
import { migrarDatos } from './algoritmos'
import { newId } from './nombres'

// ── EXPORT JSON ────────────────────────────────────────────────────

export function exportarDatos(datos: unknown): void {
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `costaleros_backup_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportarPerfil(p: Perfil): void {
  const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const fecha = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `perfil_${p.nombre.replace(/[^a-z0-9]/gi, '_')}_${fecha}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export type ImportResult = 
  | { ok: true; perfiles: Perfil[]; message: string }
  | { ok: false; error: string }

export function parsearImport(text: string, fileName: string): ImportResult {
  try {
    const p = JSON.parse(text)

    // FORMATO 1: perfil individual
    if (p.datos && p.nombre && p.id) {
      const perfil: Perfil = { ...p, id: newId(), creadoEn: Date.now() }
      perfil.datos = migrarDatos(perfil.datos)
      return { ok: true, perfiles: [perfil], message: `✓ Perfil "${perfil.nombre}" importado` }
    }

    // FORMATO 2: backup completo {id1:{...}, id2:{...}}
    const valores = Object.values(p) as Perfil[]
    if (valores.length > 0 && valores.every(v => v && v.datos && v.nombre)) {
      const perfiles = valores.map(v => {
        const nuevo: Perfil = { ...v, id: newId(), creadoEn: v.creadoEn ?? Date.now() }
        nuevo.datos = migrarDatos(nuevo.datos)
        return nuevo
      })
      return { ok: true, perfiles, message: `✓ ${perfiles.length} perfil${perfiles.length > 1 ? 'es' : ''} importado${perfiles.length > 1 ? 's' : ''}` }
    }

    // FORMATO 3: legacy con trabajaderas directamente
    if (p.trabajaderas) {
      const nombre = fileName.replace(/\.json$/i, '').replace(/[_-]/g, ' ') || 'Importado'
      const perfil: Perfil = { id: newId(), nombre, creadoEn: Date.now(), datos: migrarDatos(p) }
      return { ok: true, perfiles: [perfil], message: `✓ Datos importados como perfil "${nombre}"` }
    }

    return { ok: false, error: 'El archivo no tiene un formato reconocido' }
  } catch (err: unknown) {
    return { ok: false, error: `Error al importar: ${err instanceof Error ? err.message : 'desconocido'}` }
  }
}

// ── EXPORTAR RELEVOS ───────────────────────────────────────────────

export function exportarRelevos(trabajaderas: Trabajadera[]): void {
  const hoy = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  }).replace(/^\w/, c => c.toUpperCase())

  const html = trabajaderas.map(t => {
    const estructura = estructuraPaso(t.id)
    const rolesHeaders = estructura.map(rol =>
      `<td style="border:1px solid #000;padding:8px;text-align:center;font-weight:700;background:#d4a574;color:white;"><strong>${rolEmoji(rol)}<br>${rolLabel(rol, t.id).split(' ')[0]}</strong></td>`
    ).join('')

    const filas = t.tramos.map((nombre, ti) => {
      const r = t.plan?.[ti] ?? { dentro: [], fuera: [] }
      const dentroF = getDentroFisico(t, r)
      const celdas = estructura.map((_, posIdx) => {
        const ci = dentroF[posIdx] ?? null
        const n = ci !== null ? pillName(t, ci) : '—'
        return `<td style="border:1px solid #000;padding:8px;text-align:center;"><strong>${n}</strong></td>`
      }).join('')
      return `<tr><td style="border:1px solid #000;padding:8px;font-weight:600;text-align:left;background:#f5f5f5;"><strong>${esc(nombre)}</strong></td>${celdas}</tr>`
    }).join('')

    return `<div style="page-break-inside:avoid;margin-bottom:30px;"><table style="width:100%;border-collapse:collapse;margin-bottom:10px;"><tr><td style="border:1px solid #000;padding:12px;text-align:center;font-weight:700;background:#d4a574;color:white;font-size:16px;font-family:'Cinzel',serif;letter-spacing:1px;" colspan="100%">COSTALEROS — TRABAJADERA ${t.id}<br><span style="font-size:12px;margin-top:4px;display:block;">${hoy}</span></td></tr><tr><td style="border:1px solid #000;padding:8px;font-weight:700;text-align:center;background:#e8d5c4;"><strong>RELEVOS</strong></td>${rolesHeaders}</tr>${filas}</table></div>`
  }).join('')

  abrirVentanaImpresion(html, 'Relevos de Costaleros', 'relevos')
}

export function exportarRelevosIndividual(t: Trabajadera, costaleroIdx: number, nombreCostalero: string): void {
  const hoy = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  }).replace(/^\w/, c => c.toUpperCase())

  const estructura = estructuraPaso(t.id)
  const rolesHeaders = estructura.map(rol =>
    `<td style="border:1px solid #000;padding:8px;text-align:center;font-weight:700;background:#d4a574;color:white;"><strong>${rolEmoji(rol)}<br>${rolLabel(rol, t.id).split(' ')[0]}</strong></td>`
  ).join('')

  const filas = t.tramos.map((nombre, ti) => {
    const r = t.plan?.[ti] ?? { dentro: [], fuera: [] }
    const dentroF = getDentroFisico(t, r)
    const celdas = estructura.map((_, posIdx) => {
      const ci = dentroF[posIdx] ?? null
      const n = ci !== null ? pillName(t, ci) : '—'
      if (ci === costaleroIdx) {
        return `<td style="border:2px solid #333;padding:8px;text-align:center;background:#4a4a4a;color:white;font-weight:700;"><strong>${n}</strong></td>`
      }
      return `<td style="border:1px solid #000;padding:8px;text-align:center;background:white;color:black;"><strong>${n}</strong></td>`
    }).join('')
    return `<tr><td style="border:1px solid #000;padding:8px;font-weight:600;text-align:left;background:#f5f5f5;"><strong>${esc(nombre)}</strong></td>${celdas}</tr>`
  }).join('')

  const html = `<div style="page-break-inside:avoid;"><table style="width:100%;border-collapse:collapse;margin-bottom:10px;"><tr><td style="border:1px solid #000;padding:12px;text-align:center;font-weight:700;background:#d4a574;color:white;font-size:16px;font-family:'Cinzel',serif;letter-spacing:1px;" colspan="100%">COSTALEROS — TRABAJADERA ${t.id}<br><span style="font-size:11px;margin-top:4px;display:block;">COSTALERO: <strong>${esc(nombreCostalero)}</strong> (resaltado en gris)</span><span style="font-size:11px;margin-top:2px;display:block;">${hoy}</span></td></tr><tr><td style="border:1px solid #000;padding:8px;font-weight:700;text-align:center;background:#e8d5c4;"><strong>RELEVOS</strong></td>${rolesHeaders}</tr>${filas}</table></div>`

  abrirVentanaImpresion(html, `Relevos - ${nombreCostalero}`, 'relevos-individual')
}

export function exportarRelevosMultiplesItems(t: Trabajadera, indices: number[]): void {
  const hoy = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  }).replace(/^\w/, c => c.toUpperCase())

  const estructura = estructuraPaso(t.id)
  const rolesHeaders = estructura.map(rol =>
    `<td style="border:1px solid #000;padding:8px;text-align:center;font-weight:700;background:#d4a574;color:white;"><strong>${rolEmoji(rol)}<br>${rolLabel(rol, t.id).split(' ')[0]}</strong></td>`
  ).join('')

  const html = indices.map(costaleroIdx => {
    const nombreCostalero = t.nombres[costaleroIdx]
    const filas = t.tramos.map((nombre, ti) => {
      const r = t.plan?.[ti] ?? { dentro: [], fuera: [] }
      const dentroF = getDentroFisico(t, r)
      const celdas = estructura.map((_, posIdx) => {
        const ci = dentroF[posIdx] ?? null
        const n = ci !== null ? pillName(t, ci) : '—'
        if (ci === costaleroIdx) {
          return `<td style="border:2px solid #333;padding:8px;text-align:center;background:#4a4a4a;color:white;font-weight:700;"><strong>${n}</strong></td>`
        }
        return `<td style="border:1px solid #000;padding:8px;text-align:center;background:white;color:black;"><strong>${n}</strong></td>`
      }).join('')
      return `<tr><td style="border:1px solid #000;padding:8px;font-weight:600;text-align:left;background:#f5f5f5;"><strong>${esc(nombre)}</strong></td>${celdas}</tr>`
    }).join('')

    return `<div style="page-break-after:always; margin-bottom: 40px;"><table style="width:100%;border-collapse:collapse;margin-bottom:10px;"><tr><td style="border:1px solid #000;padding:12px;text-align:center;font-weight:700;background:#d4a574;color:white;font-size:16px;font-family:'Cinzel',serif;letter-spacing:1px;" colspan="100%">COSTALEROS — TRABAJADERA ${t.id}<br><span style="font-size:11px;margin-top:4px;display:block;">COSTALERO: <strong>${esc(nombreCostalero)}</strong> (resaltado en gris)</span><span style="font-size:11px;margin-top:2px;display:block;">${hoy}</span></td></tr><tr><td style="border:1px solid #000;padding:8px;font-weight:700;text-align:center;background:#e8d5c4;"><strong>RELEVOS</strong></td>${rolesHeaders}</tr>${filas}</table></div>`
  }).join('')

  abrirVentanaImpresion(html, `Relevos - Trabajadera ${t.id}`, 'relevos-individual')
}

// ── EXPORTAR PDF (Hoja del Capataz) ───────────────────────────────

export function exportarPDF(trabajaderas: Trabajadera[]): void {
  const conPlan = trabajaderas.filter(t => t.plan && t.analisis)
  if (!conPlan.length) {
    alert('⚠ Calcula las rotaciones de al menos una trabajadera primero.')
    return
  }

  const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })

  function nombrCompleto(t: Trabajadera, idx: number): string {
    return t.nombres[+idx] ?? (String(+idx + 1))
  }

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
body{font-family:'Arial',sans-serif;font-size:9pt;color:#111;background:#fff}
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

// ── PDF MASIVO PARA WHATSAPP ───────────────────────────────────────
// Una página por costalero, todas las trabajaderas, fila resaltada en dorado

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

        // Calcular el rol físico cuando el costalero está dentro (sin emoji)
        let rolLabel2 = ''
        if (esDentro) {
          const dentroF = getDentroFisico(t, r)
          const posIdx = dentroF.findIndex(ci => ci === costaleroIdx)
          const estructura = estructuraPaso(t.id)
          const rolCode = posIdx !== -1 ? estructura[posIdx] : null
          if (rolCode) rolLabel2 = rolLabel(rolCode, t.id)
        }

        const colorFila = esDentro
          ? 'background:#c9a84c;color:#000;'
          : esFuera
          ? 'background:#cccccc;color:#333;'
          : 'background:#f9f9f9;color:#aaa;'

        const celdaEstado = esDentro
          ? `<div style="font-size:13pt;font-weight:900;line-height:1.2;">DENTRO</div>
             <div style="font-size:8pt;font-weight:700;margin-top:2px;">${rolLabel2}</div>`
          : esFuera
          ? `<div style="font-size:13pt;font-weight:700;">FUERA</div>`
          : `<div style="font-size:13pt;">—</div>`

        return `<tr style="${colorFila}">
          <td style="border:1px solid #bbb;padding:8px 10px;font-weight:600;">${esc(nombreTramo)}</td>
          <td style="border:1px solid #bbb;padding:8px;text-align:center;">${celdaEstado}</td>
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

      paginas.push(`<div style="page-break-after:always;padding:20px;font-family:Arial,sans-serif;">
        <div style="text-align:center;border-bottom:3px solid #c9a84c;padding-bottom:12px;margin-bottom:16px;">
          <div style="font-size:10pt;color:#888;letter-spacing:2px;text-transform:uppercase;">Hermandad · ${esc(nombrePaso)}</div>
          <div style="font-size:22pt;font-weight:900;color:#3d2b1f;letter-spacing:1px;margin:6px 0;">${esc(nombreCostalero)}</div>
          <div style="font-size:11pt;color:#c9a84c;font-weight:700;">TRABAJADERA ${t.id}</div>
          <div style="font-size:9pt;color:#888;margin-top:4px;">${hoy}</div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <thead>
            <tr style="background:#3d2b1f;color:white;">
              <th style="padding:10px;text-align:left;border:1px solid #222;">TRAMO</th>
              <th style="padding:10px;text-align:center;border:1px solid #222;width:120px;">TU ESTADO</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:8px;">
          <div style="background:#f9f3e3;border:1px solid #c9a84c;border-radius:6px;padding:10px 16px;text-align:center;">
            <div style="font-size:9pt;color:#888;">Salidas totales</div>
            <div style="font-size:18pt;font-weight:900;color:#c9a84c;">${salidas}<span style="font-size:10pt;color:#888;">/${objetivo}</span></div>
          </div>
          ${primerTramo !== -1 ? `<div style="background:#f9f3e3;border:1px solid #c9a84c;border-radius:6px;padding:10px 16px;text-align:center;">
            <div style="font-size:9pt;color:#888;">Tu primer tramo</div>
            <div style="font-size:14pt;font-weight:900;color:#3d2b1f;">T${primerTramo + 1}</div>
          </div>` : ''}
          ${ultimoReal !== -1 ? `<div style="background:#f9f3e3;border:1px solid #c9a84c;border-radius:6px;padding:10px 16px;text-align:center;">
            <div style="font-size:9pt;color:#888;">Tu último tramo</div>
            <div style="font-size:14pt;font-weight:900;color:#3d2b1f;">T${ultimoReal + 1}</div>
          </div>` : ''}
        </div>
        <div style="margin-top:16px;padding:10px;background:#f5f5f5;border-radius:6px;text-align:center;font-size:9pt;color:#888;">
          <span style="display:inline-block;width:16px;height:16px;background:#c9a84c;vertical-align:middle;margin-right:4px;"></span> = Dentro del paso &nbsp;&nbsp;
          <span style="display:inline-block;width:16px;height:16px;background:#cccccc;border:1px solid #999;vertical-align:middle;margin-right:4px;"></span> = Fuera (descansás)
        </div>
      </div>`)
    })
  })

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Relevos — ${esc(nombrePaso)}</title>
  <style>
    @page { size: A5 portrait; margin: 10mm }
    * { box-sizing: border-box; margin: 0; padding: 0 }
    body { background: white }
    @media print { .btn-grupo { display: none } }
  </style>
  </head><body>${paginas.join('')}<script>window.onload=function(){window.print();}<\/script></body></html>`

  const win = window.open('', '_blank')
  if (!win) { alert('⚠ Permite ventanas emergentes para generar el PDF.'); return }
  win.document.write(html)
  win.document.close()
}

function abrirVentanaImpresion(html: string, titulo: string, nombre: string): void {
  const ventana = window.open('', nombre, 'width=900,height=1000')
  if (!ventana) { alert('⚠ Permite ventanas emergentes.'); return }
  ventana.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title>
<style>body{font-family:Arial,sans-serif;padding:20px;background:#f5f5f5}
.btn-grupo{text-align:center;margin-bottom:20px;display:flex;flex-wrap:wrap;gap:10px;justify-content:center}
button{padding:10px 16px;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:14px}
.btn-print{background:#d4a574}.btn-close{background:#888}
@media print{.btn-grupo{display:none}}</style></head>
<body><div class="btn-grupo"><button class="btn-print" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button><button class="btn-close" onclick="window.close()">✕ Cerrar</button></div>
${html}</body></html>`)
  ventana.document.close()
}
