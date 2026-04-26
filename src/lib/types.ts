// ══════════════════════════════════════════════════════════════════
// TYPES — Relevos Costaleros
// Shape exacto del modelo de datos del HTML original
// ══════════════════════════════════════════════════════════════════

export type RolCode = 'PAT' | 'COS' | 'FIJ' | 'COR'
export type PinState = 'L' | 'D' | 'F' | 'LF'

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
  tramosClaves: number[]
}

export interface DatosPerfil {
  banco: string[]
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
  | 'banco' | 'perfiles' | 'celda' | 'swap' | 'sugerencia' | 'relevos' | 'censo' | null

export interface CensusTarget {
  tid: number
  ci: number
}

export interface PasoDB {
  id: string
  nombre_paso: string
  nombre_cuadrilla: string
  num_trabajaderas: number
  content: DatosPerfil
  created_at: string
}
