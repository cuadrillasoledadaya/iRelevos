// ══════════════════════════════════════════════════════════════════
// DISPATCHER — punto único de entrada para simular una trabajadera
// ══════════════════════════════════════════════════════════════════

import type { Analisis, Trabajadera, TramoSlot } from "../types";
import { calcularCiclo, analizar } from "./rotacion";
import { completarAuto } from "./pinned";

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
	 * estructuradas (`CuadrillaDoblada*`).
	 */
	error?: string;
}

/**
 * v1.2.91 M4: punto único de dispatch para simular una trabajadera.
 *
 * Reemplaza la duplicación del gate `cuadrillaDoblada === true && n >= 10`
 * que vivía tanto en `calcularCiclo` (rotacion.ts) como en
 * `completarPlan` (planStore.ts).
 *
 * Comportamiento:
 *   - `cuadrillaDoblada === true && n >= 10` → delega a `calcularCiclo`,
 *     que internamente dispatcha entre `simularCicloConTipos` (per-tramo
 *     P/S) y `cuadrillaDobladaATramoSlots` (legacy). Los errores
 *     `CuadrillaDoblada*` se devuelven como `error` (no throw).
 *   - resto → delega a `completarAuto` (greedy con pins).
 *
 * El shape de retorno es siempre `{ plan, objetivo, analisis, error? }`,
 * así los callers (planStore, tests) pueden tratar ambos caminos igual.
 */
export function dispatchSimulacion(t: Trabajadera): ResultadoSimulacion {
	if (t.cuadrillaDoblada === true && t.nombres.length >= 10) {
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
		const errorMsg = res.error.join("; ");
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
				error: errorMsg,
			},
			error: errorMsg,
		};
	}
	return {
		plan: res.plan,
		objetivo: res.obj,
		analisis: res.analisis,
	};
}
