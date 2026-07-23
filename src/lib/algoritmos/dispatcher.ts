// ══════════════════════════════════════════════════════════════════
// DISPATCHER — punto único de entrada para simular una trabajadera
// ══════════════════════════════════════════════════════════════════

import type { Analisis, Trabajadera, TramoSlot } from "../types";
import { calcularCiclo, analizar } from "./rotacion";
import { completarAuto } from "./pinned";
import { validarDistribucionCuadrillas } from "./cuadrillaDoblada";

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
 * v1.2.91 M4: punto único de dispatch para simular una trabajadera.
 *
 * Reemplaza la duplicación del gate `cuadrillaDoblada === true && n >= 10`
 * que vivía tanto en `calcularCiclo` (rotacion.ts) como en
 * `completarPlan` (planStore.ts).
 *
 * Comportamiento:
 *   - `cuadrillaDoblada === true && n >= 10` → valida
 *     `distribucionCuadrillas` (#3) y delega a `calcularCiclo`, que
 *     internamente dispatcha entre `simularCicloConTipos` (per-tramo
 *     P/S) y `cuadrillaDobladaATramoSlots` (legacy). Los errores
 *     `CuadrillaDoblada*` se devuelven como `error` (no throw).
 *   - resto → delega a `completarAuto` (greedy con pins).
 *
 * v1.2.92 #4: el body está envuelto en try/catch. Cualquier `Error`
 * genérico que se escape (e.g. `simularCicloCompleto:140` "Distribución
 * inválida: suma=X" o `:484` "No se pudo mapear nombre a índice") se
 * convierte en `error: msg` en vez de throw. Esto cumple el contrato
 * "no throw" del JSDoc — los callers (planStore, tests) pueden confiar
 * en que `dispatchSimulacion` siempre devuelve `ResultadoSimulacion`.
 *
 * El shape de retorno es siempre `{ plan, objetivo, analisis, error? }`,
 * así los callers (planStore, tests) pueden tratar ambos caminos igual.
 */
export function dispatchSimulacion(t: Trabajadera): ResultadoSimulacion {
	try {
		if (t.cuadrillaDoblada === true && t.nombres.length >= 10) {
			// v1.2.92 #3: validate distribucionCuadrillas BEFORE dispatching.
			// The legacy path (tramosTipo absent → cuadrillaDobladaATramoSlots)
			// also validates at the leaf (defense in depth), but doing it
			// here means a bad distribution never enters `calcularCiclo` —
			// which historically could throw generic Errors that escaped
			// the typed-error net.
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
	} catch (err) {
		// v1.2.92 #4: catch-all. Si algo se escapa (genérico Error desde
		// simularCicloCompleto, completarAuto, etc.), lo convertimos en
		// un resultado con `error` en vez de throw. Esto protege a
		// `calcularTodo` (planStore.ts) cuyo forEach abortaría si esto
		// propagara.
		const msg = err instanceof Error ? err.message : String(err);
		return buildErrorResultado(msg);
	}
}
