// ══════════════════════════════════════════════════════════════════
// SUGERENCIAS — sugerencias de pin basadas en puntuaciones
// ══════════════════════════════════════════════════════════════════

import type { Trabajadera } from "../types";
import { getPinned } from "./pinned";

export interface SugerenciaRes {
	top3: { nombre: string; idx: number; puntuacion: number }[];
	tramosClaves: number[];
	ultimoIdx: number;
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

	return {
		top3,
		tramosClaves: t.tramosClaves || [],
		ultimoIdx: t.tramos.length - 1,
	};
}

export function aplicarSugerencias(t: Trabajadera): void {
	const { top3, tramosClaves, ultimoIdx } = generarSugerencias(t);
	if (top3.length === 0) {
		throw new Error(
			"¡Error! No hay ningún costalero con valoración asignada (Página de Equipo).",
		);
	}

	const p = getPinned(t);
	const targets = Array.from(new Set([...tramosClaves, ultimoIdx]));

	// 1. Limpiar PINS actuales 'D' en los tramos objetivo
	targets.forEach((ti) => {
		if (p[ti]) {
			p[ti] = p[ti].map((v) => (v === "D" ? "L" : v));
		}
	});

	// 2. Aplicar PINS: Los 3 mejores van D (Dentro)
	targets.forEach((ti) => {
		if (p[ti]) {
			top3.forEach((c) => {
				p[ti][c.idx] = "D";
			});
		}
	});
}
