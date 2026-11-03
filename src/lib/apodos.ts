// ══════════════════════════════════════════════════════════════════
// APODOS — Mapeo censo → cuadrillas (working crews)
//
// El censo (tabla `census`) es la fuente de verdad de los apodos.
// Cada costalero de una cuadrilla tiene un nombre (`nombres[i]`) que
// puede ser:
//   a) el apodo      → "Rafa Sug"  (así lo deja `syncTodoCenso`)
//   b) el nombre real → "Rafael Sugrañes Estévez" (si no tenía apodo al
//      importar, o si el capataz lo escribió a mano)
//
// Este módulo resuelve el apodo de cada índice de cada cuadrilla a
// partir del censo, sin depender de Supabase (puro y testeable).
// ══════════════════════════════════════════════════════════════════

import type { Trabajadera } from "./types";

/** Fila mínima del censo necesaria para resolver apodos. */
export interface FilaCensoApodo {
	nombre: string;
	apellidos?: string | null;
	apodo?: string | null;
}

/**
 * Índice de apodos.
 *
 * - `exactos`: nombre completo y el propio apodo → apodos.
 *   Son claves "fuertes": si una cuadrilla tiene ese texto, es esa persona.
 * - `porPrimerNombre`: primer nombre → apodos.
 *   Son claves "débiles": solo se usan si el nombre es único en el censo.
 */
export interface IndiceApodos {
	exactos: Record<string, string[]>;
	porPrimerNombre: Record<string, string[]>;
}

/** Normaliza una clave: sin espacios extra y con espacios internos colapsados. */
export function normalizarClave(nombre: string | null | undefined): string {
	return String(nombre ?? "")
		.trim()
		.replace(/\s+/g, " ");
}

/** ¿Es un nombre placeholder ("Costalero 3")? No tiene apodo posible. */
export function esPlaceholder(nombre: string | null | undefined): boolean {
	const n = normalizarClave(nombre);
	if (!n) return true;
	return /^costalero\s+\d+$/i.test(n);
}

/**
 * Construye el índice de apodos a partir de las filas del censo.
 * Las filas sin apodo se ignoran (no aportan nada que resolver).
 */
export function construirIndiceApodos(filas: FilaCensoApodo[]): IndiceApodos {
	const indice: IndiceApodos = { exactos: {}, porPrimerNombre: {} };

	const add = (
		mapa: Record<string, string[]>,
		clave: string,
		apodo: string,
	) => {
		if (!clave || !apodo) return;
		if (!mapa[clave]) mapa[clave] = [];
		if (!mapa[clave].includes(apodo)) mapa[clave].push(apodo);
	};

	for (const fila of filas) {
		const apodo = normalizarClave(fila.apodo);
		if (!apodo) continue;

		const nombre = normalizarClave(fila.nombre);
		const nombreCompleto = normalizarClave(
			`${fila.nombre ?? ""} ${fila.apellidos ?? ""}`,
		);

		add(indice.exactos, nombreCompleto, apodo);
		// El propio apodo como clave: en la cuadrilla el nombre puede ser
		// ya el apodo ("Rafa Sug") y tiene que resolverse a sí mismo.
		add(indice.exactos, apodo, apodo);
		add(indice.porPrimerNombre, nombre, apodo);
	}

	return indice;
}

/**
 * Resuelve el apodo de cada índice de cada cuadrilla.
 *
 * Reglas (en orden):
 *  1. Match exacto por la clave del nombre (nombre completo o apodo).
 *     Si hay varias filas con la misma clave, se reparte por orden de
 *     aparición (mismo criterio que el reparto por cuadrilla).
 *  2. Match por primer nombre — SOLO si es único en todo el censo.
 *     Si hay varios (dos "Adrián"), no se asigna: es mejor no poner un
 *     apodo equivocado que uno inventado.
 */
export function calcularApodosCuadrilla(
	trabajaderas: Trabajadera[],
	indice: IndiceApodos,
): (string | undefined)[][] {
	return trabajaderas.map((t) =>
		t.nombres.map((nombre, idx) => {
			const clave = normalizarClave(nombre);
			if (esPlaceholder(clave)) return undefined;

			// 1. Match exacto por nombre completo / apodo
			const exact = indice.exactos[clave];
			if (exact && exact.length === 1) return exact[0];
			if (exact && exact.length > 1) {
				const countBefore = t.nombres
					.slice(0, idx)
					.filter((n) => normalizarClave(n) === clave).length;
				return countBefore < exact.length ? exact[countBefore] : undefined;
			}

			// 2. Match por primer nombre — SOLO si el nombre de la cuadrilla
			//    es una sola palabra (el capataz lo escribió a mano) y el
			//    primer nombre es único en el censo.
			//    Con nombre + apellidos NO se aplica: "Javi Villablanca"
			//    (sin apodo) heredaría el apodo de "Javi Mena Guerrero".
			if (!clave.includes(" ")) {
				const byFirst = indice.porPrimerNombre[clave];
				if (byFirst && byFirst.length === 1) return byFirst[0];
			}

			return undefined;
		}),
	);
}

/**
 * ¿Los apodos calculados difieren de los que ya tiene la cuadrilla?
 * Se usa para no guardar en la nube cuando no ha cambiado nada
 * (evita bucles de guardado al cargar el proyecto).
 */
export function apodosDifieren(
	actual: (string | undefined)[] | undefined,
	nuevos: (string | undefined)[],
): boolean {
	const actuales = actual ?? [];
	const largo = Math.max(actuales.length, nuevos.length);
	for (let i = 0; i < largo; i++) {
		if ((actuales[i] ?? undefined) !== (nuevos[i] ?? undefined)) return true;
	}
	return false;
}
