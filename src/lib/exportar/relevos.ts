// ══════════════════════════════════════════════════════════════════
// RELEVOS — Exportar tablas de relevos para imprimir
// ══════════════════════════════════════════════════════════════════

import type { Trabajadera } from '../types'
import { esc, pillName } from '../nombres'
import { estructuraPaso, getDentroFisico, rolEmoji, rolLabel } from '../roles'
import { hoyFormateado, abrirVentanaImpresion } from './html'
import {
  relevosTableCSS, theadCell, headerCell, bodyCell, nombreTramoCell, fueraCell, pageTitleCSS
} from './styles'

export function exportarRelevos(trabajaderas: Trabajadera[]): void {
  const hoy = hoyFormateado()

  const html = trabajaderas.map(t => {
    const estructura = estructuraPaso(t.id)
    const rolesHeaders = estructura.map(rol =>
      `<td style="${theadCell()}"><strong>${rolEmoji(rol)}<br>${rolLabel(rol, t.id).split(' ')[0]}</strong></td>`
    ).join('') + `<td style="${theadCell('#888')}width:150px;"><strong>FUERA<br>(Descansan)</strong></td>`

    const filas = t.tramos.map((nombre, ti) => {
      const r = t.plan?.[ti] ?? { dentro: [], fuera: [] }
      const dentroF = getDentroFisico(t, r)
      const celdas = estructura.map((_, posIdx) => {
        const ci = dentroF[posIdx] ?? null
        const n = ci !== null ? pillName(t, ci) : '—'
        return `<td style="${bodyCell('font-weight:700')}"><strong>${n}</strong></td>`
      }).join('')
      
      const nombresFuera = r.fuera.length > 0 ? r.fuera.map(ci => pillName(t, ci)).join(', ') : '—'
      const celdaFuera = `<td style="${fueraCell}">${nombresFuera}</td>`

      return `<tr><td style="${nombreTramoCell}"><strong>${esc(nombre)}</strong></td>${celdas}${celdaFuera}</tr>`
    }).join('')

    return `<div style="page-break-inside:avoid;margin-bottom:30px;"><table style="${relevosTableCSS}"><tr><td style="${pageTitleCSS()}" colspan="100%">COSTALEROS — TRABAJADERA ${t.id}<br><span style="font-size:12px;margin-top:4px;display:block;">${hoy}</span></td></tr><tr><td style="${headerCell()}"><strong>RELEVOS</strong></td>${rolesHeaders}</tr>${filas}</table></div>`
  }).join('')

  abrirVentanaImpresion(html, 'Relevos de Costaleros', 'relevos')
}

export function exportarRelevosIndividual(t: Trabajadera, costaleroIdx: number, nombreCostalero: string): void {
  const hoy = hoyFormateado()
  const estructura = estructuraPaso(t.id)

  const rolesHeaders = estructura.map(rol =>
    `<td style="${theadCell()}"><strong>${rolEmoji(rol)}<br>${rolLabel(rol, t.id).split(' ')[0]}</strong></td>`
  ).join('') + `<td style="${theadCell('#888')}width:150px;"><strong>FUERA<br>(Descansan)</strong></td>`

  const filas = t.tramos.map((nombre, ti) => {
    const r = t.plan?.[ti] ?? { dentro: [], fuera: [] }
    const dentroF = getDentroFisico(t, r)
    const celdas = estructura.map((_, posIdx) => {
      const ci = dentroF[posIdx] ?? null
      const n = ci !== null ? pillName(t, ci) : '—'
      if (ci === costaleroIdx) {
        return `<td style="${bodyCell('border:2px solid #333;background:#4a4a4a;color:white;font-weight:700')}"><strong>${n}</strong></td>`
      }
      return `<td style="${bodyCell('background:white;color:black')}"><strong>${n}</strong></td>`
    }).join('')
    
    const nombresFuera = r.fuera.length > 0 ? r.fuera.map(ci => pillName(t, ci)).join(', ') : '—'
    const celdaFuera = `<td style="${fueraCell}">${nombresFuera}</td>`

    return `<tr><td style="${nombreTramoCell}"><strong>${esc(nombre)}</strong></td>${celdas}${celdaFuera}</tr>`
  }).join('')

  const html = `<div style="page-break-inside:avoid;"><table style="${relevosTableCSS}"><tr><td style="${pageTitleCSS()}" colspan="100%">COSTALEROS — TRABAJADERA ${t.id}<br><span style="font-size:11px;margin-top:4px;display:block;">COSTALERO: <strong>${esc(nombreCostalero)}</strong> (resaltado en gris)</span><span style="font-size:11px;margin-top:2px;display:block;">${hoy}</span></td></tr><tr><td style="${headerCell()}"><strong>RELEVOS</strong></td>${rolesHeaders}</tr>${filas}</table></div>`

  abrirVentanaImpresion(html, `Relevos - ${nombreCostalero}`, 'relevos-individual')
}

export function exportarRelevosMultiplesItems(t: Trabajadera, indices: number[]): void {
  const hoy = hoyFormateado()
  const estructura = estructuraPaso(t.id)

  const rolesHeaders = estructura.map(rol =>
    `<td style="${theadCell()}"><strong>${rolEmoji(rol)}<br>${rolLabel(rol, t.id).split(' ')[0]}</strong></td>`
  ).join('') + `<td style="${theadCell('#888')}width:150px;"><strong>FUERA<br>(Descansan)</strong></td>`

  const html = indices.map(costaleroIdx => {
    const nombreCostalero = t.nombres[costaleroIdx]
    const filas = t.tramos.map((nombre, ti) => {
      const r = t.plan?.[ti] ?? { dentro: [], fuera: [] }
      const dentroF = getDentroFisico(t, r)
      const celdas = estructura.map((_, posIdx) => {
        const ci = dentroF[posIdx] ?? null
        const n = ci !== null ? pillName(t, ci) : '—'
        if (ci === costaleroIdx) {
          return `<td style="${bodyCell('border:2px solid #333;background:#4a4a4a;color:white;font-weight:700')}"><strong>${n}</strong></td>`
        }
        return `<td style="${bodyCell('background:white;color:black')}"><strong>${n}</strong></td>`
      }).join('')
      
      const nombresFuera = r.fuera.length > 0 ? r.fuera.map(ci => pillName(t, ci)).join(', ') : '—'
      const celdaFuera = `<td style="${fueraCell}">${nombresFuera}</td>`

      return `<tr><td style="${nombreTramoCell}"><strong>${esc(nombre)}</strong></td>${celdas}${celdaFuera}</tr>`
    }).join('')

    return `<div style="page-break-after:always; margin-bottom: 40px;"><table style="${relevosTableCSS}"><tr><td style="${pageTitleCSS()}" colspan="100%">COSTALEROS — TRABAJADERA ${t.id}<br><span style="font-size:11px;margin-top:4px;display:block;">COSTALERO: <strong>${esc(nombreCostalero)}</strong> (resaltado en gris)</span><span style="font-size:11px;margin-top:2px;display:block;">${hoy}</span></td></tr><tr><td style="${headerCell()}"><strong>RELEVOS</strong></td>${rolesHeaders}</tr>${filas}</table></div>`
  }).join('')

  abrirVentanaImpresion(html, `Relevos - Trabajadera ${t.id}`, 'relevos-individual')
}
