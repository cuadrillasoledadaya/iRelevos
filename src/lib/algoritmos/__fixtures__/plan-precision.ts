// ══════════════════════════════════════════════════════════════════
// FIXTURES — plan-precision (bajas-aware scenarios for PR #2+)
// ══════════════════════════════════════════════════════════════════

import { analizar } from "../rotacion";
import type { Trabajadera, TramoSlot } from "../../types";

const NOMS_6 = ["Juan", "Pedro", "Luis", "Ana", "María", "Sofía"];

function baseT(
	nombres: string[],
	tramos: string[],
	plan: TramoSlot[],
	obj: Record<number, number>,
	bajas: number[] = [],
): Trabajadera {
	const t: Trabajadera = {
		id: 99,
		nombres,
		roles: nombres.map(() => ({ pri: "COR" as const, sec: "FIJ_I" as const })),
		salidas: tramos.length,
		tramos,
		bajas,
		regla5costaleros: false,
		plan,
		obj,
		analisis: null,
		pinned: null,
		puntuaciones: {},
		tramosClaves: [],
	};
	t.analisis = analizar(plan, nombres.length, obj, t);
	return t;
}

/**
 * Fixture: "bajas-consecutivos" — 6 nombres, 1 baja, consecutive outside.
 * Without guards (Phase 3), a swap would increase consecutivos.
 * With guards, aplicarIntercambio returns false.
 */
export function makeBajasConsecutivosScenario(): Trabajadera {
	const plan: TramoSlot[] = [
		{ dentro: [1, 2, 3, 4, 5], fuera: [0] },
		{ dentro: [0, 2, 3, 4, 5], fuera: [1] },
		{ dentro: [0, 1, 3, 4, 5], fuera: [2] },
	];
	const obj: Record<number, number> = { 0: 1, 1: 1, 2: 1, 3: 0, 4: 0, 5: 0 };
	// idx 0 is de baja — should not participate in swaps
	return baseT(NOMS_6, ["T1", "T2", "T3"], plan, obj, [0]);
}

/**
 * Fixture: "pin-breach" — 6 nombres, 1 baja, pinned D→fuera risk.
 * Exercises guard 3 (no D → fuera) and guard 4 (no F → dentro).
 */
export function makePinBreachScenario(): Trabajadera {
	const plan: TramoSlot[] = [
		{ dentro: [1, 2, 3, 4, 5], fuera: [0] },
		{ dentro: [0, 2, 3, 4, 5], fuera: [1] },
	];
	const obj: Record<number, number> = { 0: 1, 1: 1, 2: 0, 3: 0, 4: 0, 5: 0 };
	// idx 1 is de baja
	return baseT(NOMS_6, ["T1", "T2"], plan, obj, [1]);
}

/**
 * Fixture: "rep-reintro" — 6 nombres, 1 baja, rep re-intro risk.
 * Exercises guard 2 (no rep re-intro).
 */
export function makeRepReintroScenario(): Trabajadera {
	const plan: TramoSlot[] = [
		{ dentro: [1, 2, 3, 4, 5], fuera: [0] },
		{ dentro: [0, 2, 3, 4, 5], fuera: [1] },
		{ dentro: [1, 2, 3, 4, 5], fuera: [0] },
	];
	const obj: Record<number, number> = { 0: 1, 1: 1, 2: 0, 3: 0, 4: 0, 5: 0 };
	// idx 2 is de baja
	return baseT(NOMS_6, ["T1", "T2", "T3"], plan, obj, [2]);
}
