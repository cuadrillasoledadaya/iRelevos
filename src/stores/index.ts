// ══════════════════════════════════════════════════════════════════
// ROOT STORE — Punto de ensamblaje de todos los slices (Phase 7.1)
// Crea las instancias singleton y resuelve dependencias (mutar → projectStore).
// ══════════════════════════════════════════════════════════════════

import { uiStore } from "./uiStore";
import { projectStore, setTemporadaGetter } from "./projectStore";
import { temporadaStore, setTemporadaRefetch } from "./temporadaStore";
import { setTrabajaderaDeps, trabajaderaStore } from "./trabajaderaStore";
import { setPlanDeps, planStore } from "./planStore";
import { setBancoMutar, bancoStore } from "./bancoStore";
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

// Wire dependencies via setters (stores are already created as singletons)
setPlanDeps(mutar, getTrab, () => projectStore.getState().S);
setTrabajaderaDeps(mutar, getTrab, (tid) =>
	planStore.getState().completarPlan(tid),
	() => projectStore.getState().S,
);
setBancoMutar(mutar);
setTemporadaRefetch(() => projectStore.getState().refetchPasos());

// Inyectar el getter de temporada activa en projectStore
// para romper la dependencia circular entre stores.
setTemporadaGetter(() => temporadaStore.getState().activeTemporadaId);

// ── Re-exportar stores standalone ─────────────────────────────────
// Los consumidores pueden importar directamente si lo prefieren.

export { uiStore, projectStore, temporadaStore, trabajaderaStore, planStore, bancoStore };

// ── Helper: re-export mutar para tests avanzados ──────────────────
export { mutar };
