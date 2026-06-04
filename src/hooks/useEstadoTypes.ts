// ══════════════════════════════════════════════════════════════════
// TIPOS — Contracto de useEstado (backward compat)
// Re-exportado por useEstado.tsx para consumidores existentes.
// ══════════════════════════════════════════════════════════════════

import type { ActivePage, ActiveSheet, CellTarget, CensusTarget, DatosPerfil, PasoDB, PinState, RolCode, SwapState, Trabajadera, Temporada } from '@/lib/types'
import type { SugerenciaRes } from '@/lib/algoritmos'

export type { ActivePage, ActiveSheet, PasoDB, DatosPerfil, Trabajadera, RolCode, PinState, SwapState, CellTarget, CensusTarget, Temporada }
export type { SugerenciaRes }

export interface EstadoCtx {
  pasos: PasoDB[]; pid: string; setPid: (id: string) => void; S: DatosPerfil; nombrePaso: string; nombreCuadrilla: string
  activePage: ActivePage; setActivePage: (p: ActivePage) => void; activeSheet: ActiveSheet; openSheet: (s: ActiveSheet) => void; closeSheet: () => void
  tema: 'dark' | 'light'; toggleTema: () => void
  swapSel: Partial<SwapState> | null; setSwapSel: (sel: Partial<SwapState> | null) => void
  cellTarget: CellTarget | null; setCellTarget: (t: CellTarget | null) => void
  bancoTarget: { tid: number; ti: number } | null; setBancoTarget: (t: { tid: number; ti: number } | null) => void
  censusTarget: CensusTarget | null; setCensusTarget: (t: CensusTarget | null) => void
  openEqs: Set<number>; toggleEq: (id: number) => void
  setNombre: (tid: number, i: number, nombre: string) => void; addCost: (tid: number) => void; delCost: (tid: number, i: number) => void
  toggleBaja: (tid: number, i: number) => boolean; setRolPri: (tid: number, i: number, rol: string) => void; setRolSec: (tid: number, i: number, rol: string) => void
  toggleRegla5: (tid: number) => void; addTrab: () => void; setPuntuacion: (tid: number, nombre: string, pts: number) => void
  addCostUltimo: (tid: number, nombre: string, roles: string[]) => void
  setNombreTramo: (tid: number, ti: number, nombre: string) => void; addTramo: (tid: number) => void; delTramo: (tid: number, ti: number) => void
  setSalidas: (tid: number, salidas: number) => void; usarBanco: (tid: number, ti: number, nombre: string) => void
  tramosOptimosFor: (tid: number, salidas?: number) => number; sugerirTramos: (tid: number, targetSalidas?: number) => void
  toggleTramoClave: (tid: number, ti: number) => void; sugerirYCalcular: (tid: number) => void
  previsualizarSugerencia: (tid: number) => SugerenciaRes | null
  confirmarSugerencia: (tid: number) => boolean
  addBanco: (nombre: string) => void; delBanco: (i: number) => void
  calcularTodo: () => void; calcularTrab: (tid: number) => void; completarPlan: (tid: number) => void
  limpiarPlan: (tid: number) => void; quitarBloqueos: (tid: number) => void
  setPinned: (tid: number, ti: number, ci: number, v: PinState) => void; getErroresPinned: (tid: number) => string[]
  confirmarSwap: (ws: SwapState) => void
  limpiarPlanificacion: () => void; limpiarTrabajaderas: () => void; limpiarBanco: () => void; vaciarCenso: () => Promise<void>; resetTodo: () => void
  addPlan: (nombre: string, tramos?: string[]) => void; updatePlan: (id: string, nombre: string) => void; delPlan: (id: string) => void
  cargarPlanEnTrabajadera: (tid: number, planId: string) => void
  censusHeights: Record<string, number>; temporadas: Temporada[]; activeTemporadaId: string; setActiveTemporadaId: (id: string) => void; refetchPasos: () => Promise<void>
}
