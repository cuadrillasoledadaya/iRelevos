// ══════════════════════════════════════════════════════════════════
// MUTAR — Extracto de useEstado.tsx (Phase 1.3)
// Aplica fn al draft del proyecto activo, persiste async.
// ══════════════════════════════════════════════════════════════════

import type { DatosPerfil, PasoDB } from '@/lib/types'

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

      return { ...state, pasos: nextPasos }
    })
  }
}

export type MutarFn = ReturnType<typeof createMutar>
