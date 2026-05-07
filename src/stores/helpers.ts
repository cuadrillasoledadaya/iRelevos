// ══════════════════════════════════════════════════════════════════
// HELPERS — Funciones puras compartidas entre slices (Phase 1.5)
// Extraídas de useEstado.tsx para reutilización sin dependencias de
// estado React.
// ══════════════════════════════════════════════════════════════════

import type { DatosPerfil, PasoDB, Trabajadera } from '@/lib/types'
import { datosVacios, migrarDatos, tramosOptimos } from '@/lib/algoritmos'

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

/**
 * Calcula el número óptimo de tramos para una trabajadera.
 * Pura: no depende de estado externo.
 */
export function tramosOptimosForTrab(t: Trabajadera, salidas?: number): number {
  const nActivos = t.nombres.length - (t.bajas?.length ?? 0)
  return tramosOptimos(nActivos, salidas ?? t.salidas ?? 2)
}

/**
 * Deriva las propiedades computadas del proyecto activo a partir de los pasos.
 * Pura: no depende de estado externo.
 */
export function deriveFromPasos(pasos: PasoDB[], pid: string): {
  nombrePaso: string
  nombreCuadrilla: string
  S: DatosPerfil
} {
  const pasoActual = pasos.find(p => p.id === pid)
  const rawContent = pasoActual?.content
  const S: DatosPerfil = rawContent
    ? migrarDatos(JSON.parse(JSON.stringify(rawContent)) as DatosPerfil)
    : datosVacios()

  return {
    nombrePaso: pasoActual?.nombre_paso ?? 'Sin Paso',
    nombreCuadrilla: pasoActual?.nombre_cuadrilla ?? 'Sin Cuadrilla',
    S,
  }
}
