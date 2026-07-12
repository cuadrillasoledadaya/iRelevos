// ══════════════════════════════════════════════════════════════════
// FIXTURES — realistic 3-5 tramo Trabajadera scenarios for correcciones tests
// ══════════════════════════════════════════════════════════════════

import { analizar } from "../rotacion";
import type { Trabajadera, TramoSlot } from "../../types";

const NOMS_6 = ["Juan", "Pedro", "Luis", "Ana", "María", "Sofía"];
const NOMS_7 = ["A", "B", "C", "D", "E", "F", "G"];
const NOMS_10 = [
	"A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
];

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
 * Scenario: "repetido" — ciA=0 is outside in T1 AND T_last (in analisis.rep).
 * 3 tramos, 7 costaleros (so there are fill-in candidates and guards pass).
 * ciA=0 (A) is in rep. ciB=1 (B) is inside T_last.
 * Designed so the swap reduces both cons and rep (LENIENT guards pass).
 */
export function makeRepetidoScenario(): Trabajadera {
	const plan: TramoSlot[] = [
		{ dentro: [1, 2, 3, 4, 5], fuera: [0, 6] }, // T1: A fuera
		{ dentro: [0, 1, 3, 4, 5], fuera: [2, 6] }, // T2
		{ dentro: [1, 2, 3, 4, 5], fuera: [0, 6] }, // T_last: A fuera → rep, B(1) dentro
	];
	const obj: Record<number, number> = {
		0: 2, 1: 0, 2: 1, 3: 0, 4: 0, 5: 0, 6: 3,
	};
	return baseT(NOMS_7, ["T1", "T2", "T3"], plan, obj);
}

/**
 * Scenario: "saldo" — balanced plan with no violations.
 * 3 tramos, 6 costaleros.
 */
export function makeBalancedScenario(): Trabajadera {
	const plan: TramoSlot[] = [
		{ dentro: [1, 2, 3, 4, 5], fuera: [0] },
		{ dentro: [0, 2, 3, 4, 5], fuera: [1] },
		{ dentro: [0, 1, 3, 4, 5], fuera: [2] },
	];
	const obj: Record<number, number> = { 0: 1, 1: 1, 2: 1, 3: 0, 4: 0, 5: 0 };
	return baseT(NOMS_6, ["T1", "T2", "T3"], plan, obj);
}

/**
 * Scenario: "combined" — repetido + saldo + consecutivos.
 * 5 tramos, 10 costaleros.
 * idx 0 in rep (outside T1 and T_last), idx 1 consecutive outside in T2/T3.
 */
export function makeCombinedScenario(): Trabajadera {
	const plan: TramoSlot[] = [
		{ dentro: [1, 2, 3, 4, 5], fuera: [0, 6, 7, 8, 9] }, // T1: idx 0 fuera
		{ dentro: [0, 2, 3, 4, 5], fuera: [1, 6, 7, 8, 9] }, // T2: idx 1 fuera
		{ dentro: [0, 2, 3, 4, 5], fuera: [1, 6, 7, 8, 9] }, // T3: idx 1 fuera → consecutivo
		{ dentro: [0, 1, 3, 4, 5], fuera: [2, 6, 7, 8, 9] }, // T4
		{ dentro: [0, 1, 3, 4, 5], fuera: [2, 6, 7, 8, 9] }, // T_last: idx 0 fuera → rep
	];
	const obj: Record<number, number> = {
		0: 3,
		1: 2,
		2: 2,
		3: 0,
		4: 0,
		5: 0,
		6: 5,
		7: 5,
		8: 5,
		9: 5,
	};
	return baseT(NOMS_10, ["T1", "T2", "T3", "T4", "T5"], plan, obj);
}

/**
 * Scenario: "oscillating" — plan that produces corrections on every iteration,
 * useful for testing cap_alcanzado.
 * 3 tramos, 6 costaleros with extreme imbalance.
 */
export function makeOscillatingScenario(): Trabajadera {
	const plan: TramoSlot[] = [
		{ dentro: [1, 2, 3, 4, 5], fuera: [0] },
		{ dentro: [1, 2, 3, 4, 5], fuera: [0] },
		{ dentro: [1, 2, 3, 4, 5], fuera: [0] },
	];
	const obj: Record<number, number> = { 0: 3, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
	return baseT(NOMS_6, ["T1", "T2", "T3"], plan, obj);
}

/**
 * Scenario: "ciB not in T_last.dentro" — for testing saltadas count.
 * ciA=0 in rep, but ciB=5 is NOT inside T_last (it's outside).
 */
export function makeCiBNotInTlastScenario(): Trabajadera {
	const plan: TramoSlot[] = [
		{ dentro: [1, 2, 3, 4, 5], fuera: [0] },
		{ dentro: [0, 2, 3, 4, 5], fuera: [1] },
		{ dentro: [0, 1, 2, 3, 4], fuera: [5] }, // ciB=5 is fuera, not dentro
	];
	const obj: Record<number, number> = { 0: 2, 1: 1, 2: 0, 3: 0, 4: 0, 5: 1 };
	return baseT(NOMS_6, ["T1", "T2", "T3"], plan, obj);
}

/**
 * Scenario: "saldo-duplicado" — plan with severe imbalance that would
 * trigger the duplicate-index bug without the v3 guard.
 * 4 tramos, 10 costaleros.
 *
 * The imbalance causes multiple bulk iterations. After the first iteration
 * moves ciA into r2.dentro at position p, the re-analysis may produce
 * another correction that would write ciA into the same r2.dentro at
 * position q ≠ p. The v3 guard prevents this.
 *
 * Design: idx 0 is outside in ALL tramos (in rep). idx 5-9 are inside
 * in ALL tramos. This produces repetido corrections for idx 0 that cycle
 * through the repetido branch. The fixture validates that bulk-apply
 * produces a coherent plan with no duplicates.
 *
 * NOTE: The guard at correcciones.ts:389 lives in the saldo/consecutivo
 * branch. This fixture primarily exercises the repetido branch because
 * idx 0 is outside in both T1 and T_last (in rep). The guard is verified
 * directly by the unit test "bulk-apply exercises v3 guard through
 * saldo/consecutivo branch" in correcciones.test.ts.
 */
export function makeSaldoDuplicadoScenario(): Trabajadera {
	const plan: TramoSlot[] = [
		{ dentro: [5, 6, 7, 8, 9], fuera: [0, 1, 2, 3, 4] },  // T1: 0-4 fuera
		{ dentro: [5, 6, 7, 8, 9], fuera: [0, 1, 2, 3, 4] },  // T2: 0-4 fuera
		{ dentro: [5, 6, 7, 8, 9], fuera: [0, 1, 2, 3, 4] },  // T3: 0-4 fuera
		{ dentro: [5, 6, 7, 8, 9], fuera: [0, 1, 2, 3, 4] },  // T4: 0-4 fuera
	];
	// Extreme imbalance: 0-4 have 0 outs (need 2), 5-9 have 4 outs (need 2).
	// Bulk apply will try to swap 0-4 into tramos where 5-9 are inside.
	const obj: Record<number, number> = {
		0: 2, 1: 2, 2: 2, 3: 2, 4: 2,
		5: 2, 6: 2, 7: 2, 8: 2, 9: 2,
	};
	return baseT(NOMS_10, ["T1", "T2", "T3", "T4"], plan, obj);
}

/**
 * Helper: create a generic realistic Trabajadera with 3-5 tramos.
 */
export function makeTrabajaderaRealista(
	scenario: "repetido" | "balanced" | "combined" | "oscillating" | "ciBNotInTlast" = "repetido",
): Trabajadera {
	switch (scenario) {
		case "repetido":
			return makeRepetidoScenario();
		case "balanced":
			return makeBalancedScenario();
		case "combined":
			return makeCombinedScenario();
		case "oscillating":
			return makeOscillatingScenario();
		case "ciBNotInTlast":
			return makeCiBNotInTlastScenario();
	}
}
