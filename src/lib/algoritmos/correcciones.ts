// ══════════════════════════════════════════════════════════════════
// CORRECCIONES — sugerencias de corrección e intercambios
// ══════════════════════════════════════════════════════════════════

import type { Trabajadera, TramoSlot } from "../types";
import { analizar } from "./rotacion";
import { validarPinned } from "./pinned";
import { ordenarDentroFisico } from "../roles";

export interface CorreccionSugerida {
	tipo: "saldo" | "repetido" | "consecutivo";
	costaleroA: { nombre: string; idx: number; problema: string };
	costaleroB: { nombre: string; idx: number; solucion: string };
	tramoOrigen: number;
	tramoDestino: number;
	impacto: string;
	prioridad?: Prioridad; // 1=crítica, 2=alta, 3=media
}

/** Prioridad de corrección: 1=crítica, 2=alta, 3=media */
export type Prioridad = 1 | 2 | 3;

/** Maximum iterations of the bulk-correction loop, as anti-oscillation cap. */
export const MAX_ITER_BULK = 20;

/** Discriminated union for hard-rule violations found after bulk apply. */
export type Violation =
	| { kind: "dentro5"; ti: number; actual: number }
	| { kind: "pin"; ti: number; message: string }
	| { kind: "consecutivos"; ti: number; count: number }
	| { kind: "repeticion"; ti1: number; ti2: number; idx: number }
	| { kind: "fueramax"; ti: number; pinned: number; max: number };

/** Structured result from bulk correction apply. */
export interface ResultadoBulkApply {
	aplicadas: number;
	saltadas: number;
	cap_alcanzado: boolean;
	violations: Violation[];
}

/** Preview of bulk corrections before applying — non-mutating. */
export interface BulkCorreccionesPreview {
	correcciones: CorreccionSugerida[];
	summary: Record<string, number>;
}

export interface AnalisisCorrecciones {
	correcciones: CorreccionSugerida[];
	erroresSaldo: {
		nombre: string;
		idx: number;
		tiene: number;
		necesita: number;
	}[];
	repetidos: { nombre: string; idx: number; tramos: number[] }[];
	consecutivos: { nombre: string; idx: number; tramos: [number, number][] }[];
}

/**
 * Genera sugerencias de corrección para discrepancias en el plan.
 * Analiza el análisis y propone intercambios para:
 * - Equilibrar saldos (desviación de salidas)
 * - Eliminar repeticiones de 1º/último
 * - Separar costaleros consecutivos
 */
export function generarSugerenciasCorreccion(
	t: Trabajadera,
): AnalisisCorrecciones {
	if (!t.plan || !t.analisis) {
		return {
			correcciones: [],
			erroresSaldo: [],
			repetidos: [],
			consecutivos: [],
		};
	}

	const erroresSaldo: {
		nombre: string;
		idx: number;
		tiene: number;
		necesita: number;
	}[] = [];
	const repetidos: { nombre: string; idx: number; tramos: number[] }[] = [];
	const consecutivos: {
		nombre: string;
		idx: number;
		tramos: [number, number][];
	}[] = [];
	const correcciones: CorreccionSugerida[] = [];

	// 1. Analizar desviaciones de saldo
	if (t.analisis.conteo) {
		Object.entries(t.analisis.conteo).forEach(([idxStr, tiene]) => {
			const idx = +idxStr;
			const necesita = t.obj ? (t.obj[idx] ?? 0) : 0;
			if (tiene !== necesita) {
				erroresSaldo.push({
					nombre: t.nombres[idx],
					idx,
					tiene,
					necesita,
				});
			}
		});
	}

	// 2. Analizar repeticiones 1º/último
	if (t.analisis.rep && t.analisis.rep.length > 0) {
		t.analisis.rep.forEach((idx) => {
			repetidos.push({
				nombre: t.nombres[idx],
				idx,
				tramos: [0, t.tramos.length - 1],
			});
		});
	}

	// 3. Analizar consecutivos
	for (let ti = 1; ti < t.plan.length; ti++) {
		t.plan[ti].fuera.forEach((idx) => {
			if (t.plan && t.plan[ti - 1].fuera.includes(idx)) {
				const existente = consecutivos.find((c) => c.idx === idx);
				if (existente) {
					existente.tramos.push([ti - 1, ti]);
				} else {
					consecutivos.push({
						nombre: t.nombres[idx],
						idx,
						tramos: [[ti - 1, ti]],
					});
				}
			}
		});
	}

	// 4. Generar correcciones concretas
	// Si un costalero tiene desbalance de saldo, sugerir intercambio
	if (erroresSaldo.length >= 2) {
		const conMenos = erroresSaldo
			.filter((e) => e.tiene < e.necesita)
			.sort((a, b) => a.tiene - b.tiene);
		const conMas = erroresSaldo
			.filter((e) => e.tiene > e.necesita)
			.sort((a, b) => b.tiene - a.tiene);

		if (conMenos.length > 0 && conMas.length > 0) {
			const receptor = conMenos[0];
			const donante = conMas[0];
			// Encontrar tramo origen (donde donante está fuera y receptor dentro)
			let tramoOrigen = -1;
			let tramoDestino = -1;
			if (t.plan) {
				for (let ti = 0; ti < t.plan.length; ti++) {
					if (
						t.plan[ti].fuera.includes(donante.idx) &&
						t.plan[ti].dentro.includes(receptor.idx)
					) {
						tramoOrigen = ti;
						break;
					}
				}
				// Encontrar otro tramo donde los roles están invertidos
				for (let ti = 0; ti < t.plan.length; ti++) {
					if (
						t.plan[ti].fuera.includes(receptor.idx) &&
						t.plan[ti].dentro.includes(donante.idx)
					) {
						tramoDestino = ti;
						break;
					}
				}
			}
			correcciones.push({
				tipo: "saldo",
				costaleroA: {
					nombre: receptor.nombre,
					idx: receptor.idx,
					problema: `Necesita ${receptor.necesita - receptor.tiene} salida(s) más`,
				},
				costaleroB: {
					nombre: donante.nombre,
					idx: donante.idx,
					solucion: `Puede ceder ${donante.tiene - donante.necesita} salida(s)`,
				},
				tramoOrigen,
				tramoDestino,
				impacto:
					tramoOrigen >= 0 && tramoDestino >= 0
						? `Intercambiar en tramos ${tramoOrigen + 1} y ${tramoDestino + 1}`
						: `Intercambiar en tramos con roles invertidos`,
				prioridad: 2, // Alta prioridad
			});
		}
	}

	// Corrección de repeticiones
	repetidos.forEach((r) => {
		// Buscar un costalero que no esté en el último tramo para intercambiar
		const candidatos = t.nombres
			.map((nombre, idx) => ({ nombre, idx }))
			.filter((c) => !t.analisis?.rep?.includes(c.idx))
			.filter((c) => !t.bajas?.includes(c.idx))
			.filter(
				(c) => t.plan && t.plan[t.tramos.length - 1].dentro.includes(c.idx),
			);

		if (candidatos.length > 0) {
			correcciones.push({
				tipo: "repetido",
				costaleroA: {
					nombre: r.nombre,
					idx: r.idx,
					problema: `Repite en 1º y último tramo`,
				},
				costaleroB: {
					nombre: candidatos[0].nombre,
					idx: candidatos[0].idx,
					solucion: `Intercambiar en último tramo (T${t.tramos.length})`,
				},
				tramoOrigen: 0,
				tramoDestino: t.tramos.length - 1,
				impacto: `Eliminar repetición 1º/último`,
				prioridad: 1, // Crítica prioridad
			});
		}
	});

	// Corrección de consecutivos - buscar intercambio con costalero del tramo intermedio
	consecutivos.forEach((c) => {
		c.tramos.forEach(([ti1, ti2]) => {
			// En ti2, buscar alguien que pueda intercambiar con quien está fuera en ti1
			if (t.plan) {
				const fueraEnT1 = t.plan[ti1].fuera;
				const dentroEnT2 = t.plan[ti2].dentro;

				// Encontrar un candidato que pueda intercambiar (que no esté de baja)
				const cand = dentroEnT2.find(
					(idx) => !fueraEnT1.includes(idx) && !t.bajas?.includes(idx),
				);
				if (cand !== undefined) {
					// Validar que el intercambio no crea repetición nueva en 1º/último
					const causariaRepeticion =
						ti1 === 0 &&
						t.plan[ti2].dentro.includes(c.idx) &&
						t.plan[t.tramos.length - 1]?.dentro.includes(cand!);

					correcciones.push({
						tipo: "consecutivo",
						costaleroA: {
							nombre: c.nombre,
							idx: c.idx,
							problema: `Está fuera en tramos ${ti1 + 1} y ${ti2 + 1}`,
						},
						costaleroB: {
							nombre: t.nombres[cand],
							idx: cand,
							solucion: `Intercambiar en tramo ${ti2 + 1}`,
						},
						tramoOrigen: ti1,
						tramoDestino: ti2,
						impacto: causariaRepeticion
							? `Separar consecutividad (cuidado: podría crear repetición)`
							: `Separar consecutividad`,
						prioridad: causariaRepeticion ? 3 : 2, // Media si crea conflicto
					});
				}
			}
		});
	});

	// Ordenar por prioridad (crítica primero)
	correcciones.sort((a, b) => (a.prioridad ?? 3) - (b.prioridad ?? 3));

	// 5. Agrupar correcciones por tramos (mostrar resumen si hay múltiples)
	const porTramos: Record<string, CorreccionSugerida[]> = {};
	correcciones.forEach((corr) => {
		const key = `T${corr.tramoOrigen + 1}\u2194T${corr.tramoDestino + 1}`;
		if (!porTramos[key]) porTramos[key] = [];
		porTramos[key].push(corr);
	});

	return {
		correcciones,
		erroresSaldo,
		repetidos,
		consecutivos,
	};
}

/**
 * Intercambia la posición de dos costaleros entre dos tramos.
 * Útil para aplicar sugerencias de corrección.
 *
 * Para "saldo" y "consecutivo":
 * - ciA está fuera en ti1 (el que necesita SALIR menos)
 * - ciB está dentro en ti2 (el que necesita ENTRAR más)
 * - El intercambio: en ti2, ciB pasa a fuera y ciA pasa a dentro
 *
 * Para "repetido" (ti1=0, ti2=último):
 * - ciA está dentro en ambos tramos (el que repite)
 * - ciB está dentro en ti2 (candidato para intercambiar)
 * - El intercambio: ciA pasa a fuera en ambos tramos
 *
 * @param t - Trabajadera (se modifica in place)
 * @param ti1 - Tramo origen
 * @param ti2 - Tramo destino
 * @param ciA - Índice del costalero con problema
 * @param ciB - Índice del costalero candidato
 */

/**
 * Predict consecutive count after a saldo/consecutivo swap.
 * ciA moves ti1.fuera → ti2.dentro, ciB moves ti2.dentro → ti2.fuera.
 */
function countConsAfterSwap(
	t: Trabajadera,
	ti1: number,
	ti2: number,
	ciA: number,
	ciB: number,
): number {
	const plan = t.plan!;
	let cons = 0;
	for (let ti = 1; ti < plan.length; ti++) {
		const prevFuera = new Set(
			ti === ti2
				? [...plan[ti - 1].fuera]
				: ti - 1 === ti2
					? [...plan[ti - 1].fuera, ciB].filter((c) => c !== ciA)
					: plan[ti - 1].fuera,
		);
		const currFuera = new Set(
			ti === ti2
				? [...plan[ti].fuera, ciB].filter((c) => c !== ciA)
				: plan[ti].fuera,
		);
		currFuera.forEach((c) => {
			if (prevFuera.has(c)) cons++;
		});
	}
	return cons;
}

/** Compute current cons count from plan (fallback when t.analisis is null). */
function computeCons(plan: TramoSlot[]): number {
	let cons = 0;
	for (let ti = 1; ti < plan.length; ti++) {
		plan[ti].fuera.forEach((c) => {
			if (plan[ti - 1].fuera.includes(c)) cons++;
		});
	}
	return cons;
}

/** Compute current rep count from plan (fallback when t.analisis is null). */
function computeRep(plan: TramoSlot[]): number[] {
	const primer = plan[0]?.fuera ?? [];
	const ultimo = plan[plan.length - 1]?.fuera ?? [];
	return primer.filter((c) => ultimo.includes(c));
}

/**
 * Predict rep count after a swap.
 * For saldo: only ti2.fuera changes (ciB added, ciA removed).
 * For repetido: both T1.fuera and T_last.fuera change.
 */
function countRepAfterSwap(
	t: Trabajadera,
	ti1: number,
	ti2: number,
	ciA: number,
	ciB: number,
	candidatoT1?: number,
): number[] {
	const plan = t.plan!;
	const last = plan.length - 1;
	const primerFuera =
		ti1 === 0 && candidatoT1 !== undefined
			? plan[0].fuera.filter((c) => c !== candidatoT1)
			: plan[0].fuera;
	const ultimoFuera =
		ti2 === last
			? [...plan[last].fuera, ciB].filter((c) => c !== ciA)
			: plan[last].fuera;
	return primerFuera.filter((c) => ultimoFuera.includes(c));
}

export function aplicarIntercambio(
	t: Trabajadera,
	ti1: number,
	ti2: number,
	ciA: number,
	ciB: number,
): boolean {
	if (!t.plan || !t.obj) return false;

	const todos = Array.from({ length: t.nombres.length }, (_, i) => i).filter(
		(i) => !t.bajas?.includes(i),
	);

	// Caso "repetido": ti1=0 (primer tramo) y ti2 es el último tramo
	// ciA está FUERA en T1 (in analisis.rep = intersection of T1.fuera ∩ T_last.fuera)
	const esRepetido =
		ti1 === 0 &&
		ti2 === t.tramos.length - 1 &&
		t.plan[ti1]?.fuera.includes(ciA);

	if (esRepetido) {
		const r1 = t.plan[ti1];
		const r2 = t.plan[ti2];

		// Verify ciA is outside both T1 and T_last
		if (!r1.fuera.includes(ciA) || !r2.fuera.includes(ciA)) {
			return false;
		}
		// Verify ciB is inside T_last
		if (!r2.dentro.includes(ciB)) {
			return false;
		}

		// T1: ciA is already outside. Bring a fill-in candidate from r1.fuera
		// into r1.dentro to improve plan balance.
		const candidatoT1 = r1.fuera
			.filter((i) => i !== ciA && !t.bajas?.includes(i))
			.sort((a, b) => a - b)[0];
		if (candidatoT1 === undefined) return false;

		// ── REQ-PLANPREC-1: Pre-write guards (repetido branch) ──
		// Guard 5: dentro.length must be 5 before swap
		if (r2.dentro.length !== 5) return false;

		// Guard 3: ciB pinned D in ti2 → cannot move to fuera
		if (t.pinned?.[ti2]?.[ciB] === "D") return false;

		// Guard 4: ciA pinned F/LF in ti2 → cannot move to dentro
		if (
			t.pinned?.[ti2]?.[ciA] === "F" ||
			t.pinned?.[ti2]?.[ciA] === "LF"
		)
			return false;

		// Guard 1: cons would increase → reject (LENIENT)
		const currentCons = t.analisis?.cons ?? computeCons(t.plan!);
		const consAfterRep = countConsAfterSwap(t, ti1, ti2, ciA, ciB);
		if (consAfterRep > currentCons) return false;

		// Guard 2: rep would gain entries → reject (LENIENT)
		const currentRep = t.analisis?.rep ?? computeRep(t.plan!);
		const repAfterRep = countRepAfterSwap(t, ti1, ti2, ciA, ciB, candidatoT1);
		if (repAfterRep.length > currentRep.length) return false;

		// Replace first element of r1.dentro with the candidate
		r1.dentro[0] = candidatoT1;
		r1.fuera = todos
			.filter((i) => !r1.dentro.includes(i))
			.sort((a, b) => a - b);

		// T_last: swap ciA (fuera) with ciB (dentro)
		const idxCiBenT2 = r2.dentro.indexOf(ciB);
		if (idxCiBenT2 === -1) return false;
		r2.dentro[idxCiBenT2] = ciA;
		r2.fuera = todos
			.filter((i) => !r2.dentro.includes(i))
			.sort((a, b) => a - b);

		// Recalcular objetivo y análisis
		const nuevoObj: Record<number, number> = {};
		for (let i = 0; i < t.nombres.length; i++) nuevoObj[i] = 0;
		t.plan.forEach((tramo) =>
			tramo.fuera.forEach((ci) => {
				nuevoObj[ci]++;
			}),
		);
		t.obj = nuevoObj;
		t.analisis = analizar(t.plan, t.nombres.length, nuevoObj, t);

		return true;
	}

	// Caso "saldo" y "consecutivo": ciA está fuera en ti1
	const r1 = t.plan[ti1];
	const r2 = t.plan[ti2];

	if (!r1.fuera.includes(ciA)) {
		return false;
	}

	// Validar que ciB está dentro en ti2
	if (!r2.dentro.includes(ciB)) {
		return false;
	}

	// Intercambio en ti2: ciB pasa de dentro a fuera, ciA pasa de fuera a dentro
	const idxCiBenT2 = r2.dentro.indexOf(ciB);
	if (idxCiBenT2 === -1) return false;

	// ── REQ-CORR-V3-1: duplicate guard ───────────────────────────
	// A previous bulk iteration may have already written ciA into r2.dentro
	// at a different position. Re-writing it would create a duplicate.
	if (r2.dentro.includes(ciA) && r2.dentro.indexOf(ciA) !== idxCiBenT2) {
		return false;
	}

	// ── REQ-PLANPREC-1: Pre-write guards (saldo/consecutivo branch) ──
	// Guard 5: dentro.length must be 5 before swap
	if (r2.dentro.length !== 5) return false;

	// Guard 3: ciB pinned D in ti2 → cannot move to fuera
	if (t.pinned?.[ti2]?.[ciB] === "D") return false;

	// Guard 4: ciA pinned F/LF in ti2 → cannot move to dentro
	if (
		t.pinned?.[ti2]?.[ciA] === "F" ||
		t.pinned?.[ti2]?.[ciA] === "LF"
	)
		return false;

	// Guard 1: cons would increase → reject (LENIENT)
	const currentCons = t.analisis?.cons ?? computeCons(t.plan!);
	const consAfter = countConsAfterSwap(t, ti1, ti2, ciA, ciB);
	if (consAfter > currentCons) return false;

	// Guard 2: rep would gain entries → reject (LENIENT)
	const currentRep = t.analisis?.rep ?? computeRep(t.plan!);
	const repAfter = countRepAfterSwap(t, ti1, ti2, ciA, ciB);
	if (repAfter.length > currentRep.length) return false;

	r2.dentro[idxCiBenT2] = ciA;
	r2.fuera = todos.filter((i) => !r2.dentro.includes(i)).sort((a, b) => a - b);

	// Recalcular objetivo y análisis
	const nuevoObj: Record<number, number> = {};
	for (let i = 0; i < t.nombres.length; i++) nuevoObj[i] = 0;
	t.plan.forEach((tramo) =>
		tramo.fuera.forEach((ci) => {
			nuevoObj[ci]++;
		}),
	);
	t.obj = nuevoObj;
	t.analisis = analizar(t.plan, t.nombres.length, nuevoObj, t);

	return true;
}

/**
 * Aplica todas las sugerencias de corrección disponibles en orden de prioridad.
 * Re-generates the suggestion list on every iteration (capped at MAX_ITER_BULK)
 * so the bulk path does not operate on a stale snapshot.
 * Modifies the Trabajadera in-place.
 * @returns structured result with aplicadas, saltadas, and cap_alcanzado
 */
export function aplicarTodasLasCorrecciones(
	t: Trabajadera,
): ResultadoBulkApply {
	if (!t.plan || !t.analisis)
		return { aplicadas: 0, saltadas: 0, cap_alcanzado: false, violations: [] };

	let aplicadas = 0;
	let saltadas = 0;
	let cap_alcanzado = false;

	for (let i = 0; i < MAX_ITER_BULK; i++) {
		const sugerencias = generarSugerenciasCorreccion(t);
		if (sugerencias.correcciones.length === 0) break;

		// Highest priority first (1 = crítica, 3 = media)
		const ordenadas = [...sugerencias.correcciones].sort(
			(a, b) => (a.prioridad ?? 3) - (b.prioridad ?? 3),
		);
		const corr = ordenadas[0];

		const ok = aplicarIntercambio(
			t,
			corr.tramoOrigen,
			corr.tramoDestino,
			corr.costaleroA.idx,
			corr.costaleroB.idx,
		);
		if (ok) aplicadas++;
		else saltadas++;

		// Check cap_alcanzado: last iteration AND still have pending corrections
		if (i === MAX_ITER_BULK - 1) {
			const next = generarSugerenciasCorreccion(t);
			if (next.correcciones.length > 0) cap_alcanzado = true;
		}
	}

	// ── REQ-PLANPREC-2: Post-bulk re-validation (once, not per iteration) ──
	ordenarDentroFisico(t, t.plan);
	const pinErrors = validarPinned(t);
	const violations: Violation[] = [];

	// Collect pin validation errors as typed violations
	for (const err of pinErrors) {
		const tiMatch = err.match(/Tramo (\d+)/);
		const ti = tiMatch ? parseInt(tiMatch[1], 10) - 1 : 0;
		if (err.includes("fijados fuera")) {
			const pinnedMatch = err.match(/(\d+) fijados fuera \(máx\. (\d+)\)/);
			violations.push({
				kind: "fueramax",
				ti,
				pinned: pinnedMatch ? parseInt(pinnedMatch[1], 10) : 0,
				max: pinnedMatch ? parseInt(pinnedMatch[2], 10) : 0,
			});
		} else {
			violations.push({ kind: "pin", ti, message: err });
		}
	}

	// Re-analyze for cons/rep violations
	t.analisis = analizar(t.plan, t.nombres.length, t.obj!, t);
	if (t.analisis.cons > 0) {
		violations.push({
			kind: "consecutivos",
			ti: 0,
			count: t.analisis.cons,
		});
	}
	if (t.analisis.rep.length > 0) {
		for (const idx of t.analisis.rep) {
			violations.push({
				kind: "repeticion",
				ti1: 0,
				ti2: t.tramos.length - 1,
				idx,
			});
		}
	}

	// Check dentro.length for each tramo
	for (let ti = 0; ti < t.plan.length; ti++) {
		if (t.plan[ti].dentro.length !== 5) {
			violations.push({
				kind: "dentro5",
				ti,
				actual: t.plan[ti].dentro.length,
			});
		}
	}

	return { aplicadas, saltadas, cap_alcanzado, violations };
}
