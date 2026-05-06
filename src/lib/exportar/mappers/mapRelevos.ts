// ══════════════════════════════════════════════════════════════════
// MAPPER RELEVOS — Transforma Trabajadera → RelevosTableData
// ══════════════════════════════════════════════════════════════════

import type { Trabajadera } from '../../types'
import type { RelevosTableData } from '../types'
import { estructuraPaso, getDentroFisico, rolEmoji, rolLabel } from '../../roles'
import { pillName } from '../../nombres'

/**
 * Transforma una Trabajadera en los datos estructurados que el template
 * de Relevos necesita para renderizar la tabla de rotaciones.
 *
 * Es pura: no tiene efectos secundarios.
 *
 * @param t            Trabajadera con plan (puede ser null)
 * @param costaleroIdx Índice del costalero a resaltar (opcional, default -1 = ninguno)
 * @returns RelevosTableData con headers, filas, y fuera precomputados
 */
export function mapRelevos(t: Trabajadera, costaleroIdx = -1): RelevosTableData {
  // ── Fecha ──────────────────────────────────────────────────────
  const fecha = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  // ── Estructura de roles ────────────────────────────────────────
  const estructura = estructuraPaso(t.id)

  // ── Headers (roles + FUERA) ────────────────────────────────────
  const headers = estructura.map(rol => ({
    emoji: rolEmoji(rol),
    label: rolLabel(rol, t.id).split(' ')[0],
  }))
  headers.push({ emoji: '💤', label: 'FUERA' })

  // ── Filas ──────────────────────────────────────────────────────
  const rows = t.tramos.map((nombreTramo, ti) => {
    const r = t.plan?.[ti] ?? { dentro: [], fuera: [] }
    const dentroF = getDentroFisico(t, r)

    // Celdas de roles (dentro físico)
    const cells = estructura.map((_, posIdx) => {
      const ci = dentroF[posIdx] ?? null
      const nombre = ci !== null ? pillName(t, ci) : '—'
      const highlighted = ci === costaleroIdx
      return { nombre, highlighted }
    })

    // Nombres de los costaleros fuera
    const fuera = r.fuera.map(ci => pillName(t, ci))

    return {
      tramoNombre: nombreTramo,
      cells,
      fuera,
    }
  })

  return {
    trabajaderaId: t.id,
    fecha,
    headers,
    rows,
  }
}
