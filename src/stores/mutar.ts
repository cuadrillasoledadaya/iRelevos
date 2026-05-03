// ══════════════════════════════════════════════════════════════════
// MUTAR — Extracto de useEstado.tsx (Phase 1.3)
// Aplica fn al draft del proyecto activo, persiste async.
// ══════════════════════════════════════════════════════════════════

import type { DatosPerfil, PasoDB } from '@/lib/types'
import { datosVacios, migrarDatos } from '@/lib/algoritmos'

/**
 * Deriva las propiedades computadas del proyecto activo.
 */
function deriveFromPasos(pasos: PasoDB[], pid: string): {
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

/**
 * Crea la función mutar que opera sobre el store Zustand.
 * Aplica fn a un deep-clone del content del proyecto activo,
 * actualiza el estado y dispara saveCloud en segundo plano.
 */
export function createMutar<
  State extends { pasos: PasoDB[]; pid: string }
>(
  set: (partial: Partial<State> | ((state: State) => Partial<State>)) => void,
  get: () => State,
  saveCloud: (content: DatosPerfil, targetPid: string) => Promise<void>,
) {
  return (fn: (draft: DatosPerfil) => void): void => {
    const { pid } = get()
    if (!pid) return

    set(state => {
      const nextPasos = [...state.pasos]
      const idx = nextPasos.findIndex(p => p.id === pid)
      if (idx === -1) return state

      const raw = nextPasos[idx].content
      const draft: DatosPerfil = raw
        ? JSON.parse(JSON.stringify(raw))
        : { banco: [], planes: [], trabajaderas: [] }

      fn(draft)
      nextPasos[idx] = { ...nextPasos[idx], content: draft }

      // Disparo asíncrono — no bloquea el set
      saveCloud(draft, pid)

      // Actualizar datos derivados también
      return { ...state, pasos: nextPasos, ...deriveFromPasos(nextPasos, pid) }
    })
  }
}

export type MutarFn = ReturnType<typeof createMutar>
