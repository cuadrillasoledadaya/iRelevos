// ══════════════════════════════════════════════════════════════════
// TYPES — Relevos Costaleros
// Shape exacto del modelo de datos del HTML original
// ══════════════════════════════════════════════════════════════════

export type RolCode =
  | 'PAT_D'
  | 'PAT_I'
  | 'COS_D'
  | 'COS_I'
  | 'FIJ_D'
  | 'FIJ_I'
  | 'COR'
export type PinState = 'L' | 'D' | 'F' | 'LF' | 'LS'
// LS = Latent Sugerido: fijado sugerido por el sistema (top 3 en tramos clave),
// visible con estilo especial, respetado por el algoritmo como inmutable.

export interface Rol {
  pri: RolCode
  sec: RolCode
}

export interface TramoSlot {
  dentro: number[]
  fuera: number[]
  dentroFisico?: (number | null)[]
}

export interface Analisis {
  conteo: Record<number, number>
  okObj: boolean
  dentro5: boolean
  primer: number[]
  ultimo: number[]
  rep: number[]
  cons: number
}

export interface Trabajadera {
  id: number
  nombres: string[]
  roles: Rol[]
  salidas: number
  tramos: string[]
  bajas: number[]
  regla5costaleros: boolean
  plan: TramoSlot[] | null
  obj: Record<number, number> | null
  analisis: Analisis | null
  pinned: PinState[][] | null
  puntuaciones: Record<string, number>
  boquilla?: Record<string, boolean>
  tramosClaves: number[]
}

export interface PlanRelevo {
  id: string
  nombre: string
  tramos: string[]
}

export interface DatosPerfil {
  banco: string[]
  planes: PlanRelevo[]
  trabajaderas: Trabajadera[]
}

export interface Perfil {
  id: string
  nombre: string
  creadoEn: number
  datos: DatosPerfil
}

export type Perfiles = Record<string, Perfil>

// Estado de swap para la vista Capataz
export interface SwapTarget {
  tid: number
  ti: number
  ci: number
  posIdx: number | null
  rolSlot: RolCode | null
  esDentro: boolean
  esFuera: boolean
}

export interface SwapState {
  a: SwapTarget
  b: SwapTarget
  ambosD: boolean
  nuevoDentroF: (number | null)[]
  nuevoFuera: number[]
  todoOk: boolean
}

// Estado de celda para el Plan
export interface CellTarget {
  tid: number
  ti: number
  ci: number
}

// Estado del bottom sheet de banco
export interface BsTarget {
  tid: number
  ti: number
}

export type ActivePage = 'home' | 'config' | 'equipo' | 'plan' | 'capataz' | 'carga' | 'admin'
export type ActiveSheet =
  | 'banco' | 'perfiles' | 'celda' | 'swap' | 'sugerencia' | 'sugerencia-asig' | 'relevos' | 'censo' | 'history' | 'detail' | 'compare' | 'restore' | null

export interface CensusTarget {
  tid: number
  ci: number
}

export interface Temporada {
  id: string
  nombre: string
  activa: boolean
  created_at: string
}

export interface PasoDB {
  id: string
  nombre_paso: string
  nombre_cuadrilla: string
  num_trabajaderas: number
  content: DatosPerfil
  created_at: string
  temporada_id?: string
  /** Owner del proyecto (auth.users.id). Requiere columna en Supabase. */
  user_id?: string
}

// ── Plan History Types ────────────────────────────────────────────

export interface PlanSnapshot {
  id: string
  proyecto_id: string
  temporada_id: string
  user_id: string
  nombre: string
  descripcion?: string
  created_at: string
  plan_data: DatosPerfil          // full Trabajadera[] — same shape as S.trabajaderas
  trabajadera_count: number
  trabajadera_ids: number[]
  trabajadera_nombres: { tid: number; nombres: string[] }[]
  plan_summary: {
    status: 'ok' | 'incomplete' | 'error'
    salidas_por_trab: number[]
    tramos_por_trab: number[]
  }
}

export interface PlanSnapshotSummary {
  id: string
  nombre: string
  created_at: string
  trabajadera_count: number
  plan_summary: PlanSnapshot['plan_summary']
  proyecto_nombre?: string
  temporada_nombre?: string
}

export interface ReconcileDiff {
  removed:   { tid: number; idx: number; nombre: string; tramos_affected: number }[]
  new:       { tid: number; idx: number; nombre: string }[]
  mapped:    { tid: number; old_nombre: string; new_nombre: string; old_idx: number; new_idx: number }[]
  unmapped:  { tid: number; idx: number; nombre: string; reason: 'ambiguous' | 'not_found' }[]
}
