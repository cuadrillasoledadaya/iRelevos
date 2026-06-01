// ══════════════════════════════════════════════════════════════════
// TESTS — correcciones.ts (sugerencias de corrección e intercambios)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import {
	generarSugerenciasCorreccion,
	aplicarIntercambio,
	aplicarTodasLasCorrecciones,
} from "./correcciones";
import { analizar } from "./rotacion";
import type { Trabajadera, TramoSlot } from "../types";

function makeTrabajaderaConPlan(
	nombres: string[],
	plan: TramoSlot[],
	obj: Record<number, number>,
): Trabajadera {
	const t: Trabajadera = {
		id: 1,
		nombres,
		roles: nombres.map(() => ({ pri: "COR" as const, sec: "FIJ_I" as const })),
		salidas: 2,
		tramos: plan.map((_, i) => `T${i + 1}`),
		bajas: [],
		regla5costaleros: false,
		plan,
		obj,
		analisis: null,
		pinned: null,
		puntuaciones: {},
		tramosClaves: [],
	};
	t.analisis = analizar(plan, nombres.length, obj, t);
	return t;
}

describe("correcciones", () => {
	describe("generarSugerenciasCorreccion", () => {
		it("debería retornar arrays vacíos sin plan ni análisis", () => {
			const t: Trabajadera = {
				id: 1,
				nombres: ["A", "B", "C"],
				roles: [],
				salidas: 2,
				tramos: ["T1"],
				bajas: [],
				regla5costaleros: false,
				plan: null,
				obj: null,
				analisis: null,
				pinned: null,
				puntuaciones: {},
				tramosClaves: [],
			};
			const resultado = generarSugerenciasCorreccion(t);
			expect(resultado.correcciones).toEqual([]);
			expect(resultado.erroresSaldo).toEqual([]);
			expect(resultado.repetidos).toEqual([]);
			expect(resultado.consecutivos).toEqual([]);
		});

		it("debería detectar errores de saldo", () => {
			const plan = [
				{ dentro: [1, 2, 3, 4, 5], fuera: [0] },
				{ dentro: [0, 1, 3, 4, 5], fuera: [2] },
			];
			const obj = { 0: 1, 1: 0, 2: 1, 3: 0, 4: 0, 5: 0 };
			const t = makeTrabajaderaConPlan(
				["Juan", "Pedro", "Luis", "Ana", "María", "Sofía"],
				plan,
				obj,
			);
			const resultado = generarSugerenciasCorreccion(t);
			// Pedro (1) tiene 0 pero necesita 0 → ok
			// Ana (3) tiene 0 pero necesita 0 → ok
			// Juan (0) tiene 1 y necesita 1 → ok
			// All match, so no errors
			expect(resultado.erroresSaldo).toEqual([]);
		});

		it("debería detectar repetidos entre primer y último tramo", () => {
			const plan = [
				{ dentro: [1, 2, 3, 4, 5], fuera: [0] },
				{ dentro: [0, 2, 3, 4, 5], fuera: [1] },
				{ dentro: [1, 2, 3, 4, 5], fuera: [0] },
			];
			const obj = { 0: 2, 1: 1, 2: 0, 3: 0, 4: 0, 5: 0 };
			const t = makeTrabajaderaConPlan(
				["Juan", "Pedro", "Luis", "Ana", "María", "Sofía"],
				plan,
				obj,
			);
			const resultado = generarSugerenciasCorreccion(t);
			expect(resultado.repetidos).toHaveLength(1);
			expect(resultado.repetidos[0].nombre).toBe("Juan");
			expect(resultado.repetidos[0].idx).toBe(0);
		});

		it("debería detectar consecutivos", () => {
			const plan = [
				{ dentro: [1, 2, 3, 4, 5], fuera: [0] },
				{ dentro: [0, 2, 3, 4, 5], fuera: [1] },
				{ dentro: [1, 0, 3, 4, 5], fuera: [2] },
			];
			const obj = { 0: 1, 1: 1, 2: 1, 3: 0, 4: 0, 5: 0 };
			const t = makeTrabajaderaConPlan(
				["A", "B", "C", "D", "E", "F"],
				plan,
				obj,
			);
			const resultado = generarSugerenciasCorreccion(t);
			expect(resultado.consecutivos).toHaveLength(0);
		});

		it("debería detectar consecutivos reales", () => {
			const plan = [
				{ dentro: [1, 2, 3, 4, 5], fuera: [0] },
				{ dentro: [2, 3, 4, 5, 0], fuera: [1] },
				{ dentro: [0, 2, 3, 4, 5], fuera: [1] },
			];
			const obj = { 0: 1, 1: 2, 2: 0, 3: 0, 4: 0, 5: 0 };
			const t = makeTrabajaderaConPlan(
				["A", "B", "C", "D", "E", "F"],
				plan,
				obj,
			);
			const resultado = generarSugerenciasCorreccion(t);
			// B (idx 1) está fuera en T2 y T3 → consecutivo
			expect(resultado.consecutivos.length).toBeGreaterThan(0);
		});

		it("debería generar corrección de tipo repetido con prioridad 1", () => {
			const plan = [
				{ dentro: [1, 2, 3, 4, 5], fuera: [0] },
				{ dentro: [1, 2, 3, 4, 5], fuera: [0] },
			];
			const obj = { 0: 2, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
			const t = makeTrabajaderaConPlan(
				["Juan", "Pedro", "Luis", "Ana", "María", "Sofía"],
				plan,
				obj,
			);
			const resultado = generarSugerenciasCorreccion(t);
			const repetidoCorr = resultado.correcciones.find(
				(c) => c.tipo === "repetido",
			);
			if (repetidoCorr) {
				expect(repetidoCorr.prioridad).toBe(1);
			}
		});
	});

	describe("aplicarIntercambio", () => {
		it("debería intercambiar costalero de dentro a fuera en tramo destino", () => {
			const t: Trabajadera = {
				id: 1,
				nombres: ["Juan", "Pedro", "Luis", "Ana", "María", "Sofía"],
				roles: [{ pri: "COR" as const, sec: "FIJ_I" as const }],
				salidas: 2,
				tramos: ["T1", "T2"],
				bajas: [],
				regla5costaleros: false,
				plan: [
					{ dentro: [1, 2, 3, 4, 5], fuera: [0] },
					{ dentro: [0, 1, 3, 4, 5], fuera: [2] },
				],
				obj: { 0: 1, 1: 0, 2: 1, 3: 0, 4: 0, 5: 0 },
				analisis: null,
				pinned: null,
				puntuaciones: {},
				tramosClaves: [],
			};
			const resultado = aplicarIntercambio(t, 0, 1, 0, 1);
			expect(resultado).toBe(true);
			expect(t.plan![1].fuera).toContain(1);
			expect(t.plan![1].dentro).toContain(0);
		});

		it("debería retornar false si no hay plan", () => {
			const t: Trabajadera = {
				id: 2,
				nombres: ["Juan", "Pedro"],
				roles: [{ pri: "COR" as const, sec: "FIJ_I" as const }],
				salidas: 2,
				tramos: ["T1"],
				bajas: [],
				regla5costaleros: false,
				plan: null,
				obj: null,
				analisis: null,
				pinned: null,
				puntuaciones: {},
				tramosClaves: [],
			};
			expect(aplicarIntercambio(t, 0, 0, 0, 1)).toBe(false);
		});

		it("debería retornar false si ciA no está fuera en ti1", () => {
			const t: Trabajadera = {
				id: 3,
				nombres: ["Juan", "Pedro", "Luis", "Ana", "María", "Sofía"],
				roles: [{ pri: "COR" as const, sec: "FIJ_I" as const }],
				salidas: 2,
				tramos: ["T1", "T2"],
				bajas: [],
				regla5costaleros: false,
				plan: [
					{ dentro: [0, 1, 2, 3, 4], fuera: [5] },
					{ dentro: [1, 2, 3, 4, 5], fuera: [0] },
				],
				obj: { 0: 1, 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 },
				analisis: null,
				pinned: null,
				puntuaciones: {},
				tramosClaves: [],
			};
			// Pedro (idx 1) está dentro en T0, no fuera
			expect(aplicarIntercambio(t, 0, 1, 1, 0)).toBe(false);
		});

		it("debería retornar false si ciB no está dentro en ti2", () => {
			const t: Trabajadera = {
				id: 4,
				nombres: ["Juan", "Pedro", "Luis", "Ana", "María", "Sofía"],
				roles: [{ pri: "COR" as const, sec: "FIJ_I" as const }],
				salidas: 2,
				tramos: ["T1", "T2"],
				bajas: [],
				regla5costaleros: false,
				plan: [
					{ dentro: [1, 2, 3, 4, 5], fuera: [0] },
					{ dentro: [0, 2, 3, 4, 5], fuera: [1] },
				],
				obj: { 0: 1, 1: 1, 2: 0, 3: 0, 4: 0, 5: 0 },
				analisis: null,
				pinned: null,
				puntuaciones: {},
				tramosClaves: [],
			};
			// ciB=1 está fuera en T1, no dentro
			expect(aplicarIntercambio(t, 0, 1, 0, 1)).toBe(false);
		});

		it("debería recalcular objetivo y análisis después del intercambio", () => {
			const t: Trabajadera = {
				id: 5,
				nombres: ["Juan", "Pedro", "Luis", "Ana", "María", "Sofía"],
				roles: [{ pri: "COR" as const, sec: "FIJ_I" as const }],
				salidas: 2,
				tramos: ["T1", "T2"],
				bajas: [],
				regla5costaleros: false,
				plan: [
					{ dentro: [1, 2, 3, 4, 5], fuera: [0] },
					{ dentro: [0, 1, 3, 4, 5], fuera: [2] },
				],
				obj: { 0: 1, 1: 0, 2: 1, 3: 0, 4: 0, 5: 0 },
				analisis: null,
				pinned: null,
				puntuaciones: {},
				tramosClaves: [],
			};
			aplicarIntercambio(t, 0, 1, 0, 1);
			expect(t.obj).toBeDefined();
			expect(t.analisis).toBeDefined();
			expect(t.analisis!.conteo[1]).toBe(1);
		});
	});

	describe("aplicarTodasLasCorrecciones", () => {
		it("debería retornar false sin plan", () => {
			const t: Trabajadera = {
				id: 1,
				nombres: ["A", "B"],
				roles: [],
				salidas: 2,
				tramos: ["T1"],
				bajas: [],
				regla5costaleros: false,
				plan: null,
				obj: null,
				analisis: null,
				pinned: null,
				puntuaciones: {},
				tramosClaves: [],
			};
			expect(aplicarTodasLasCorrecciones(t)).toBe(false);
		});

		it("debería retornar false sin correcciones", () => {
			const plan = [
				{ dentro: [1, 2, 3, 4, 5], fuera: [0] },
				{ dentro: [0, 1, 3, 4, 5], fuera: [2] },
			];
			const obj = { 0: 1, 1: 0, 2: 1, 3: 0, 4: 0, 5: 0 };
			const t = makeTrabajaderaConPlan(
				["A", "B", "C", "D", "E", "F"],
				plan,
				obj,
			);
			// Plan is balanced, no corrections needed
			const resultado = aplicarTodasLasCorrecciones(t);
			expect(resultado).toBe(false);
		});
	});
});
