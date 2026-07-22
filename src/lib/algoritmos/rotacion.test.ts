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

		it("delegates to cuadrilla doblada when flag is true and n >= 10", () => {
			const t = makeTrabajadera(
				Array.from({ length: 12 }, (_, i) => `c${i + 1}`),
				["T1", "T2", "T3"],
			);
			t.cuadrillaDoblada = true;
			t.distribucionCuadrillas = {
				a: [0, 1, 2, 3, 4, 5],
				b: [6, 7, 8, 9, 10, 11],
			};
			const result = calcularCiclo(t);
			expect(result.plan.length).toBeGreaterThan(0);
			result.plan.forEach((slot) => {
				expect(slot.dentro).toHaveLength(5);
				expect(slot.fuera).toHaveLength(7);
			});
		});

		it("falls back to standard path when flag is true but n < 10", () => {
			const t = makeTrabajadera(
				["A", "B", "C", "D", "E", "F", "G", "H"],
				["T1", "T2", "T3"],
			);
			t.cuadrillaDoblada = true;
			const result = calcularCiclo(t);
			// Standard path: 8 nombres, F=3, 3 tramos
			expect(result.plan.length).toBe(3);
			result.plan.forEach((slot) => {
				expect(slot.dentro).toHaveLength(5);
				expect(slot.fuera).toHaveLength(3);
			});
		});

		it("standard path preserved when flag is absent", () => {
			const t = makeTrabajadera(
				["A", "B", "C", "D", "E", "F"],
				["T1", "T2", "T3"],
			);
			// cuadrillaDoblada is undefined
			const result = calcularCiclo(t);
			expect(result.plan).toHaveLength(3);
			result.plan.forEach((slot) => {
				expect(slot.dentro).toHaveLength(5);
				expect(slot.fuera).toHaveLength(1);
			});
		});

		it("per-tramo dispatch when cuadrillaDoblada + tramosTipo present", () => {
			const t = makeTrabajadera(
				Array.from({ length: 12 }, (_, i) => `c${i + 1}`),
				["T1", "T2", "T3"],
				1, // salidas=1 to keep this test focused on dispatch, not multi-salida
			);
			t.cuadrillaDoblada = true;
			t.tramosTipo = ["primario", "secundario", "primario"];
			t.distribucionCuadrillas = {
				a: [0, 1, 2, 3, 4, 5],
				b: [6, 7, 8, 9, 10, 11],
			};
			const result = calcularCiclo(t);
			expect(result.plan).toHaveLength(3);
			result.plan.forEach((slot) => {
				expect(slot.dentro).toHaveLength(5);
				expect(slot.fuera).toHaveLength(7);
			});
		});

		it("legacy fallback when cuadrillaDoblada but no tramosTipo", () => {
			const t = makeTrabajadera(
				Array.from({ length: 12 }, (_, i) => `c${i + 1}`),
				["T1", "T2", "T3"],
			);
			t.cuadrillaDoblada = true;
			// No tramosTipo — should use legacy path
			t.distribucionCuadrillas = {
				a: [0, 1, 2, 3, 4, 5],
				b: [6, 7, 8, 9, 10, 11],
			};
			const result = calcularCiclo(t);
			expect(result.plan.length).toBeGreaterThan(0);
			result.plan.forEach((slot) => {
				expect(slot.dentro).toHaveLength(5);
				expect(slot.fuera).toHaveLength(7);
			});
		});

		it("all-secundario tramosTipo returns empty plan (no primario)", () => {
			const t = makeTrabajadera(
				Array.from({ length: 12 }, (_, i) => `c${i + 1}`),
				["T1", "T2", "T3"],
			);
			t.cuadrillaDoblada = true;
			t.tramosTipo = ["secundario", "secundario", "secundario"];
			t.distribucionCuadrillas = {
				a: [0, 1, 2, 3, 4, 5],
				b: [6, 7, 8, 9, 10, 11],
			};
			const result = calcularCiclo(t);
			expect(result.plan).toEqual([]);
			expect(result.objetivo).toEqual({});
		});

		// ══════════════════════════════════════════════════════════════
		// Multi-salida integration (bug fix v1.2.87)
		// calcularCiclo must pass t.salidas to simularCicloConTipos so
		// the plan has S*numTramos slots covering all salidas. Otherwise
		// the capataz repeats the same plan for salida 2.
		// ══════════════════════════════════════════════════════════════

		it("cuadrilla doblada with salidas=2 produces 2*numTramos plan slots", () => {
			const t = makeTrabajadera(
				Array.from({ length: 12 }, (_, i) => `c${i + 1}`),
				["T1", "T2", "T3", "T4"],
				2, // salidas
			);
			t.cuadrillaDoblada = true;
			t.tramosTipo = ["primario", "secundario", "secundario", "primario"];
			t.distribucionCuadrillas = {
				a: [0, 1, 2, 3, 4, 5],
				b: [6, 7, 8, 9, 10, 11],
			};
			const { plan } = calcularCiclo(t);
			expect(plan).toHaveLength(8); // 2 salidas × 4 tramos
			plan.forEach((s) => {
				expect(s.dentro).toHaveLength(5);
				expect(s.fuera).toHaveLength(7);
			});
		});

		it("cuadrilla doblada with salidas=1 still produces numTramos plan slots (backward compat)", () => {
			const t = makeTrabajadera(
				Array.from({ length: 12 }, (_, i) => `c${i + 1}`),
				["T1", "T2", "T3", "T4"],
				1, // salidas
			);
			t.cuadrillaDoblada = true;
			t.tramosTipo = ["primario", "secundario", "secundario", "primario"];
			t.distribucionCuadrillas = {
				a: [0, 1, 2, 3, 4, 5],
				b: [6, 7, 8, 9, 10, 11],
			};
			const { plan } = calcularCiclo(t);
			expect(plan).toHaveLength(4); // 1 salida × 4 tramos
		});

		it("cuadrilla doblada salida 2 S swap differs from salida 1 (rotation actually advances)", () => {
			// Con [P,S,S,P] × 2 con 12 costaleros: la S en salida 1 (T2) y
			// la S en salida 2 (T6) NO deben proponer el mismo swap
			// porque el estado de la cuadrilla activa cambió entremedio.
			const t = makeTrabajadera(
				Array.from({ length: 12 }, (_, i) => `c${i + 1}`),
				["T1", "T2", "T3", "T4"],
				2,
			);
			t.cuadrillaDoblada = true;
			t.tramosTipo = ["primario", "secundario", "secundario", "primario"];
			t.distribucionCuadrillas = {
				a: [0, 1, 2, 3, 4, 5],
				b: [6, 7, 8, 9, 10, 11],
			};
			const { plan } = calcularCiclo(t);
			expect(plan).toHaveLength(8);
			// Salida 1 T2 (S) y Salida 2 T6 (S): el swap debe ser distinto
			// (al menos uno de los 5 dentro cambió)
			const salida1S = [...plan[1].dentro].sort((a, b) => a - b);
			const salida2S = [...plan[5].dentro].sort((a, b) => a - b);
			expect(salida1S).not.toEqual(salida2S);
		});

		// ══════════════════════════════════════════════════════════════
		// Alternating P/S pattern integration (bug fix v1.2.88)
		// Before: aplicarRelevoPrincipal reset the disp queue to original
		// order, so in alternating P/S patterns the S swap of B always
		// SALE'd c7. User reported: "in the secondary tramos of B, c7
		// always comes out in T2 and T6". After: disp = [sale, ...disp]
		// persists the rotation, so c7 SALE in T2 and c8 SALE in T6.
		// ══════════════════════════════════════════════════════════════

		it("alternating P/S pattern: c7 SALEs in T2 but NOT in T6 (rotation advances)", () => {
			const t = makeTrabajadera(
				Array.from({ length: 12 }, (_, i) => `c${i + 1}`),
				["T1", "T2", "T3", "T4", "T5", "T6"],
				1, // single salida to focus on the alternation
			);
			t.cuadrillaDoblada = true;
			t.tramosTipo = ["primario", "secundario", "primario", "secundario", "primario", "secundario"];
			t.distribucionCuadrillas = {
				a: [0, 1, 2, 3, 4, 5],
				b: [6, 7, 8, 9, 10, 11],
			};
			const { plan } = calcularCiclo(t);
			expect(plan).toHaveLength(6);
			// T2 (S de B) — c7 SALE → c7 está en F
			expect(plan[1].fuera).toContain(6); // c7 (idx 6) in F
			// T4 (S de A) — c1 SALE → c1 está en F
			expect(plan[3].fuera).toContain(0); // c1 (idx 0) in F
			// T6 (S de B) — c8 SALE (rotación avanza) → c8 en F, c7 NO en F
			expect(plan[5].fuera).toContain(7); // c8 (idx 7) in F
			expect(plan[5].fuera).not.toContain(6); // c7 NOT in F
		});

		// ══════════════════════════════════════════════════════════════
		// B3 — "No hay disponibles": si una cuadrilla tiene exactamente
		// ANCHO miembros (sin disp), un S swap sobre ella debe ser
		// capturado y devuelto como error claro por calcularCiclo.
		// Antes: el error se propagaba sin manejo, rompiendo la app.
		// ══════════════════════════════════════════════════════════════

		it("S sobre cuadrilla sin disp: calcularCiclo devuelve error claro (no throw)", () => {
			// 10 costaleros, distribución 5/5. Cada cuadrilla tiene 5
			// miembros exactos = ANCHO. Después del primer P, B queda con
			// cargando=5, disp=0. Un S sobre B falla — el dispatcher
			// debe capturar y devolver un error en lugar de throw.
			const t = makeTrabajadera(
				Array.from({ length: 10 }, (_, i) => `c${i + 1}`),
				["T1", "T2"],
				1, // single salida
			);
			t.cuadrillaDoblada = true;
			t.tramosTipo = ["primario", "secundario"]; // T1 P, T2 S — B sin disp
			t.distribucionCuadrillas = {
				a: [0, 1, 2, 3, 4],
				b: [5, 6, 7, 8, 9],
			};
			// calcularCiclo debe devolver { plan: [], objetivo: {}, error: ... }
			// en lugar de throw (que rompería el forEach en calcularTodo).
			const result = calcularCiclo(t);
			expect(result.error).toBeDefined();
			expect(result.error).toMatch(/disponibles|intermedio|secundario/i);
			expect(result.plan).toEqual([]);
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
