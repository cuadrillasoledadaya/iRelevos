// ══════════════════════════════════════════════════════════════════
// TESTS — rotacion.ts (matemáticas puras de rotación)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { objSalidas, calcularCiclo, tramosOptimos, analizar } from "./rotacion";
import type { Trabajadera, TramoSlot } from "../types";

function makeTrabajadera(
	nombres: string[],
	tramos: string[],
	salidas = 2,
	regla5costaleros = false,
): Trabajadera {
	return {
		id: 1,
		nombres,
		roles: nombres.map(() => ({ pri: "COR" as const, sec: "FIJ_I" as const })),
		salidas,
		tramos,
		bajas: [],
		regla5costaleros,
		plan: null,
		obj: null,
		analisis: null,
		pinned: null,
		puntuaciones: {},
		tramosClaves: [],
	};
}

describe("rotacion", () => {
	describe("objSalidas", () => {
		it("debería calcular salidas equitativas para costaleros estándar", () => {
			const resultado = objSalidas(7, 3, 2, false);
			expect(Object.keys(resultado)).toHaveLength(7);
			const F = 7 - 5; // 2
			const sumaTotal = Object.values(resultado).reduce(
				(sum, val) => sum + val,
				0,
			);
			expect(sumaTotal).toBe(3 * F); // 6
		});

		it("debería aplicar regla 5 cuando total = 5 y flag true", () => {
			const resultado = objSalidas(5, 2, 1, true);
			const sumaTotal = Object.values(resultado).reduce(
				(sum, val) => sum + val,
				0,
			);
			expect(sumaTotal).toBe(5 * 1); // 5
			Object.values(resultado).forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
		});

		it("debería manejar caso extremo: 1 costalero", () => {
			const resultado = objSalidas(1, 2, 1, false);
			expect(resultado[0]).toBe(2);
		});

		it("debería usar total * salidas con regla5 activa (no numTramos * salidas)", () => {
			const resultado = objSalidas(5, 10, 2, true);
			Object.values(resultado).forEach((v) => expect(v).toBe(2));
			const suma = Object.values(resultado).reduce((s, v) => s + v, 0);
			expect(suma).toBe(10);
		});

		it("debería distribuir equitativamente con regla5 y 3 salidas", () => {
			const resultado = objSalidas(5, 15, 3, true);
			Object.values(resultado).forEach((v) => expect(v).toBe(3));
			const suma = Object.values(resultado).reduce((s, v) => s + v, 0);
			expect(suma).toBe(15);
		});

		it("debería manejar regla5 con tramos no múltiplos exactos", () => {
			const resultado = objSalidas(5, 8, 2, true);
			const suma = Object.values(resultado).reduce((s, v) => s + v, 0);
			expect(suma).toBe(10);
			Object.values(resultado).forEach((v) => expect(v).toBe(2));
		});

		it("debería fallback para F <= 0 sin regla5", () => {
			const resultado = objSalidas(4, 6, 2, false);
			// F = 4 - 5 = -1 → fallback
			const suma = Object.values(resultado).reduce((s, v) => s + v, 0);
			expect(suma).toBe(6); // numTramos
		});
	});

	describe("calcularCiclo", () => {
		it("debería generar plan válido para trabajadera estándar", () => {
			const t = makeTrabajadera(
				["Juan", "Pedro", "Luis", "Ana", "María", "Sofía"],
				["Tramo 1", "Tramo 2", "Tramo 3"],
				2,
			);
			const resultado = calcularCiclo(t);
			expect(resultado.plan).toHaveLength(3);
			expect(resultado.objetivo).toBeDefined();
			resultado.plan.forEach((tramo) => {
				expect(tramo.dentro).toHaveLength(5);
				expect(tramo.fuera).toHaveLength(1);
			});
		});

		it("debería aplicar regla 5 con 5 costaleros", () => {
			const t = makeTrabajadera(
				["Juan", "Pedro", "Luis", "Ana", "María"],
				["Tramo 1", "Tramo 2"],
				1,
				true,
			);
			const resultado = calcularCiclo(t);
			expect(resultado.plan).toHaveLength(2);
			resultado.plan.forEach((tramo) => {
				expect(tramo.dentro).toHaveLength(4);
				expect(tramo.fuera).toHaveLength(1);
			});
		});

		it("debería retornar arrays vacíos para parámetros inválidos", () => {
			const t = makeTrabajadera(
				["Juan", "Pedro", "Luis", "Ana", "María"],
				[],
				2,
				false,
			);
			const resultado = calcularCiclo(t);
			expect(resultado.plan).toHaveLength(0);
			expect(resultado.objetivo).toEqual({});
		});

		it("debería retornar arrays vacíos cuando F <= 0", () => {
			const t = makeTrabajadera(
				["Juan", "Pedro", "Luis", "Ana"],
				["Tramo 1"],
				2,
				false,
			);
			const resultado = calcularCiclo(t);
			expect(resultado.plan).toHaveLength(0);
		});

		it("debería cubrir todos los costaleros en el plan", () => {
			const t = makeTrabajadera(
				["A", "B", "C", "D", "E", "F"],
				["T1", "T2", "T3"],
				2,
			);
			const { plan } = calcularCiclo(t);
			plan.forEach((tramo) => {
				const todos = [...tramo.dentro, ...tramo.fuera].sort();
				expect(todos).toEqual([0, 1, 2, 3, 4, 5]);
			});
		});
	});

	describe("tramosOptimos", () => {
		it("debería calcular tramos óptimos para estándar", () => {
			const resultado = tramosOptimos(6, 2);
			expect(resultado).toBeGreaterThan(0);
			expect(resultado).toBeLessThanOrEqual(6 * 3);
		});

		it("debería retornar total * salidas con regla5 y total = 5", () => {
			expect(tramosOptimos(5, 1, true)).toBe(5);
			expect(tramosOptimos(5, 2, true)).toBe(10);
			expect(tramosOptimos(5, 3, true)).toBe(15);
		});

		it("debería retornar 0 para casos inválidos (total < 5 sin regla5)", () => {
			expect(tramosOptimos(4, 2)).toBe(0);
			expect(tramosOptimos(5, 2, false)).toBe(0);
		});

		it("debería ser backward-compatible sin tercer parámetro", () => {
			expect(tramosOptimos(5, 2)).toBe(0);
		});

		it("debería ignorar regla5 cuando total != 5", () => {
			const conRegla = tramosOptimos(7, 3, true);
			const sinRegla = tramosOptimos(7, 3, false);
			expect(conRegla).toBe(sinRegla);
			expect(conRegla).toBeGreaterThan(0);
		});
	});

	describe("analizar", () => {
		it("debería validar plan correctamente contra objetivo", () => {
			const plan: TramoSlot[] = [
				{ dentro: [0, 1, 2, 3, 4], fuera: [5] },
				{ dentro: [0, 1, 2, 3, 5], fuera: [4] },
			];
			const obj = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 };
			const resultado = analizar(plan, 6, obj);
			expect(resultado.conteo).toEqual({
				0: 0,
				1: 0,
				2: 0,
				3: 0,
				4: 1,
				5: 1,
			});
			expect(resultado.okObj).toBe(true);
			expect(resultado.dentro5).toBe(true);
			expect(resultado.primer).toEqual([5]);
			expect(resultado.ultimo).toEqual([4]);
		});

		it("debería detectar violaciones de objetivo", () => {
			const plan: TramoSlot[] = [
				{ dentro: [0, 1, 2, 3, 4], fuera: [5] },
				{ dentro: [0, 1, 2, 3, 4], fuera: [5] },
			];
			const obj = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 };
			const resultado = analizar(plan, 6, obj);
			expect(resultado.okObj).toBe(false);
		});

		it("debería aplicar regla 5 en análisis (4 dentro esperado)", () => {
			const t = {
				id: 1,
				nombres: ["A", "B", "C", "D", "E"],
				regla5costaleros: true,
			} as Trabajadera;
			const plan: TramoSlot[] = [
				{ dentro: [0, 1, 2, 3], fuera: [4] },
				{ dentro: [0, 1, 2, 4], fuera: [3] },
			];
			const obj = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 };
			const resultado = analizar(plan, 5, obj, t);
			expect(resultado.dentro5).toBe(true);
		});

		it("debería detectar repeticiones entre primer y último tramo", () => {
			const plan: TramoSlot[] = [
				{ dentro: [1, 2, 3, 4, 5], fuera: [0] },
				{ dentro: [0, 2, 3, 4, 5], fuera: [1] },
				{ dentro: [1, 2, 3, 4, 5], fuera: [0] },
			];
			const obj = { 0: 2, 1: 1, 2: 0, 3: 0, 4: 0, 5: 0 };
			const resultado = analizar(plan, 6, obj);
			expect(resultado.rep).toContain(0);
			expect(resultado.primer).toEqual([0]);
			expect(resultado.ultimo).toEqual([0]);
		});

		it("debería contar consecutivos correctamente", () => {
			const plan: TramoSlot[] = [
				{ dentro: [1, 2, 3, 4, 5], fuera: [0] },
				{ dentro: [0, 2, 3, 4, 5], fuera: [1] },
				{ dentro: [0, 1, 3, 4, 5], fuera: [2] },
			];
			const obj = { 0: 1, 1: 1, 2: 1, 3: 0, 4: 0, 5: 0 };
			const resultado = analizar(plan, 6, obj);
			expect(resultado.cons).toBe(0);
		});

		it("debería manejar plan vacío", () => {
			const resultado = analizar([], 6, {});
			expect(resultado.conteo).toEqual({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
			expect(resultado.okObj).toBe(true);
			expect(resultado.dentro5).toBe(true);
			expect(resultado.primer).toEqual([]);
			expect(resultado.ultimo).toEqual([]);
			expect(resultado.rep).toEqual([]);
			expect(resultado.cons).toBe(0);
		});
	});
});
