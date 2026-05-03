// ══════════════════════════════════════════════════════════════════
// HELPERS — Funciones puras compartidas entre slices (Phase 1.5)
// Extraídas de useEstado.tsx para reutilización sin dependencias de
// estado React.
// ══════════════════════════════════════════════════════════════════

import type { DatosPerfil, Trabajadera } from '@/lib/types'

/**
 * Obtiene la trabajadera por ID dentro de un DatosPerfil.
 * Lanza si no existe (el caller debe garantizar tid válido).
 */
export function getTrab(d: DatosPerfil, tid: number): Trabajadera {
  const t = d.trabajaderas.find(t => t.id === tid)
  if (!t) {
    throw new Error(`Trabajadera con id ${tid} no encontrada`)
  }
  return t
}
