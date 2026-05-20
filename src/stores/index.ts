// ══════════════════════════════════════════════════════════════════
// ROOT STORE — Punto de ensamblaje de todos los slices (Phase 7.1)
// Crea las instancias singleton y resuelve dependencias (mutar → projectStore).
// ══════════════════════════════════════════════════════════════════

import { uiStore } from "./uiStore";
import { projectStore, setTemporadaGetter } from "./projectStore";
import { createTemporadaStore } from "./temporadaStore";
import { createTrabajaderaStore } from "./trabajaderaStore";
import { createPlanStore } from "./planStore";
import { createBancoStore } from "./bancoStore";
import { createMutar } from "./mutar";
import { saveCloud } from "./saveCloud";
import { getTrab } from "./helpers";

// ── Resolver dependencias ─────────────────────────────────────────
// mutar() necesita projectStore ya creado para leer/escribir S.

const mutar = createMutar(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	projectStore.setState as any,
	projectStore.getState,
	saveCloud,
);

export const planStore = createPlanStore(
	mutar,
	getTrab,
	() => projectStore.getState().S,
);
export const trabajaderaStore = createTrabajaderaStore(mutar, getTrab, (tid) =>
	planStore.getState().completarPlan(tid),
);
export const bancoStore = createBancoStore(mutar);

// ── Resolver temporadaStore con refetchPasos inyectado ────────────
// Rompe dependencia circular: projectStore lee activeTemporadaId de
// temporadaStore, y temporadaStore dispara refetchPasos de projectStore.

export const temporadaStore = createTemporadaStore(() =>
	projectStore.getState().refetchPasos(),
);

// Inyectar el getter de temporada activa en projectStore
// para romper la dependencia circular entre stores.
setTemporadaGetter(() => temporadaStore.getState().activeTemporadaId);

// ── Re-exportar stores standalone ─────────────────────────────────
// Los consumidores pueden importar directamente si lo prefieren.

export { uiStore, projectStore };

// ── Helper: re-export mutar para tests avanzados ──────────────────
export { mutar };
