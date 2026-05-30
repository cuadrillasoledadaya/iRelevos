// ══════════════════════════════════════════════════════════════════
// TYPES — Interfaces y tipos para el módulo de exportación
// ══════════════════════════════════════════════════════════════════

/** Configuración de estilos CSS tipada — reemplaza strings inline */
export interface StyleConfig {
  background?: string
  color?: string
  border?: string
  padding?: string
  fontWeight?: string
  fontSize?: string
}

/** Función que retorna un string CSS aceptando overrides parciales */
export type StyleFn = (override?: Partial<StyleConfig>) => string

/** Datos que el mapper del Capataz produce y el template consume */
export interface CapatazTableData {
  trabajaderaId: number
  totalCostaleros: number
  fueraPorTramo: number
  numTramos: number
  distDesc: string
  statusTxt: string
  statusGood: boolean
  theadCells: string[]
  tbodyRows: string[]
  footerCells: string[]
  fecha: string
}

/** Datos que el mapper de Relevos produce y el template consume */
export interface RelevosTableData {
  trabajaderaId: number
  fecha: string
  headers: Array<{ emoji: string; label: string }>
  rows: {
    tramoNombre: string
    cells: { nombre: string; highlighted: boolean }[]
    fuera: string[]
  }[]
}

/** Datos que el mapper de Masivo produce y el template consume (una página por costalero) */
export interface MasivoPageData {
  costaleroNombre: string
  trabajaderaId: number
  fecha: string
  nombrePaso: string
  filas: {
    tramoNombre: string
    estado: 'DENTRO' | 'FUERA' | '—'
    rolLabel: string
    colorFila: string
  }[]
  salidas: number
  objetivo: number
  primerTramo: number | null
  ultimoTramo: number | null
}
