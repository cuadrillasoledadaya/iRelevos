// ══════════════════════════════════════════════════════════════════
// MAPPER CAPATAZ — Transforma Trabajadera → CapatazTableData
// ══════════════════════════════════════════════════════════════════

import type { Trabajadera } from '../../types'
import type { CapatazTableData } from '../types'

/**
 * Versión local de nombrCompleto (antes en pdf-capataz.ts).
 * Retorna el nombre completo del costalero o su índice + 1 como fallback.
 */
function nombrCompleto(t: Trabajadera, idx: number): string {
  return t.nombres[+idx] ?? String(+idx + 1)
}

/**
 * Transforma una Trabajadera en los datos estructurados que el template
 * del Capataz necesita para renderizar la hoja de análisis.
 *
 * Es pura: no tiene efectos secundarios, no llama a window ni a DOM.
 *
 * @param t Trabajadera con plan y análisis (puede ser parcial)
 * @returns CapatazTableData con todas las celdas HTML precomputadas
 */
export function mapCapataz(t: Trabajadera, fechaOverride?: string): CapatazTableData {
  const total = t.nombres.length
  const F = total - 5
  const nAct = t.tramos.length

  // ── Fecha ──────────────────────────────────────────────────────
  const fecha = fechaOverride ?? new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  // ── Distribución de salidas ────────────────────────────────────
  const obj = t.obj ?? {}
  const objV = Object.values(obj)
  const minS = objV.length ? Math.min(...objV) : 0
  const maxS = objV.length ? Math.max(...objV) : 0
  const extC = objV.filter(v => v === maxS).length
  const distDesc =
    minS === maxS
      ? `${minS} salidas por costalero`
      : `${minS} salidas (${total - extC} costaleros) · ${maxS} salidas (${extC} costaleros)`

  // ── Análisis ───────────────────────────────────────────────────
  const an = t.analisis
  const repLen = an?.rep?.length ?? 0
  const consVal = an?.cons ?? 0
  const dentro5 = an?.dentro5 ?? false
  const okObj = an?.okObj ?? false

  const statusGood = repLen === 0 && consVal === 0 && dentro5 && okObj

  const problemas: string[] = []
  if (an && an.rep.length) problemas.push(`${an.rep.length} repite 1º/último`)
  if (an && an.cons) problemas.push(`${an.cons} consecutivo(s)`)
  if (an && !an.dentro5) problemas.push('Algún tramo sin 5 dentro')
  if (an && !an.okObj) problemas.push('Desequilibrio de salidas')

  const statusTxt = statusGood
    ? '✓ Plan correcto'
    : `⚠ ${problemas.filter(Boolean).join(' · ') || 'Problemas detectados'}`

  // ── thead cells ────────────────────────────────────────────────
  const theadCells = t.tramos.map((nombre, ti) => {
    const esPri = ti === 0
    const esUlt = ti === nAct - 1
    const cls = esPri ? 'pri' : esUlt ? 'ult' : ''
    return `<th class="${cls}">${esPri ? '🟢 ' : esUlt ? '🔴 ' : ''}${nombre}</th>`
  })

  // ── tbody rows ─────────────────────────────────────────────────
  const tbodyRows = t.nombres.map((nombre, ci) => {
    const salV = an?.conteo[ci] ?? 0
    const espV = obj[ci] ?? 0
    const salCls = salV === espV ? 'ok' : 'warn'
    const cells = t.tramos.map((_, ti) => {
      const r = t.plan?.[ti] ?? { dentro: [], fuera: [] }
      const esUlt = ti === nAct - 1
      const esDentro = r.dentro.includes(ci)
      const esFuera = r.fuera.includes(ci)
      const esRep =
        esUlt && !!an?.primer?.includes(ci) && esFuera
      const esCons =
        ti > 0 &&
        (t.plan?.[ti - 1]?.fuera?.includes(ci) ?? false) &&
        esFuera
      if (esDentro) return `<td class="cel-d">DENTRO</td>`
      if (esFuera) {
        const cls = esRep ? 'cel-rep' : esCons ? 'cel-cons' : 'cel-f'
        return `<td class="${cls}">FUERA${esRep ? ' ⚠' : ''}</td>`
      }
      return `<td class="cel-x">—</td>`
    }).join('')
    return `<tr><td class="td-nombre">${nombre}</td><td class="td-sal ${salCls}">${salV}/${espV}</td>${cells}</tr>`
  })

  // ── footer cells ───────────────────────────────────────────────
  const footerCells = t.tramos.map((_, ti) => {
    const r = t.plan?.[ti] ?? { dentro: [], fuera: [] }
    const ok = r.dentro.length === 5
    return `<td class="td-foot ${ok ? 'ok' : 'warn'}">${r.dentro.length}/5<br><small>${r.fuera.map(i => nombrCompleto(t, i)).join(', ')}</small></td>`
  })

  return {
    trabajaderaId: t.id,
    totalCostaleros: total,
    fueraPorTramo: F,
    numTramos: nAct,
    distDesc,
    statusTxt,
    statusGood,
    theadCells,
    tbodyRows,
    footerCells,
    fecha,
  }
}
