// ══════════════════════════════════════════════════════════════════
// DISPATCHER — punto único de entrada para simular una trabajadera
// ══════════════════════════════════════════════════════════════════

import type { Analisis, Trabajadera, TramoSlot } from "../types";
import { calcularCiclo, analizar } from "./rotacion";
import { completarAuto, getPinned, countPinned, validarPinned } from "./pinned";
import {
	CuadrillaDobladaDistribucionInvalidaError,
	validarDistribucionCuadrillas,
	UMBRAL_DOBLADO,
} from "./cuadrillaDoblada";

/**
 * v1.3.1: distribución A/B con índices (shape persistente en
 * `t.distribucionCuadrillas`). Es distinta de `Distribucion` (que usa
 * nombres internamente en el algoritmo).
 */
export interface DistribucionIndices {
	a: number[];
	b: number[];
}

/**
 * Resultado unificado de la simulación de una trabajadera. Tanto el
 * camino de cuadrilla doblada (rotación) como el estándar (greedy con
 * pins) devuelven este shape para que los callers no tengan que
 * ramificar.
 */
export interface ResultadoSimulacion {
	plan: TramoSlot[];
	objetivo: Record<number, number>;
	analisis: Analisis;
	/**
	 * Mensaje de error si la simulación falló. Los callers deben
	 * propagarlo a la UI (e.g. `t.analisis.error = error`) y NO
	 * re-lanzarlo — el dispatcher ya captura las excepciones
	 * estructuradas (`CuadrillaDoblada*`) y cualquier `Error` genérico
	 * que se escape de la simulación (v1.2.92 #4).
	 */
	error?: string;
	/**
	 * v1.3.1: distribución A/B modificada (solo cuando el dispatcher
	 * reorganizó la composición de cuadrillas para satisfacer pines).
	 * Si está presente, el caller debe persistirla en
	 * `t.distribucionCuadrillas` para que el cambio sea durable.
	 */
	distribucion?: DistribucionIndices;
}

/**
 * Shape estable para un fallo del dispatcher — usado tanto por la
 * validación de distribución (#3) como por el catch-all genérico (#4).
 * Centralizado para que ambos caminos reporten al usuario con el mismo
 * formato.
 */
function buildErrorResultado(msg: string): ResultadoSimulacion {
	return {
		plan: [],
		objetivo: {},
		analisis: {
			conteo: {},
			okObj: false,
			dentro5: false,
			primer: [],
			ultimo: [],
			rep: [],
			cons: 0,
			error: msg,
		},
		error: msg,
	}
}

/**
 * v1.3.1: identifica pines no satisfechos por un plan.
 * Devuelve una lista de { ti, ci, esperado } para los pines D/F/LF
 * cuya posición actual en el plan no coincide con la restricción.
 *
 * Los pines "L" (libre) y "LS" (latent sugerido) nunca son "insatisfechos"
 * porque son opt-in para el algoritmo, no restricciones.
 */
function pinesInsatisfechos(
	t: Trabajadera,
	plan: TramoSlot[],
): { ti: number; ci: number; esperado: "D" | "F" }[] {
	const p = getPinned(t);
	const fallidos: { ti: number; ci: number; esperado: "D" | "F" }[] = [];
	for (let ti = 0; ti < plan.length; ti++) {
		const dentro = new Set(plan[ti].dentro);
		const fuera = new Set(plan[ti].fuera);
		const row = p[ti] ?? [];
		for (let ci = 0; ci < row.length; ci++) {
			const v = row[ci];
			if (v === "D" && !dentro.has(ci)) {
				fallidos.push({ ti, ci, esperado: "D" });
			} else if (v === "F" && !fuera.has(ci)) {
				fallidos.push({ ti, ci, esperado: "F" });
			} else if (v === "LF" && !fuera.has(ci)) {
				fallidos.push({ ti, ci, esperado: "F" });
			}
		}
	}
	return fallidos;
}

/**
 * v1.3.1: intenta reorganizar la composición A↔B (un swap puntual por pin
 * insatisfecho, solo entre costaleros no pineados) hasta que todos los
 * pines queden satisfechos o no haya más swaps posibles.
 *
 * La mutación es in-place sobre `t.distribucionCuadrillas` para que el
 * caller la pueda persistir.
 *
 * Heurística greedy:
 *   - Para cada pin "D" insatisfecho donde ci está en B → swap con un
 *     miembro de A que NO esté pineado y que según la rotación esté
 *     dentro en ese tramo (para que el swap efectivamente mueva ci a
 *     "dentro").
 *   - Para cada pin "F" insatisfecho donde ci está en A → swap análogo.
 *   - Si después de una pasada no mejora, retorna false.
 *
 * Nota: la heurística es simple y no garantiza optimalidad. Si no
 * converge, el caller hace fallback a `completarAuto`.
 */
function intentarSwapParaPines(
	t: Trabajadera,
	planActualInicial: TramoSlot[],
	pinesFallidos: { ti: number; ci: number; esperado: "D" | "F" }[],
): boolean {
	const dist = t.distribucionCuadrillas;
	if (!dist) return false;

	// Identificar costaleros pineados (no se pueden swapear)
	const p = getPinned(t);
	const pineados = new Set<number>();
	for (let ti = 0; ti < p.length; ti++) {
		for (let ci = 0; ci < p[ti].length; ci++) {
			if (p[ti][ci] !== "L" && p[ti][ci] !== "LS") {
				pineados.add(ci);
			}
		}
	}

	let mejoroAlMenosUnaVez = true;
	let iteraciones = 0;
	const MAX_ITER = pinesFallidos.length * 4 + 1;
	let planActual = planActualInicial;
	let fallidosActuales = pinesFallidos;

	while (mejoroAlMenosUnaVez && iteraciones++ < MAX_ITER) {
		mejoroAlMenosUnaVez = false;

		for (const fallido of fallidosActuales) {
			const { ci, esperado, ti } = fallido;
			const dentro = new Set(planActual[ti].dentro);

			// Identificar cuadrilla actual del costalero pineado
			const enA = dist.a.includes(ci);
			const enB = dist.b.includes(ci);

			// Necesitamos mover ci a la cuadrilla opuesta:
			//   pin "D" → debe estar en A (donde rotará con 5 dentro)
			//   pin "F" → debe estar en B (donde rotará con F fuera)
			const necesitaIrA: "A" | "B" | null =
				esperado === "D" && enB ? "A" :
				esperado === "F" && enA ? "B" :
				null;
			if (necesitaIrA === null) continue;

			// Buscar swap partner en la cuadrilla de destino
			// Preferimos alguien que YA está en el estado correcto (D o F)
			// según la rotación, para que el swap sea efectivo.
			const partnerArr = necesitaIrA === "A" ? dist.a : dist.b;
			let partnerIdx = -1;

			if (esperado === "D" && dentro.has(ci) === false) {
				// Pin "D" insatisfecho: ci está en B y debe estar dentro.
				// Buscar partner en A que según rotación esté dentro en ti.
				partnerIdx = partnerArr.findIndex(
					(idx) => !pineados.has(idx) && idx !== ci && dentro.has(idx),
				);
			}
			if (partnerIdx === -1) {
				// Fallback: cualquier costalero no pineado
				partnerIdx = partnerArr.findIndex(
					(idx) => !pineados.has(idx) && idx !== ci,
				);
			}
			if (partnerIdx === -1) continue;

			const partner = partnerArr[partnerIdx];

			// Hacer swap
			dist.a = dist.a.filter((i) => i !== partner);
			dist.b = dist.b.filter((i) => i !== partner);
			if (necesitaIrA === "A") {
				dist.a.push(ci);
				dist.b.push(partner);
			} else {
				dist.a.push(partner);
				dist.b.push(ci);
			}

			// Reordenar para mantener invariante
			dist.a.sort((x, y) => x - y);
			dist.b.sort((x, y) => x - y);

			mejoroAlMenosUnaVez = true;
		}

		// Recalcular plan con la nueva distribución
		try {
			const recalc = calcularCiclo(t);
			if (recalc.error || !recalc.plan.length) {
				return false;
			}
			planActual = recalc.plan;
		} catch {
			return false;
		}

		// Re-evaluar pines insatisfechos
		const nuevosFallidos = pinesInsatisfechos(t, planActual);
		if (nuevosFallidos.length === 0) return true;
		if (nuevosFallidos.length < fallidosActuales.length) {
			fallidosActuales = nuevosFallidos;
		} else {
			// No mejoró — descartar swap
			return false;
		}
	}

	return false;
}

/**
 * v1.3.1: dispatch para trabajaderas con cuadrilla doblada + pines.
 *
 * Estrategia:
 *   1. Calcula el plan con la distribución A/B actual.
 *   2. Verifica si los pines están satisfechos.
 *   3. Si no, intenta swapping mínimo de A↔B (solo entre costaleros
 *      no pineados) hasta satisfacer los pines o agotar intentos.
 *   4. Si el swapping no converge, hace fallback a `completarAuto`
 *      (que ignora A/B y reorganiza libremente respetando pines).
 *
 * Retorna la distribución actualizada si se reorganizó.
 */
function dispatchConPines(t: Trabajadera): ResultadoSimulacion {
	// 1. Validar pines primero
	const errsPines = validarPinned(t);
	if (errsPines.length) return buildErrorResultado(errsPines.join("; "));

	if (!t.distribucionCuadrillas) {
		// Sin distribución: fallback a greedy puro
		const res = completarAuto(t);
		if ("error" in res) {
			return buildErrorResultado(res.error.join("; "));
		}
		return {
			plan: res.plan,
			objetivo: res.obj,
			analisis: res.analisis,
		};
	}

	// 2. Snapshot de la distribución original (para rollback si swapping no converge)
	const distOriginal: DistribucionIndices = {
		a: [...t.distribucionCuadrillas.a],
		b: [...t.distribucionCuadrillas.b],
	};

	// 3. Validar distribución original (defense in depth)
	try {
		validarDistribucionCuadrillas(t.distribucionCuadrillas, t.nombres.length);
	} catch (caught) {
		if (caught instanceof CuadrillaDobladaDistribucionInvalidaError) {
			return buildErrorResultado(caught.message);
		}
		throw caught;
	}

	// 4. Calcular plan con distribución actual
	let planActual: TramoSlot[] = [];
	let objetivoActual: Record<number, number> = {};
	{
		const r = calcularCiclo(t);
		if (r.error) return buildErrorResultado(r.error);
		planActual = r.plan;
		objetivoActual = r.objetivo;
	}

	// 5. Verificar pines
	const fallidos = pinesInsatisfechos(t, planActual);
	if (fallidos.length === 0) {
		const analisis = analizar(planActual, t.nombres.length, objetivoActual, t);
		return { plan: planActual, objetivo: objetivoActual, analisis };
	}

	// 6. Intentar swapping A↔B
	const swapped = intentarSwapParaPines(t, planActual, fallidos);
	if (swapped) {
		// Recalcular con nueva distribución
		const recalc = calcularCiclo(t);
		if (!recalc.error && recalc.plan.length) {
			const analisis = analizar(
				recalc.plan,
				t.nombres.length,
				recalc.objetivo,
				t,
			);
			return {
				plan: recalc.plan,
				objetivo: recalc.objetivo,
				analisis,
				distribucion: {
					a: [...t.distribucionCuadrillas.a],
					b: [...t.distribucionCuadrillas.b],
				},
			};
		}
	}

	// 7. Si swapping no convergió, rollback y fallback a greedy
	t.distribucionCuadrillas.a = distOriginal.a;
	t.distribucionCuadrillas.b = distOriginal.b;
	const res = completarAuto(t);
	if ("error" in res) {
		return buildErrorResultado(res.error.join("; "));
	}
	return {
		plan: res.plan,
		objetivo: res.obj,
		analisis: res.analisis,
	};
}

/**
 * v1.2.91 M4: punto único de dispatch para simular una trabajadera.
 *
 * Reemplaza la duplicación del gate `cuadrillaDoblada === true && n >= 10`
 * que vivía tanto en `calcularCiclo` (rotacion.ts) como en
 * `completarPlan` (planStore.ts).
 *
 * Comportamiento:
 *   - `cuadrillaDoblada === true && n >= 10` y hay pines → `dispatchConPines`
 *     intenta respetar pines reorganizando la composición A↔B; si no
 *     converge, fallback a `completarAuto`.
 *   - `cuadrillaDoblada === true && n >= 10` sin pines → delega a
 *     `calcularCiclo` (rotación pura).
 *   - resto → delega a `completarAuto` (greedy con pins).
 *
 * v1.2.92 #4: el body está envuelto en try/catch. Cualquier `Error`
 * genérico que se escape (e.g. `simularCicloCompleto:140` "Distribución
 * inválida: suma=X" o `:484` "No se pudo mapear nombre a índice") se
 * convierte en `error: msg` en vez de throw.
 *
 * v1.3.1: el resultado puede incluir `distribucion` cuando el dispatcher
 * reorganizó A↔B. El caller debe persistirla en `t.distribucionCuadrillas`.
 */
export function dispatchSimulacion(t: Trabajadera): ResultadoSimulacion {
	try {
		if (t.cuadrillaDoblada === true && t.nombres.length >= UMBRAL_DOBLADO) {
			// v1.3.1: si hay pines, rutear por dispatchConPines.
			if (countPinned(t).total > 0) {
				return dispatchConPines(t);
			}

			// Sin pines: rotación estándar con la distribución A/B actual.
			if (t.distribucionCuadrillas) {
				validarDistribucionCuadrillas(
					t.distribucionCuadrillas,
					t.nombres.length,
				)
			}
			const { plan, objetivo, error } = calcularCiclo(t);
			const analisis = analizar(plan, t.nombres.length, objetivo, t);
			return {
				plan,
				objetivo,
				analisis,
				...(error ? { error } : {}),
			};
		}
		const res = completarAuto(t);
		if ("error" in res) {
			return buildErrorResultado(res.error.join("; "));
		}
		return {
			plan: res.plan,
			objetivo: res.obj,
			analisis: res.analisis,
		};
	} catch (caught) {
		// v1.2.92 #4: catch-all.
		const msg = caught instanceof Error ? caught.message : String(caught);
		return buildErrorResultado(msg);
	}
}
