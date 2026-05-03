// ══════════════════════════════════════════════════════════════════
// ROOT STORE — Punto de ensamblaje de todos los slices (Phase 7.1)
// Crea las instancias singleton y resuelve dependencias (mutar → projectStore).
// ══════════════════════════════════════════════════════════════════

import { uiStore } from './uiStore'
import { projectStore } from './projectStore'
import { temporadaStore } from './temporadaStore'
import { createTrabajaderaStore } from './trabajaderaStore'
import { createPlanStore } from './planStore'
import { createBancoStore } from './bancoStore'
import { createMutar } from './mutar'
import { saveCloud } from './saveCloud'
import { getTrab } from './helpers'

// ── Resolver dependencias ─────────────────────────────────────────
// mutar() necesita projectStore ya creado para leer/escribir S.

const mutar = createMutar(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  projectStore.setState as any,
  projectStore.getState,
  saveCloud,
)

export const trabajaderaStore = createTrabajaderaStore(mutar, getTrab)
export const planStore = createPlanStore(mutar, getTrab)
export const bancoStore = createBancoStore(mutar)

// ── Re-exportar stores standalone ─────────────────────────────────
// Los consumidores pueden importar directamente si lo prefieren.

export { uiStore, projectStore, temporadaStore }

// ── Helper: re-export mutar para tests avanzados ──────────────────
export { mutar }
