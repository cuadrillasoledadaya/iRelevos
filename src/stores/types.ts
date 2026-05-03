// ══════════════════════════════════════════════════════════════════
// STORE TYPES — Interfaces de slices para el store Zustand
// ══════════════════════════════════════════════════════════════════

import type {
  ActivePage, ActiveSheet,
  CellTarget, CensusTarget, DatosPerfil, PasoDB,
  PinState, RolCode, SwapState, Temporada,
} from '@/lib/types'

export type { ActivePage, ActiveSheet, CellTarget, CensusTarget, DatosPerfil, PasoDB, PinState, RolCode, SwapState, Temporada }

// ── UI Slice ───────────────────────────────────────────────────────

export interface UIState {
  activePage: ActivePage
  activeSheet: ActiveSheet
  tema: 'dark' | 'light'
  openEqs: Set<number>
  swapSel: Partial<SwapState> | null
  cellTarget: CellTarget | null
  bancoTarget: { tid: number; ti: number } | null
  censusTarget: CensusTarget | null
}

export interface UIActions {
  setActivePage: (p: ActivePage) => void
  openSheet: (s: ActiveSheet) => void
  closeSheet: () => void
  toggleTema: () => void
  toggleEq: (id: number) => void
  setSwapSel: (sel: Partial<SwapState> | null) => void
  setCellTarget: (t: CellTarget | null) => void
  setBancoTarget: (t: { tid: number; ti: number } | null) => void
  setCensusTarget: (t: CensusTarget | null) => void
}

export type UISlice = UIState & UIActions

// ── Project Slice ──────────────────────────────────────────────────

export interface ProjectState {
  pasos: PasoDB[]
  pid: string
  nombrePaso: string
  nombreCuadrilla: string
  S: DatosPerfil
}

export interface ProjectActions {
  setPid: (id: string) => void
  setPasos: (pasos: PasoDB[]) => void
  refetchPasos: () => Promise<void>
}

export type ProjectSlice = ProjectState & ProjectActions

// ── Temporada Slice ────────────────────────────────────────────────

export interface TemporadaState {
  temporadas: Temporada[]
  activeTemporadaId: string
}

export interface TemporadaActions {
  setActiveTemporadaId: (id: string) => void
  setTemporadas: (temporadas: Temporada[]) => void
}

export type TemporadaSlice = TemporadaState & TemporadaActions

// ── Trabajadera Slice ──────────────────────────────────────────────

export interface TrabajaderaActions {
  setNombre: (tid: number, i: number, nombre: string) => void
  addCost: (tid: number) => void
  delCost: (tid: number, i: number) => void
  toggleBaja: (tid: number, i: number) => boolean
  setRolPri: (tid: number, i: number, rol: string) => void
  setRolSec: (tid: number, i: number, rol: string) => void
  toggleRegla5: (tid: number) => void
  addTrab: () => void
  setPuntuacion: (tid: number, nombre: string, pts: number) => void
  addCostUltimo: (tid: number, nombre: string, roles: string[]) => void
  setNombreTramo: (tid: number, ti: number, nombre: string) => void
  addTramo: (tid: number) => void
  delTramo: (tid: number, ti: number) => void
  setSalidas: (tid: number, salidas: number) => void
  usarBanco: (tid: number, ti: number, nombre: string) => void
  sugerirTramos: (tid: number, targetSalidas?: number) => void
  toggleTramoClave: (tid: number, ti: number) => void
  sugerirYCalcular: (tid: number) => void
}

export type TrabajaderaSlice = TrabajaderaActions

// ── Plan Slice ─────────────────────────────────────────────────────

export interface PlanActions {
  calcularTodo: () => void
  calcularTrab: (tid: number) => void
  completarPlan: (tid: number) => void
  limpiarPlan: (tid: number) => void
  quitarBloqueos: (tid: number) => void
  setPinned: (tid: number, ti: number, ci: number, v: PinState) => void
  getErroresPinned: (tid: number) => string[]
  confirmarSwap: (ws: SwapState) => void
  addPlan: (nombre: string, tramos?: string[]) => void
  updatePlan: (id: string, nombre: string) => void
  delPlan: (id: string) => void
  cargarPlanEnTrabajadera: (tid: number, planId: string) => void
  limpiarPlanificacion: () => void
  limpiarTrabajaderas: () => void
  resetTodo: () => void
}

export type PlanSlice = PlanActions

// ── Banco Slice ────────────────────────────────────────────────────

export interface BancoActions {
  addBanco: (nombre: string) => void
  delBanco: (i: number) => void
  limpiarBanco: () => void
}

export type BancoSlice = BancoActions

// ── Root Store ─────────────────────────────────────────────────────

export interface RootState extends UIState, ProjectState, TemporadaState {
  censusHeights: Record<string, number>
}

export interface RootActions
  extends UIActions, ProjectActions, TemporadaActions, TrabajaderaActions, PlanActions, BancoActions {
  mutar: (fn: (draft: DatosPerfil) => void) => void
  saveCloud: (content: DatosPerfil, targetPid: string) => Promise<void>
  vaciarCenso: () => Promise<void>
}

export interface RootStore extends RootState, RootActions {}
