// ══════════════════════════════════════════════════════════════════
// ROTACION — matemáticas puras de rotación de costaleros
// ══════════════════════════════════════════════════════════════════

import type { Trabajadera, TramoSlot, Analisis } from "../types";
import {
	cuadrillaDobladaATramoSlots,
	simularCicloConTipos,
	relevosATramoSlots,
	CuadrillaDobladaSinPrimarioError,
	CuadrillaDobladaSinDisponibleError,
	CuadrillaDobladaDistribucionInvalidaError,
	tieneAnclas,
	UMBRAL_DOBLADO,
} from "./cuadrillaDoblada";

export function objSalidas(
	total: number,
	numTramos: number,
	salidas: number,
	aplicaRegla5: boolean,
): Record<number, number> {
	// Caso especial: 1 costalero recibe todos los turnos
	if (total === 1) {
		return { 0: numTramos * salidas };
	}

	// Caso especial: regla 5 aplicada a 5 costaleros
	if (aplicaRegla5 && total === 5) {
		// Cada costalero sale exactamente salidas veces → total * salidas asignaciones
		const totalAsignaciones = total * salidas;
		const base = Math.floor(totalAsignaciones / 5);
		const extras = totalAsignaciones % 5;
		const obj: Record<number, number> = {};
		for (let i = 0; i < 5; i++) {
			obj[i] = base + (i < extras ? 1 : 0);
		}
		return obj;
	}

	const F = aplicaRegla5 ? 1 : total - 5;
	if (F <= 0) {
		// Fallback para casos inválidos
		const obj: Record<number, number> = {};
		const base = Math.floor(numTramos / total);
		const extras = numTramos % total;
		for (let i = 0; i < total; i++) obj[i] = i < extras ? base + 1 : base;
		return obj;
	}

	// F = costaleros fuera por tramo, plazas totales = tramos × fuera_por_tramo
	const plazas = numTramos * F;
	const base = Math.floor(plazas / total);
	const extras = plazas % total;
	const obj: Record<number, number> = {};
	for (let i = 0; i < total; i++) obj[i] = i < extras ? base + 1 : base;
	return obj;
}

/**
 * v1.5.0 — conjunto de índices anclados de una working crew.
 */
function setAnclas(t?: Trabajadera): Set<number> {
	if (!t?.anclas) return new Set<number>();
	return new Set([...(t.anclas.a ?? []), ...(t.anclas.b ?? [])]);
}

/**
 * v1.5.0 — objetivo (salidas esperadas por costalero) de una working crew
 * CON anclas.
 *
 * Con anclas el desequilibrio ENTRE cuadrillas es INTENCIONAL: la
 * cuadrilla anclada rota menos (sus miembros están fuera mientras la otra
 * cuadrilla está activa). El objetivo global de `objSalidas` no describe
 * ese plan, así que se reparte la media de salidas de CADA cuadrilla entre
 * sus miembros (mismo reparto "base + extras").
 *
 * Las bajas no rotan (siempre están fuera): su objetivo es su propio
 * conteo real, para que no falseen el equilibrio.
 */
export function objPorCuadrilla(
	plan: TramoSlot[],
	t: Trabajadera,
): Record<number, number> {
	const conteo: Record<number, number> = {};
	plan.forEach((tramo) =>
		tramo.fuera.forEach((i) => {
			conteo[i] = (conteo[i] ?? 0) + 1;
		}),
	);
	const dist = t.distribucionCuadrillas;
	const obj: Record<number, number> = {};
	if (!dist) return obj;
	const bajas = new Set(t.bajas ?? []);
	for (const key of ["a", "b"] as const) {
		const miembros = dist[key].filter((i) => !bajas.has(i));
		if (miembros.length === 0) continue;
		const total = miembros.reduce((acc, i) => acc + (conteo[i] ?? 0), 0);
		const base = Math.floor(total / miembros.length);
		const extras = total % miembros.length;
		miembros.forEach((i, k) => {
			obj[i] = base + (k < extras ? 1 : 0);
		});
	}
	// Bajas (y members fuera de la distribucion): siempre fuera.
	for (let i = 0; i < t.nombres.length; i++) {
		if (obj[i] === undefined) obj[i] = conteo[i] ?? 0;
	}
	return obj;
}

export function calcularCiclo(
	t: Trabajadera,
	turnoInicial: number = 0,
): {
	plan: TramoSlot[];
	objetivo: Record<number, number>;
	error?: string;
} {
	const total = t.nombres.length;
	const numTramos = t.tramos.length;
	const salidas = t.salidas ?? 2;

	// Cuadrilla doblada path — three-way dispatch
	if (t.cuadrillaDoblada === true && total >= UMBRAL_DOBLADO) {
	// Per-tramo dispatch: tramosTipo present
			if (t.tramosTipo && t.tramosTipo.length > 0) {
				try {
					const relevos = simularCicloConTipos(
						t,
						t.tramosTipo,
						salidas,
						turnoInicial,
					);
					const plan = relevosATramoSlots(t, relevos);
				const aplicaRegla5 = false;
				// v1.5.0: con anclas el objetivo se reparte por cuadrilla
				// (el desequilibrio entre cuadrillas es intencional).
				const objetivo = tieneAnclas(t)
					? objPorCuadrilla(plan, t)
					: objSalidas(total, numTramos, salidas, aplicaRegla5);
				return { plan, objetivo };
			} catch (err: unknown) {
				// Surface typed errors to the UI (don't throw — would crash
				// calcularTodo's forEach in planStore).
				if (err instanceof CuadrillaDobladaSinPrimarioError) {
					return { plan: [], objetivo: {}, error: err.message };
				}
				if (err instanceof CuadrillaDobladaSinDisponibleError) {
					return { plan: [], objetivo: {}, error: err.message };
				}
				if (err instanceof CuadrillaDobladaDistribucionInvalidaError) {
					return { plan: [], objetivo: {}, error: err.message };
				}
				throw err;
			}
		}
		// Legacy doblado: tramosTipo absent → cuadrillaDobladaATramoSlots
		const plan = cuadrillaDobladaATramoSlots(t);
		const aplicaRegla5 = false;
		// v1.5.0: mismo criterio de objetivo que en el path por tramos.
		const objetivo = tieneAnclas(t)
			? objPorCuadrilla(plan, t)
			: objSalidas(total, numTramos, salidas, aplicaRegla5);
		return { plan, objetivo };
	}

	const aplicaRegla5 = t.regla5costaleros && total === 5;
	const F = aplicaRegla5 ? 1 : total - 5;
	if (F <= 0 || numTramos <= 0) return { plan: [], objetivo: {} };

	const todos = Array.from({ length: total }, (_, i) => i);
	const obj = objSalidas(total, numTramos, salidas, aplicaRegla5);
	const rest: Record<number, number> = {};
	const ult: Record<number, number> = {};
	todos.forEach((c) => {
		rest[c] = obj[c];
		ult[c] = -99;
	});

	const plan: TramoSlot[] = [];
	for (let ti = 0; ti < numTramos; ti++) {
		const esU = ti === numTramos - 1;
		const dT0 = esU && plan[0] ? plan[0].fuera : [];
		let cands = todos.filter(
			(c) => rest[c] > 0 && ult[c] !== ti - 1 && !(esU && dT0.includes(c)),
		);
		if (cands.length < F)
			cands = todos.filter((c) => rest[c] > 0 && ult[c] !== ti - 1);
		if (cands.length < F) cands = todos.filter((c) => rest[c] > 0);
		cands.sort((a, b) => {
			if (rest[b] !== rest[a]) return rest[b] - rest[a];
			const aR = esU && dT0.includes(a) ? 1 : 0;
			const bR = esU && dT0.includes(b) ? 1 : 0;
			if (aR !== bR) return aR - bR;
			return ult[a] - ult[b];
		});
		const fuera = cands.slice(0, F);
		fuera.forEach((c) => {
			rest[c]--;
			ult[c] = ti;
		});
		const dentro = todos
			.filter((c) => !fuera.includes(c))
			.sort((a, b) => a - b);
		plan.push({ dentro: [...dentro], fuera: [...fuera].sort((a, b) => a - b) });
	}
	return { plan, objetivo: obj };
}

export function tramosOptimos(
	total: number,
	salidas: number,
	regla5costaleros?: boolean,
): number {
	// Caso especial: regla 5 costaleros activa con exactamente 5 costaleros
	if (regla5costaleros && total === 5) {
		// Con regla5: 1 fuera por tramo, cada costalero sale salidas veces
		// Total slots fuera necesarios = total * salidas = tramos necesarios
		return total * salidas;
	}

	const F = total - 5;
	if (F <= 0) return 0;
	const base = Math.ceil((total * salidas) / F);
	for (let n = base; n <= base + total * 3; n++) {
		const t: Trabajadera = {
			id: 1,
			nombres: Array(total).fill(""),
			tramos: Array(n).fill(""),
			salidas,
			roles: [],
			bajas: [],
			regla5costaleros: false,
			plan: null,
			obj: null,
			analisis: null,
			pinned: null,
			puntuaciones: {},
			boquilla: {},
			tramosClaves: [],
		};
		const { plan } = calcularCiclo(t);
		if (!plan || !plan.every((s) => s.dentro.length === 5)) continue;
		if (plan[0].fuera.filter((c) => plan[n - 1].fuera.includes(c)).length === 0)
			return n;
	}
	return base;
}

export function analizar(
	plan: TramoSlot[],
	total: number,
	obj: Record<number, number>,
	t?: Trabajadera,
): Analisis {
	const conteo: Record<number, number> = {};
	for (let i = 0; i < total; i++) conteo[i] = 0;
	plan.forEach((tramo) =>
		tramo.fuera.forEach((i) => {
			conteo[i]++;
		}),
	);
	// v1.5.0: con anclas el objetivo es POR CUADRILLA (el desequilibrio
	// entre cuadrillas es intencional) y se admite ±1 de desviación: el
	// reparto FIFO no siempre queda exacto cuando el nº de slots de la
	// cuadrilla no es múltiplo de sus miembros.
	const anclas = setAnclas(t);
	const hayAnclas = anclas.size > 0;
	const okObj = Object.keys(conteo).every((i) => {
		const c = conteo[+i];
		const o = obj[+i] ?? 0;
		return hayAnclas ? Math.abs(c - o) <= 1 : c === o;
	});
	const aplicaRegla5 = t?.regla5costaleros && total === 5;
	const dentro_esperado = aplicaRegla5 ? 4 : 5;
	// v1.5.0: las anclas NO cuentan para el mínimo de 5 dentro (jerarquía
	// del capataz: "5 dentro" cuenta rotantes; el ancla suma, no resta).
	const dentro5 = plan.every((tramo) => {
		const rotantes = tramo.dentro.filter((i) => !anclas.has(i)).length;
		return rotantes === dentro_esperado;
	});
	const primer = plan[0]?.fuera ?? [];
	const ultimo = plan[plan.length - 1]?.fuera ?? [];
	const rep = primer.filter((c) => ultimo.includes(c));
	let cons = 0;
	for (let ti = 1; ti < plan.length; ti++) {
		plan[ti].fuera.forEach((c) => {
			if (plan[ti - 1].fuera.includes(c)) cons++;
		});
	}
	return { conteo, okObj, dentro5, primer, ultimo, rep, cons };
}
