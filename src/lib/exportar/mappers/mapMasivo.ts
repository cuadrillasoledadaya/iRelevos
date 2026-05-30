// ══════════════════════════════════════════════════════════════════
// MAPPER MASIVO — Transforma Trabajadera + costalero → MasivoPageData
// ══════════════════════════════════════════════════════════════════

import type { Trabajadera } from "../../types";
import type { MasivoPageData } from "../types";
import type { RolCode } from "../../types";
import { getDentroFisico, estructuraPaso, rolLado } from "../../roles";
import { filaColorStyle } from "../styles/masivo";

/**
 * Convierte RolCode a label con lado: PAT_D → "Patero_D", COS_I → "Costero_I"
 */
function rolCodeToLabel(rol: RolCode): string {
	const nombres: Record<string, string> = {
		PAT: "Patero",
		COS: "Costero",
		FIJ: "Fijador",
		COR: "Corriente",
	};
	const base = rol.split("_")[0];
	const nombre = nombres[base] ?? base;
	if (rol === "COR") return nombre;
	const lado = rolLado(rol);
	return lado ? `${nombre}_${lado}` : nombre;
}

/**
 * Transforma los datos de un costalero dentro de una trabajadera en
 * los datos estructurados que el template Masivo necesita.
 *
 * Es pura: no tiene efectos secundarios. Toma la trabajadera, el nombre
 * y el índice del costalero, y retorna MasivoPageData.
 *
 * @param t               Trabajadera con plan (puede ser null)
 * @param costaleroNombre Nombre del costalero para mostrar
 * @param costaleroIdx    Índice del costalero en t.nombres
 * @param nombrePaso      Nombre del paso (opcional, default '')
 * @returns MasivoPageData con todas las filas precomputadas
 */
export function mapMasivo(
	t: Trabajadera,
	costaleroNombre: string,
	costaleroIdx: number,
	nombrePaso = "",
): MasivoPageData {
	// ── Fecha ──────────────────────────────────────────────────────
	const fecha = new Date()
		.toLocaleDateString("es-ES", {
			weekday: "long",
			day: "2-digit",
			month: "long",
			year: "numeric",
		})
		.replace(/^\w/, (c) => c.toUpperCase());

	// ── Filas por tramo ────────────────────────────────────────────
	const filas = t.tramos.map((nombreTramo, ti) => {
		const r = t.plan?.[ti] ?? { dentro: [], fuera: [] };
		const esDentro = r.dentro.includes(costaleroIdx);
		const esFuera = r.fuera.includes(costaleroIdx);

		let rolLabelStr = "";
		if (esDentro) {
			const dentroF = getDentroFisico(t, r);
			const posIdx = dentroF.findIndex((ci) => ci === costaleroIdx);
			const estructura = estructuraPaso(t.id);
			const rolCode = posIdx !== -1 ? estructura[posIdx] : null;
			if (rolCode) rolLabelStr = rolCodeToLabel(rolCode); // Mostrar como "Patero_I", "Costero_D", etc.
		}

		const estado: "DENTRO" | "FUERA" | "—" = esDentro
			? "DENTRO"
			: esFuera
				? "FUERA"
				: "—";

		const colorFila = filaColorStyle(estado);

		return {
			tramoNombre: nombreTramo,
			estado,
			rolLabel: rolLabelStr,
			colorFila,
		};
	});

	// ── Salidas / Objetivo ─────────────────────────────────────────
	const salidas = t.analisis?.conteo[costaleroIdx] ?? 0;
	const objetivo = t.obj?.[costaleroIdx] ?? 0;

	// ── Primer / Último tramo donde está DENTRO ──────────────────
	let primerTramo: number | null = null;
	let ultimoTramo: number | null = null;

	for (let ti = 0; ti < t.tramos.length; ti++) {
		const r = t.plan?.[ti] ?? { dentro: [], fuera: [] };
		if (r.dentro.includes(costaleroIdx)) {
			if (primerTramo === null) primerTramo = ti;
			ultimoTramo = ti;
		}
	}

	return {
		costaleroNombre,
		trabajaderaId: t.id,
		fecha,
		nombrePaso,
		filas,
		salidas,
		objetivo,
		primerTramo,
		ultimoTramo,
	};
}
