// ══════════════════════════════════════════════════════════════════
// TESTS — dispatcher.ts (M4 shared dispatch helper)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from "vitest";
import { dispatchSimulacion } from "./dispatcher";
import * as rotacion from "./rotacion";
import type { DatosPerfil, Trabajadera } from "../types";

function makeCuadrillaDoblada(): Trabajadera {
	return {
		id: 1,
		nombres: Array.from({ length: 12 }, (_, i) => `c${i + 1}`),
		roles: [],
		salidas: 1,
		tramos: ["T1", "T2", "T3", "T4", "T5", "T6"],
		tramosTipo: [
			"primario",
			"secundario",
			"primario",
			"secundario",
			"primario",
			"secundario",
		],
		plan: null,
		obj: null,
		analisis: null,
		pinned: null,
		bajas: [],
		regla5costaleros: false,
		puntuaciones: {},
		boquilla: {},
		tramosClaves: [],
		cuadrillaDoblada: true,
		distribucionCuadrillas: { a: [0, 1, 2, 3, 4, 5], b: [6, 7, 8, 9, 10, 11] },
	};
}

function makeEstandar(): Trabajadera {
	return {
		id: 2,
		nombres: Array.from({ length: 7 }, (_, i) => `x${i + 1}`),
		roles: Array.from({ length: 7 }, () => ({ pri: "COR" as const, sec: "FIJ_I" as const })),
		salidas: 2,
		tramos: ["T1", "T2", "T3"],
		plan: null,
		obj: null,
		analisis: null,
		pinned: null,
		bajas: [],
		regla5costaleros: false,
		puntuaciones: {},
		boquilla: {},
		tramosClaves: [],
	};
}

describe("dispatchSimulacion (M4)", () => {
	it("cuadrilla doblada (n=12, flag true) usa rotación y devuelve 6 slots", () => {
		const t = makeCuadrillaDoblada();
		const { plan, objetivo, analisis, error } = dispatchSimulacion(t);
		expect(error).toBeUndefined();
		expect(plan).toHaveLength(6); // 1 salida × 6 tramos
		expect(Object.keys(objetivo)).toHaveLength(12);
		expect(analisis).toBeDefined();
		plan.forEach((s) => {
			expect(s.dentro).toHaveLength(5);
			expect(s.fuera).toHaveLength(7);
		});
	});

	it("cuadrilla doblada: respeta la rotación P/S (c7 sale en T2, c8 en T6)", () => {
		const t = makeCuadrillaDoblada();
		const { plan } = dispatchSimulacion(t);
		// T2 (S de B): c7 en F
		expect(plan[1].fuera).toContain(6);
		// T6 (S de B): c8 en F (rotación avanza, NO c7)
		expect(plan[5].fuera).toContain(7);
		expect(plan[5].fuera).not.toContain(6);
	});

	it("estándar (sin flag doblado) usa el camino greedy de completarAuto", () => {
		const t = makeEstandar();
		const { plan, objetivo, analisis, error } = dispatchSimulacion(t);
		expect(error).toBeUndefined();
		expect(plan).toHaveLength(3); // 3 tramos
		expect(Object.keys(objetivo)).toHaveLength(7);
		expect(analisis).toBeDefined();
	});

	it("estándar con pin D respeta el pin (camino completarAuto)", () => {
		const t = makeEstandar();
		// Pin D en x1 (idx 0) en T1
		const p: ("L" | "D" | "F" | "LF" | "LS")[][] = Array.from(
			{ length: 3 },
			() => Array(7).fill("L" as const),
		);
		p[0][0] = "D";
		t.pinned = p;
		const { plan } = dispatchSimulacion(t);
		// T1: x1 debe estar en D
		expect(plan[0].dentro).toContain(0);
	});

	it("cuadrilla doblada con distribución inválida: devuelve error (no throw)", () => {
		const t = makeCuadrillaDoblada();
		// Índice fuera de rango
		t.distribucionCuadrillas = {
			a: [0, 1, 2, 3, 99],
			b: [5, 6, 7, 8, 9, 10, 11],
		};
		const { plan, objetivo, error } = dispatchSimulacion(t);
		expect(error).toBeDefined();
		expect(error).toMatch(/fuera de rango|distribuci[óo]n/i);
		expect(plan).toEqual([]);
		expect(objetivo).toEqual({});
	});

	it("cuadrilla doblada con S sin disp: devuelve error claro (no throw)", () => {
		const t = makeCuadrillaDoblada();
		// 10 costaleros con distribución 5/5: B sin disp después de P
		t.nombres = Array.from({ length: 10 }, (_, i) => `c${i + 1}`);
		t.roles = Array.from({ length: 10 }, () => ({ pri: "COR" as const, sec: "FIJ_I" as const }));
		t.tramos = ["T1", "T2"];
		t.tramosTipo = ["primario", "secundario"];
		t.distribucionCuadrillas = { a: [0, 1, 2, 3, 4], b: [5, 6, 7, 8, 9] };
		const { plan, error } = dispatchSimulacion(t);
		expect(error).toBeDefined();
		expect(error).toMatch(/disponibles|intermedio|secundario/i);
		expect(plan).toEqual([]);
	});

	it("estándar con validación de pins fallida: devuelve error (no throw)", () => {
		const t = makeEstandar();
		// 6 D + 0 L en T1 con 7 costaleros: forzDentro=6, libres=1.
		// F = 7-5 = 2; forzFuera=0, libres=1 → 1 < 2, falla validación.
		const p: ("L" | "D" | "F" | "LF" | "LS")[][] = Array.from(
			{ length: 3 },
			() => Array(7).fill("D" as const),
		);
		p[0][6] = "L"; // 1 libre
		t.pinned = p;
		const { plan, error } = dispatchSimulacion(t);
		expect(error).toBeDefined();
		expect(plan).toEqual([]);
	});

	it("analisis siempre presente en el resultado (shape unificado)", () => {
		const tDoblada = makeCuadrillaDoblada();
		const tEstandar = makeEstandar();
		const r1 = dispatchSimulacion(tDoblada);
		const r2 = dispatchSimulacion(tEstandar);
		expect(r1.analisis).toBeDefined();
		expect(r2.analisis).toBeDefined();
		// Shape: analisis tiene los campos esperados
		expect(r1.analisis).toHaveProperty("conteo");
		expect(r1.analisis).toHaveProperty("okObj");
		expect(r1.analisis).toHaveProperty("dentro5");
		expect(r1.analisis).toHaveProperty("primer");
		expect(r1.analisis).toHaveProperty("ultimo");
		expect(r1.analisis).toHaveProperty("rep");
		expect(r1.analisis).toHaveProperty("cons");
	});

	it("cuadrilla doblada con n < 10: cae al camino estándar (greedy)", () => {
		// 8 costaleros, flag doblado true pero n<10 → usar estándar
		const t = makeCuadrillaDoblada();
		t.nombres = Array.from({ length: 8 }, (_, i) => `c${i + 1}`);
		t.roles = Array.from({ length: 8 }, () => ({ pri: "COR" as const, sec: "FIJ_I" as const }));
		t.distribucionCuadrillas = null; // no hay dist válida
		// El gate "cuadrillaDoblada && n>=10" hace que vaya al estándar
		const { plan, error } = dispatchSimulacion(t);
		expect(error).toBeUndefined();
		expect(plan).toHaveLength(6); // 6 tramos (de makeCuadrillaDoblada)
		// 8 nombres: F = 8-5 = 3, cada tramo tiene 3 fuera
		plan.forEach((s) => {
			expect(s.dentro).toHaveLength(5);
			expect(s.fuera).toHaveLength(3);
		});
	});

	// Smoke test contra DatosPerfil para confirmar que no rompe el
	// contrato de tipos en contextos reales.
	it("shape compatible con uso desde planStore (no muta input)", () => {
		const t = makeEstandar();
		const nombresAntes = [...t.nombres];
		const distAntes = t.distribucionCuadrillas;
		dispatchSimulacion(t);
		expect(t.nombres).toEqual(nombresAntes);
		expect(t.distribucionCuadrillas).toBe(distAntes);
	});

	// ══════════════════════════════════════════════════════════════
	// v1.2.92 #3: legacy path (sin tramosTipo) debe validar
	// distribucionCuadrillas. Antes: out-of-range index aquí se
	// convertía en t.nombres[99] === undefined, pasaba el filter de
	// bajas, y moría con "No se pudo mapear nombre a índice" en
	// cuadrillaDobladaATramoSlots:483 — un Error genérico que escapaba
	// del dispatcher. Ahora: validarDistribucionCuadrillas se llama en
	// dispatchSimulacion antes de dispatchar → error estructurado.
	// ══════════════════════════════════════════════════════════════

	function makeLegacyDoblada(): Trabajadera {
		return {
			id: 1,
			nombres: Array.from({ length: 12 }, (_, i) => `c${i + 1}`),
			roles: [],
			salidas: 1,
			tramos: ["T1", "T2", "T3"],
			// NO tramosTipo → legacy path
			plan: null,
			obj: null,
			analisis: null,
			pinned: null,
			bajas: [],
			regla5costaleros: false,
			puntuaciones: {},
			boquilla: {},
			tramosClaves: [],
			cuadrillaDoblada: true,
			distribucionCuadrillas: { a: [0, 1, 2, 3, 4, 5], b: [6, 7, 8, 9, 10, 11] },
		};
	}

	it("legacy path con índice fuera de rango en A: devuelve error, no throw", () => {
		const t = makeLegacyDoblada();
		t.distribucionCuadrillas = {
			a: [0, 1, 2, 3, 99], // 99 out of range
			b: [5, 6, 7, 8, 9, 10, 11], // suma = 12, pero idx 99 fuera
		};
		// Wrapper para capturar throw — si dispatchSimulacion lanza, test falla
		let thrown: unknown = null;
		let result: ReturnType<typeof dispatchSimulacion> | null = null;
		try {
			result = dispatchSimulacion(t);
		} catch (e) {
			thrown = e;
		}
		expect(thrown).toBeNull();
		expect(result).not.toBeNull();
		expect(result!.error).toBeDefined();
		expect(result!.error).toMatch(/fuera de rango|distribuci[óo]n/i);
		expect(result!.plan).toEqual([]);
	});

	it("legacy path con duplicado en B: devuelve error, no throw", () => {
		const t = makeLegacyDoblada();
		t.distribucionCuadrillas = {
			a: [0, 1, 2, 3, 4, 5],
			b: [6, 7, 8, 9, 9, 10], // idx 9 duplicado en B
		};
		let thrown: unknown = null;
		let result: ReturnType<typeof dispatchSimulacion> | null = null;
		try {
			result = dispatchSimulacion(t);
		} catch (e) {
			thrown = e;
		}
		expect(thrown).toBeNull();
		expect(result!.error).toBeDefined();
		expect(result!.error).toMatch(/duplicado|distribuci[óo]n/i);
	});

	it("legacy path con sub-ancho en A: devuelve error, no throw", () => {
		const t = makeLegacyDoblada();
		t.distribucionCuadrillas = {
			a: [0, 1, 2, 3], // solo 4 (< 5 = ANCHO)
			b: [4, 5, 6, 7, 8, 9, 10, 11], // 8 para que suma = 12
		};
		let thrown: unknown = null;
		let result: ReturnType<typeof dispatchSimulacion> | null = null;
		try {
			result = dispatchSimulacion(t);
		} catch (e) {
			thrown = e;
		}
		expect(thrown).toBeNull();
		expect(result!.error).toBeDefined();
		expect(result!.error).toMatch(/ancho|distribuci[óo]n/i);
	});

	it("legacy path con suma_incorrecta: devuelve error, no throw", () => {
		const t = makeLegacyDoblada();
		// 9/12 con 12 totales — cada uno >= ANCHO, sin duplicados, en rango, pero suma=21 != 12
		t.distribucionCuadrillas = {
			a: [0, 1, 2, 3, 4, 5, 6, 7, 8],
			b: [9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8], // 12 elementos (algunos overlap)
		};
		let thrown: unknown = null;
		let result: ReturnType<typeof dispatchSimulacion> | null = null;
		try {
			result = dispatchSimulacion(t);
		} catch (e) {
			thrown = e;
		}
		expect(thrown).toBeNull();
		expect(result!.error).toBeDefined();
	});

	it("legacy path con distribución válida: no error, plan computado", () => {
		const t = makeLegacyDoblada();
		const { plan, objetivo, error } = dispatchSimulacion(t);
		expect(error).toBeUndefined();
		expect(plan.length).toBeGreaterThan(0);
		expect(Object.keys(objetivo)).toHaveLength(12);
	});

	// ══════════════════════════════════════════════════════════════
	// v1.2.92 #4: dispatchSimulacion no debe propagar errores genéricos.
	// El JSDoc dice "Los callers deben propagarlo a la UI ... y NO
	// re-lanzarlo — el dispatcher ya captura las excepciones
	// estructuradas (CuadrillaDoblada*)". Pero el body no capturaba
	// errores genéricos de simularCicloCompleto (cuadrillaDoblada.ts:140,
	// 484) — la contract estaba rota. Ahora: try/catch convierte
	// cualquier error en { plan:[], objetivo:{}, analisis:{error:msg},
	// error:msg }.
	// ══════════════════════════════════════════════════════════════

	it("captura Error genérico de calcularCiclo y devuelve error shape (no throw)", () => {
		const t = makeCuadrillaDoblada();
		// Forzar un throw genérico desde calcularCiclo (simula el caso
		// de line 140 / 484 de cuadrillaDoblada.ts: errores que no son
		// CuadrillaDoblada* y escapaban del dispatcher)
		const spy = vi
			.spyOn(rotacion, "calcularCiclo")
			.mockImplementation(() => {
				throw new Error("Distribución inválida: suma=99, costaleros=12");
			});
		try {
			let thrown: unknown = null;
			let result: ReturnType<typeof dispatchSimulacion> | null = null;
			try {
				result = dispatchSimulacion(t);
			} catch (e) {
				thrown = e;
			}
			expect(thrown).toBeNull();
			expect(result).not.toBeNull();
			expect(result!.error).toBeDefined();
			expect(result!.error).toMatch(/suma=99/);
			expect(result!.plan).toEqual([]);
			expect(result!.objetivo).toEqual({});
			expect(result!.analisis.error).toBeDefined();
		} finally {
			spy.mockRestore();
		}
	});

	it("captura Error genérico (no CuadrillaDoblada*) y preserva el mensaje", () => {
		const t = makeCuadrillaDoblada();
		const spy = vi
			.spyOn(rotacion, "calcularCiclo")
			.mockImplementation(() => {
				throw new Error("No se pudo mapear nombre a índice: c99");
			});
		try {
			let thrown: unknown = null;
			let result: ReturnType<typeof dispatchSimulacion> | null = null;
			try {
				result = dispatchSimulacion(t);
			} catch (e) {
				thrown = e;
			}
			expect(thrown).toBeNull();
			expect(result!.error).toBeDefined();
			expect(result!.error).toMatch(/c99/);
		} finally {
			spy.mockRestore();
		}
	});

	it("preserva el mensaje de error original sin decoración", () => {
		const t = makeCuadrillaDoblada();
		const mensajeOriginal = "Custom error from simularCicloCompleto: xyz";
		const spy = vi
			.spyOn(rotacion, "calcularCiclo")
			.mockImplementation(() => {
				throw new Error(mensajeOriginal);
			});
		try {
			const { error } = dispatchSimulacion(t);
			expect(error).toBe(mensajeOriginal);
		} finally {
			spy.mockRestore();
		}
	});

	// ══════════════════════════════════════════════════════════════
	// v1.2.93 #2: dispatcher debe surfacing
	// CuadrillaDobladaSubAnchoPostBajasError con el mismo shape de
	// error que el resto (no throw, sino { error: msg }).
	// ══════════════════════════════════════════════════════════════

	it("cuadrilla doblada con sub-ancho post-bajas: devuelve error, no throw", () => {
		const t = makeCuadrillaDoblada();
		// 12 costaleros, 6/6. Bajas: [7, 8] (c8, c9 en B → B queda 4).
		t.nombres = Array.from({ length: 12 }, (_, i) => `c${i + 1}`);
		t.roles = Array.from({ length: 12 }, () => ({ pri: "COR" as const, sec: "FIJ_I" as const }));
		t.tramos = ["T1", "T2"];
		t.tramosTipo = ["primario", "primario"];
		t.distribucionCuadrillas = { a: [0, 1, 2, 3, 4, 5], b: [6, 7, 8, 9, 10, 11] };
		t.bajas = [7, 8];
		let thrown: unknown = null;
		let result: ReturnType<typeof dispatchSimulacion> | null = null;
		try {
			result = dispatchSimulacion(t);
		} catch (e) {
			thrown = e;
		}
		expect(thrown).toBeNull();
		expect(result).not.toBeNull();
		expect(result!.error).toBeDefined();
		expect(result!.error).toMatch(/baja/i);
		expect(result!.error).toMatch(/B/);
		expect(result!.error).toMatch(/4/);
		expect(result!.plan).toEqual([]);
	});
});
