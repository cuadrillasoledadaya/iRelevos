// ══════════════════════════════════════════════════════════════════
// PROJECT STORE — Slice de proyecto (Phase 3.1)
// Maneja la lista de proyectos (pasos), el proyecto activo (pid),
// y los datos derivados (nombrePaso, nombreCuadrilla, S).
// ══════════════════════════════════════════════════════════════════

import { create } from 'zustand'
import type { DatosPerfil, PasoDB } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { datosVacios, migrarDatos } from '@/lib/algoritmos'

// ── Estado ────────────────────────────────────────────────────────

export interface ProjectStoreState {
  pasos: PasoDB[]
  pid: string
  activeTemporadaId: string
  nombrePaso: string
  nombreCuadrilla: string
  S: DatosPerfil
}

export interface ProjectStoreActions {
  setPid: (id: string) => void
  setPasos: (pasos: PasoDB[]) => void
  setActiveTemporadaId: (id: string) => void
  refetchPasos: () => Promise<void>
}

export type ProjectStore = ProjectStoreState & ProjectStoreActions

// ── Helpers ───────────────────────────────────────────────────────

const LS_PID = 'cpwa_active_paso_id'

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

// ── Store ─────────────────────────────────────────────────────────

export const createProjectStore = () => create<ProjectStore>()((set, get) => ({
    // ── Estado inicial ──

    pasos: [],
    pid: '',
    activeTemporadaId: '',
    nombrePaso: 'Sin Paso',
    nombreCuadrilla: 'Sin Cuadrilla',
    S: datosVacios(),

    // ── Acciones ──

    setPid: (id) => {
      const { pasos } = get()
      localStorage.setItem(LS_PID, id)
      set({
        pid: id,
        ...deriveFromPasos(pasos, id),
      })
    },

    setPasos: (pasos) => {
      const state = get()
      let nextPid = state.pid

      if (pasos.length > 0) {
        const savedPid = localStorage.getItem(LS_PID)
        if (savedPid && pasos.some(p => p.id === savedPid)) {
          nextPid = savedPid
        } else {
          nextPid = pasos[0].id
        }
      } else {
        nextPid = ''
      }

      set({
        pasos,
        pid: nextPid,
        ...deriveFromPasos(pasos, nextPid),
      })
    },

    setActiveTemporadaId: (id) => set({ activeTemporadaId: id }),

    refetchPasos: async () => {
      const { activeTemporadaId } = get()
      if (!activeTemporadaId) return

      const { data, error } = await supabase
        .from('proyectos')
        .select(
          'id, nombre_paso, nombre_cuadrilla, num_trabajaderas, content, created_at, temporada_id',
        )
        .eq('temporada_id', activeTemporadaId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        get().setPasos(data as PasoDB[])
      }
    },
  }))

export const projectStore = createProjectStore()
