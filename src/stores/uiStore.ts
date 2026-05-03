// ══════════════════════════════════════════════════════════════════
// UI STORE — Slice de interfaz de usuario (Phase 2.1)
// Zustand + persist middleware para activePage y tema.
// Preserva las claves legacy: cpwa_active_page, cpwa_tema
// ══════════════════════════════════════════════════════════════════

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ActivePage, ActiveSheet, CellTarget, CensusTarget, SwapState } from '@/lib/types'

// ── Estado ────────────────────────────────────────────────────────

export interface UIStoreState {
  activePage: ActivePage
  activeSheet: ActiveSheet
  tema: 'dark' | 'light'
  openEqs: Set<number>
  swapSel: Partial<SwapState> | null
  cellTarget: CellTarget | null
  bancoTarget: { tid: number; ti: number } | null
  censusTarget: CensusTarget | null
}

// ── Acciones ──────────────────────────────────────────────────────

export interface UIStoreActions {
  setActivePage: (p: ActivePage) => void
  openSheet: (s: ActiveSheet) => void
  closeSheet: () => void
  toggleTema: () => void
  toggleEq: (id: number) => void
  openEq: (id: number) => void
  setSwapSel: (sel: Partial<SwapState> | null) => void
  setCellTarget: (t: CellTarget | null) => void
  setBancoTarget: (t: { tid: number; ti: number } | null) => void
  setCensusTarget: (t: CensusTarget | null) => void
}

export type UIStore = UIStoreState & UIStoreActions

// ── Legendary keys (compatibilidad con datos de usuario existentes) ──

const LS_PAGE = 'cpwa_active_page'
const LS_TEMA = 'cpwa_tema'

const VALID_PAGES: ActivePage[] = [
  'home', 'config', 'equipo', 'plan', 'capataz', 'carga', 'admin',
]

/**
 * Storage adapter que lee/escribe cpwa_active_page y cpwa_tema
 * como claves separadas, preservando compatibilidad con la versión
 * anterior que usaba useState + localStorage directo.
 */
const legacyStorage = createJSONStorage(() => ({
  getItem: (): string | null => {
    const savedPage = localStorage.getItem(LS_PAGE)
    const savedTema = localStorage.getItem(LS_TEMA)

    // Reconstruir el partial state que espera Zustand
    const partial: Partial<UIStoreState> = {}

    if (savedPage && VALID_PAGES.includes(savedPage as ActivePage)) {
      partial.activePage = savedPage as ActivePage
    }
    if (savedTema === 'dark' || savedTema === 'light') {
      partial.tema = savedTema
    }

    // Zustand espera { state: ..., version: ... }
    return JSON.stringify({ state: partial, version: 1 })
  },

  setItem: (_name: string, raw: string): void => {
    const parsed: { state: Partial<UIStoreState> } = JSON.parse(raw)
    const { activePage, tema } = parsed.state

    if (activePage !== undefined) {
      localStorage.setItem(LS_PAGE, activePage)
    }
    if (tema !== undefined) {
      localStorage.setItem(LS_TEMA, tema)
    }
  },

  removeItem: (): void => {
    localStorage.removeItem(LS_PAGE)
    localStorage.removeItem(LS_TEMA)
  },
}))

// ── Store ─────────────────────────────────────────────────────────

export const createUIStore = () => create<UIStore>()(
    persist(
      (set) => ({
        // ── Estado inicial ──

        activePage: 'home',
        activeSheet: null,
        tema: 'light',
        openEqs: new Set([1]),
        swapSel: null,
        cellTarget: null,
        bancoTarget: null,
        censusTarget: null,

        // ── Acciones ──

        setActivePage: (p) => set({ activePage: p }),

        openSheet: (s) => set({ activeSheet: s }),

        closeSheet: () => set({ activeSheet: null }),

        toggleTema: () =>
          set((state) => ({
            tema: state.tema === 'dark' ? 'light' : 'dark',
          })),

        toggleEq: (id) =>
          set((state) => {
            const next = new Set(state.openEqs)
            if (next.has(id)) {
              next.delete(id)
            } else {
              next.add(id)
            }
            return { openEqs: next }
          }),

        openEq: (id) =>
          set((state) => {
            const next = new Set(state.openEqs)
            next.add(id)
            return { openEqs: next }
          }),

        setSwapSel: (sel) => set({ swapSel: sel }),

        setCellTarget: (t) => set({ cellTarget: t }),

        setBancoTarget: (t) => set({ bancoTarget: t }),

        setCensusTarget: (t) => set({ censusTarget: t }),
      }),
      {
        name: 'cpwa_ui_store',
        storage: legacyStorage,
        version: 1,
        // Solo persistir activePage y tema
        partialize: (state) => ({
          activePage: state.activePage,
          tema: state.tema,
        }),
      },
    ),
  )

export const uiStore = createUIStore()
