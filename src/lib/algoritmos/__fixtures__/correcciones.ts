// ══════════════════════════════════════════════════════════════════
// FIXTURES — realistic 3-5 tramo Trabajadera scenarios for correcciones tests
// ══════════════════════════════════════════════════════════════════

import { analizar } from "../rotacion";
import type { Trabajadera, TramoSlot } from "../../types";

const NOMS_6 = ["Juan", "Pedro", "Luis", "Ana", "María", "Sofía"];
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
 * 3 tramos, 10 costaleros (so there are fill-in candidates).
 * ciA=0 (A) is in rep. ciB=1 (B) is inside T_last.
 */
export function makeRepetidoScenario(): Trabajadera {
	const plan: TramoSlot[] = [
		{ dentro: [1, 2, 3, 4, 5], fuera: [0, 6, 7, 8, 9] }, // T1: A fuera, many others
		{ dentro: [0, 2, 3, 4, 5], fuera: [1, 6, 7, 8, 9] }, // T2
		{ dentro: [1, 2, 3, 4, 5], fuera: [0, 6, 7, 8, 9] }, // T_last: A fuera → rep, B(1) dentro
	];
	const obj: Record<number, number> = {
		0: 2,
		1: 0,
		2: 0,
		3: 0,
		4: 0,
		5: 0,
		6: 3,
		7: 3,
		8: 3,
		9: 3,
	};
	return baseT(NOMS_10, ["T1", "T2", "T3"], plan, obj);
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
