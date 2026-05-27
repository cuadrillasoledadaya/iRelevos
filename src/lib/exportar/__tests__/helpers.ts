// ══════════════════════════════════════════════════════════════════
// TESTING HELPERS — Fixtures y factories para tests de exportar
// ══════════════════════════════════════════════════════════════════

import type { Trabajadera, Analisis, TramoSlot, Rol } from "../../types";

/**
 * Crea un fixture de Trabajadera con datos mínimos válidos.
 * Todos los campos tienen valores por defecto razonables.
 * Usa `overrides` para personalizar campos específicos en cada test.
 */
export function createTrabajadera(
	overrides?: Partial<Trabajadera>,
): Trabajadera {
	const id = overrides?.id ?? 1;
	const nombres = overrides?.nombres ?? [
		"Costalero A",
		"Costalero B",
		"Costalero C",
		"Costalero D",
		"Costalero E",
		"Costalero F",
	];
	const tramos = overrides?.tramos ?? ["Tramo 1", "Tramo 2", "Tramo 3"];

	const defaultRoles: Rol[] = nombres.map((_, i) => {
		const codes: Array<Rol["pri"]> = ["PAT_I", "COS_D", "FIJ_I", "COR"];
		return { pri: codes[i % codes.length], sec: "COS_D" };
	});

	const defaultPlan: TramoSlot[] = tramos.map(() => ({
		dentro: [0, 1, 2, 3, 4],
		fuera: [5],
	}));

	const defaultObj: Record<number, number> = {};
	nombres.forEach((_, i) => {
		defaultObj[i] = tramos.length;
	});

	const defaultAnalisis: Analisis = {
		conteo: Object.fromEntries(nombres.map((_, i) => [i, tramos.length])),
		okObj: true,
		dentro5: true,
		primer: [],
		ultimo: [],
		rep: [],
		cons: 0,
	};

	return {
		id,
		nombres,
		roles: overrides?.roles ?? defaultRoles,
		salidas: overrides?.salidas ?? 3,
		tramos,
		bajas: overrides?.bajas ?? [],
		regla5costaleros: overrides?.regla5costaleros ?? true,
		plan: overrides?.plan ?? defaultPlan,
		obj: overrides?.obj ?? defaultObj,
		analisis: overrides?.analisis ?? defaultAnalisis,
		pinned: overrides?.pinned ?? null,
		puntuaciones: overrides?.puntuaciones ?? {},
		tramosClaves: overrides?.tramosClaves ?? [],
	};
}

/**
 * Crea una Trabajadera con un plan válido (todos los tramos con 5 dentro y 1 fuera).
 * Útil para tests de "happy path".
 */
export function createTrabajaderaValida(
	id = 1,
	numTramos = 3,
	numCostaleros = 6,
): Trabajadera {
	const nombres = Array.from(
		{ length: numCostaleros },
		(_, i) => `Costalero ${i + 1}`,
	);
	const tramos = Array.from({ length: numTramos }, (_, i) => `Tramo ${i + 1}`);

	return createTrabajadera({
		id,
		nombres,
		tramos,
		bajas: [],
		plan: tramos.map(() => ({
			dentro: Array.from({ length: 5 }, (_, i) => i),
			fuera: Array.from({ length: numCostaleros - 5 }, (_, i) => i + 5),
		})),
		analisis: {
			conteo: Object.fromEntries(nombres.map((_, i) => [i, numTramos])),
			okObj: true,
			dentro5: true,
			primer: [],
			ultimo: [],
			rep: [],
			cons: 0,
		},
	});
}

/**
 * Crea una Trabajadera con problemas en el análisis (repite, consecutivos, etc.).
 */
export function createTrabajaderaConProblemas(
	id = 2,
	numTramos = 3,
	numCostaleros = 6,
): Trabajadera {
	const nombres = Array.from(
		{ length: numCostaleros },
		(_, i) => `Costalero ${i + 1}`,
	);
	const tramos = Array.from({ length: numTramos }, (_, i) => `Tramo ${i + 1}`);

	return createTrabajadera({
		id,
		nombres,
		tramos,
		bajas: [1, 4], // costaleros 2 y 5 son bajas
		plan: tramos.map((_, ti) => ({
			dentro: ti === 1 ? [0, 2, 3, 4, 5] : [0, 1, 2, 3, 4],
			fuera: ti === 1 ? [1] : [5],
		})),
		analisis: {
			conteo: Object.fromEntries(
				nombres.map((_, i) => [
					i,
					i === 1 ? numTramos - 1 : numTramos, // bajas tienen menos salidas
				]),
			),
			okObj: false,
			dentro5: false,
			primer: [0, 3],
			ultimo: [0, 3],
			rep: [0, 3],
			cons: 2,
		},
	});
}
