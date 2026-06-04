// ══════════════════════════════════════════════════════════════════
// SUGERENCIAS — sugerencias de pin basadas en puntuaciones
// ══════════════════════════════════════════════════════════════════

import type { Trabajadera } from "../types";
import { getPinned } from "./pinned";

/**
 * Detalle de la asignación que se aplicaría a un costalero del top3.
 * `tramosAplicar` son los tramos objetivo donde efectivamente se pondrá D.
 * `tramosRespetados` son los tramos objetivo donde ya tenía un pin manual
 * (D o F) y se deja como está.
 */
export interface SugerenciaAsignacion {
	ci: number;
	nombre: string;
	puntuacion: number;
	tramosAplicar: number[];
	tramosRespetados: number[];
}

/**
 * Resultado de previsualizar una sugerencia. Función pura: NO muta.
 * `preview` está vacío si no hay costaleros con puntuación positiva.
 * `warnings` enumera situaciones informativas para mostrar al usuario
 * (puntuaciones faltantes, sin tramos clave, etc.).
 */
export interface SugerenciaRes {
	top3: { nombre: string; idx: number; puntuacion: number }[];
	tramosObjetivo: number[];
	ultimoIdx: number;
	preview: SugerenciaAsignacion[];
	warnings: string[];
}

export function generarSugerencias(t: Trabajadera): SugerenciaRes {
	const top3 = t.nombres
		.map((nombre, idx) => ({
			nombre,
			idx,
			puntuacion: t.puntuaciones[nombre] || 0,
		}))
		.filter((x) => x.puntuacion > 0)
		.sort((a, b) => b.puntuacion - a.puntuacion)
		.slice(0, 3);

	const ultimoIdx = t.tramos.length - 1;
	const tramosClaves = t.tramosClaves || [];
	const tramosObjetivo = Array.from(
		new Set([...tramosClaves, ultimoIdx]),
	).sort((a, b) => a - b);

	const warnings: string[] = [];
	if (top3.length === 0) {
		warnings.push("No hay costaleros con puntuación asignada");
	} else if (top3.length < 3) {
		warnings.push(
			`Solo ${top3.length} costalero${top3.length === 1 ? "" : "s"} con puntuación (se esperaban 3)`,
		);
	}
	if (tramosClaves.length === 0 && t.tramos.length > 0) {
		warnings.push("No hay tramos clave definidos, se usará solo el último");
	}

	// Calcula preview: por cada costalero del top3, en cada tramo objetivo,
	// mira si ya tiene pin manual D/F preexistente. Si lo tiene, lo respeta;
	// si no, se cambiará a D.
	const p = getPinned(t);
	const preview: SugerenciaAsignacion[] = top3.map((c) => {
		const tramosAplicar: number[] = [];
		const tramosRespetados: number[] = [];
		tramosObjetivo.forEach((ti) => {
			const v = p[ti]?.[c.idx];
			if (v === "D" || v === "F") {
				tramosRespetados.push(ti);
			} else {
				tramosAplicar.push(ti);
			}
		});
		return {
			ci: c.idx,
			nombre: c.nombre,
			puntuacion: c.puntuacion,
			tramosAplicar,
			tramosRespetados,
		};
	});

	// Chequeo previo: si aplicamos, ¿se rompería la regla 5 / capacidad de fuera?
	const totalCost = t.nombres.length;
	const aplicaRegla5 = t.regla5costaleros && totalCost === 5;
	const F = aplicaRegla5 ? 1 : totalCost - 5;
	tramosObjetivo.forEach((ti) => {
		if (!p[ti]) return;

		// D finales: top3 con D manual respetado + top3 nuevos aplicados
		const fijadosDFinales = new Set<number>();
		preview.forEach((a) => {
			const vActual = p[ti]?.[a.ci];
			if (a.tramosRespetados.includes(ti) && vActual === "D") {
				fijadosDFinales.add(a.ci);
			}
			if (a.tramosAplicar.includes(ti)) {
				fijadosDFinales.add(a.ci);
			}
		});
		if (fijadosDFinales.size > 5) {
			warnings.push(
				`T${ti + 1}: quedaría con ${fijadosDFinales.size} fijados dentro (máx. 5)`,
			);
		}

		// F fuera manuales preexistentes (no se tocan nunca)
		const fijadosF = p[ti].filter((v) => v === "F" || v === "LF").length;
		if (fijadosF > F) {
			warnings.push(
				`T${ti + 1}: ya hay ${fijadosF} fijados fuera (máx. ${F}) — pin manual preexistente`,
			);
		}
	});

	return {
		top3,
		tramosObjetivo,
		ultimoIdx,
		preview,
		warnings,
	};
}

export function aplicarSugerencias(t: Trabajadera): void {
	const { preview, tramosObjetivo } = generarSugerencias(t);
	if (preview.length === 0) {
		throw new Error(
			"No hay ningún costalero con valoración asignada (Página de Equipo).",
		);
	}

	const p = getPinned(t);
	const top3CIs = new Set(preview.map((a) => a.ci));

	// 1. Limpiar pins D de costaleros que NO están en el top3 dentro de los
	//    tramos objetivo. Se respetan siempre los pins F manuales (cualquiera)
	//    y los pins D/F del propio top3.
	tramosObjetivo.forEach((ti) => {
		if (!p[ti]) return;
		p[ti] = p[ti].map((v, ci) => {
			if (v === "D" && !top3CIs.has(ci)) return "L";
			return v;
		});
	});

	// 2. Aplicar pins D al top3 únicamente en los tramos donde no hay pin manual
	preview.forEach((asign) => {
		asign.tramosAplicar.forEach((ti) => {
			if (p[ti]) p[ti][asign.ci] = "D";
		});
	});
}
