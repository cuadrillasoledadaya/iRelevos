// ══════════════════════════════════════════════════════════════════
// ALGORITMOS — barrel re-export (backward compatible)
// Re-exports everything that src/lib/algoritmos.ts used to export
// ══════════════════════════════════════════════════════════════════

// Datos
export { BANCO_DEFAULT, datosVacios, migrarDatos } from "./datos";

// Rotación
export { objSalidas, calcularCiclo, tramosOptimos, analizar } from "./rotacion";

// Pinned
export {
	getPinned,
	countPinned,
	validarPinned,
	completarAuto,
	getFueraPorTramo,
	getF,
} from "./pinned";

// Sugerencias
export { generarSugerencias, aplicarSugerencias, aplicarSugerenciaLatente } from "./sugerencias";
export type { SugerenciaRes, SugerenciaAsignacion } from "./sugerencias";

// Correcciones
export {
	generarSugerenciasCorreccion,
	aplicarIntercambio,
	aplicarTodasLasCorrecciones,
	MAX_ITER_BULK,
} from "./correcciones";
export type { CorreccionSugerida, Prioridad, AnalisisCorrecciones, ResultadoBulkApply, BulkCorreccionesPreview, Violation } from "./correcciones";

// Utils
export { isGenericTramo } from "./utils";

// Reconcile (plan-history)
export { reconcile, normalizeName } from "./reconcile";
export type { ReconcileResult } from "./reconcile";

// Dispatcher (M4 — shared dispatch entre calcularCiclo y completarPlan)
export { dispatchSimulacion } from "./dispatcher";
export type { ResultadoSimulacion } from "./dispatcher";

// Cuadrilla Doblada
export {
	puedeDoblarse,
	requiereDecisionDoblado,
	sugerirDistribucion,
	simularCicloCompleto,
	simularCicloConTipos,
	agruparEnCuadrillas,
	validarDistribucionCuadrillas,
	cuadrillaDobladaATramoSlots,
	relevosATramoSlots,
	CuadrillaDobladaSinPrimarioError,
	CuadrillaDobladaSinDisponibleError,
	CuadrillaDobladaDistribucionInvalidaError,
} from "./cuadrillaDoblada";
export type { Distribucion, Relevo } from "./cuadrillaDoblada";
export type { TramoTipo } from "../types";
