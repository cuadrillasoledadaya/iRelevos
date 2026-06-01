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
} from "./pinned";

// Sugerencias
export { generarSugerencias, aplicarSugerencias } from "./sugerencias";
export type { SugerenciaRes } from "./sugerencias";

// Correcciones
export {
	generarSugerenciasCorreccion,
	aplicarIntercambio,
	aplicarTodasLasCorrecciones,
} from "./correcciones";
export type { CorreccionSugerida, Prioridad, AnalisisCorrecciones } from "./correcciones";

// Utils
export { isGenericTramo } from "./utils";
