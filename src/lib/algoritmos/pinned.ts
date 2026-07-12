// ══════════════════════════════════════════════════════════════════
// PINNED — gestión de estado de pins (D/F/LF/L)
// ══════════════════════════════════════════════════════════════════

import type { Trabajadera, TramoSlot, PinState, Analisis } from "../types";
import { objSalidas, analizar } from "./rotacion";
import { ordenarDentroFisico } from "../roles";

export function getPinned(t: Trabajadera): PinState[][] {
	if (!t.pinned) {
		t.pinned = Array.from({ length: t.tramos.length }, () =>
			Array<PinState>(t.nombres.length).fill("L"),
		);
	}
	while (t.pinned.length < t.tramos.length) {
		t.pinned.push(Array<PinState>(t.nombres.length).fill("L"));
	}
	t.pinned = t.pinned.slice(0, t.tramos.length);
	t.pinned = t.pinned.map((row) => {
		while (row.length < t.nombres.length) row.push("L");
		return row.slice(0, t.nombres.length);
	});
	return t.pinned;
}

export function countPinned(t: Trabajadera): {
	d: number;
	f: number;
	ls: number;
	total: number;
} {
	const p = getPinned(t);
	let d = 0,
		f = 0,
		ls = 0;
	p.forEach((row) =>
		row.forEach((v) => {
			if (v === "D") d++;
			if (v === "F" || v === "LF") f++;
			if (v === "LS") ls++;
		}),
	);
	return { d, f, ls, total: d + f + ls };
}

export function validarPinned(t: Trabajadera): string[] {
	const p = getPinned(t);
	const total = t.nombres.length;
	const F = getF(t);
	const nAct = t.tramos.length;
	const errs: string[] = [];

	for (let ti = 0; ti < nAct; ti++) {
		const row = p[ti];
		const forzDentro = row.filter((v) => v === "D" || v === "LS").length;
		const forzFuera = row.filter((v) => v === "F" || v === "LF").length;
		const libres = row.filter((v) => v === "L").length;
		if (forzDentro > 5)
			errs.push(`Tramo ${ti + 1}: ${forzDentro} fijados dentro (máx. 5)`);
		if (forzFuera > F)
			errs.push(`Tramo ${ti + 1}: ${forzFuera} fijados fuera (máx. ${F})`);
		if (forzDentro + libres < 5)
			errs.push(
				`Tramo ${ti + 1}: imposible completar 5 dentro con ${forzDentro} fijos y ${libres} libres`,
			);
		if (forzFuera + libres < F)
			errs.push(
				`Tramo ${ti + 1}: imposible completar ${F} fuera con ${forzFuera} fijos y ${libres} libres`,
			);
	}
	return errs;
}

export function completarAuto(
	t: Trabajadera,
):
	| { plan: TramoSlot[]; obj: Record<number, number>; analisis: Analisis }
	| { error: string[] } {
	const errs = validarPinned(t);
	if (errs.length) return { error: errs };

	const p = getPinned(t);
	const total = t.nombres.length;
	const aplicaRegla5 = t.regla5costaleros && total === 5;
	const F = getF(t);
	const nAct = t.tramos.length;
	const todos = Array.from({ length: total }, (_, i) => i);
	const salidas = t.salidas ?? 2;
	const obj = objSalidas(total, nAct, salidas, aplicaRegla5);

	const usadas: Record<number, number> = {};
	todos.forEach((c) => {
		usadas[c] = 0;
	});
	for (let ti = 0; ti < nAct; ti++) {
		p[ti].forEach((v, ci) => {
			if (v === "F" || v === "LF" || v === "LS") usadas[ci]++;
		});
	}

	const rest: Record<number, number> = {};
	todos.forEach((c) => {
		rest[c] = Math.max(0, (obj[c] ?? 0) - usadas[c]);
	});

	const ult: Record<number, number> = {};
	todos.forEach((c) => {
		ult[c] = -99;
	});
	const plan: TramoSlot[] = [];

	for (let ti = 0; ti < nAct; ti++) {
		const row = p[ti];
		const esU = ti === nAct - 1;
		const dT0 = esU && plan[0] ? plan[0].fuera : [];

		const forzDentro = todos.filter((c) => row[c] === "D" || row[c] === "LS");
		const forzFuera = todos.filter((c) => row[c] === "F" || row[c] === "LF");
		const libres = todos.filter((c) => row[c] === "L");
		const needFuera = F - forzFuera.length;

		let candsFuera = libres.filter((c) => {
			if (rest[c] <= 0) return false;
			if (ult[c] === ti - 1) return false;
			if (esU && dT0.includes(c)) return false;
			return true;
		});
		if (candsFuera.length < needFuera)
			candsFuera = libres.filter((c) => rest[c] > 0 && ult[c] !== ti - 1);
		if (candsFuera.length < needFuera)
			candsFuera = libres.filter((c) => rest[c] > 0);
		if (candsFuera.length < needFuera)
			candsFuera = libres.filter((c) => !forzDentro.includes(c));

		candsFuera.sort((a, b) => {
			if (rest[b] !== rest[a]) return rest[b] - rest[a];
			const aR = esU && dT0.includes(a) ? 1 : 0;
			const bR = esU && dT0.includes(b) ? 1 : 0;
			if (aR !== bR) return aR - bR;
			return ult[a] - ult[b];
		});

		const autoFuera = candsFuera.slice(0, needFuera);
		const fuera = [...forzFuera, ...autoFuera].sort((a, b) => a - b);
		fuera.forEach((c) => {
			if (p[ti][c] === "L" || p[ti][c] === "LF") {
				rest[c] = Math.max(0, rest[c] - 1);
			}
			ult[c] = ti;
		});

		const dentro = todos
			.filter((c) => !fuera.includes(c))
			.sort((a, b) => a - b);
		plan.push({ dentro, fuera });
	}

	// Aplicar orden físico bajo el paso (PAT_I/COS_I -> FIJ_I -> COR -> FIJ_D -> PAT_D/COS_D)
	const planOrdenado = ordenarDentroFisico(t, plan);

	const an = analizar(planOrdenado, total, obj, t);
	return { plan: planOrdenado, obj, analisis: an };
}

export function getF(t: Trabajadera): number {
	const aplicaRegla5 = t.regla5costaleros && t.nombres.length === 5;
	return aplicaRegla5 ? 1 : (t.nombres.length - t.bajas.length) - 5;
}

export function getFueraPorTramo(t: Trabajadera): number {
	return getF(t);
}
