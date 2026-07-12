// ══════════════════════════════════════════════════════════════════
// TESTS — pinned.ts (gestión de pins)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import {
	getPinned,
	countPinned,
	validarPinned,
	completarAuto,
	getFueraPorTramo,
	getF,
} from "./pinned";
import type { Trabajadera, PinState } from "../types";

function makeTrabajadera(
	nombres: string[],
	tramos: string[],
	pinned: PinState[][] | null = null,
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
		pinned,
		puntuaciones: {},
		tramosClaves: [],
	};
}

describe("pinned", () => {
	describe("getPinned", () => {
		it("debería inicializar pinned si es null", () => {
			const t = makeTrabajadera(["A", "B", "C"], ["T1", "T2"], null);
			const p = getPinned(t);
			expect(p).toHaveLength(2);
			expect(p[0]).toHaveLength(3);
			expect(p[0][0]).toBe("L");
		});

		it("debería ajustar pinned al número de tramos", () => {
			const t = makeTrabajadera(
				["A", "B"],
				["T1", "T2", "T3"],
				[
					["L", "L"],
					["L", "L"],
				],
			);
			const p = getPinned(t);
			expect(p).toHaveLength(3);
		});

		it("debería ajustar pinned al número de nombres", () => {
			const t = makeTrabajadera(
				["A", "B", "C"],
				["T1"],
				[["L", "L"]],
			);
			const p = getPinned(t);
			expect(p[0]).toHaveLength(3);
		});

		it("debería truncar pinned si excede tramos", () => {
			const t = makeTrabajadera(
				["A", "B"],
				["T1"],
				[
					["L", "L"],
					["L", "L"],
					["L", "L"],
				],
			);
			const p = getPinned(t);
			expect(p).toHaveLength(1);
		});
	});

	describe("countPinned", () => {
		it("debería contar pinned states correctamente", () => {
			const t = makeTrabajadera(
				["A", "B", "C", "D", "E"],
				["T1", "T2"],
				[
					["D", "F", "L", "D", "L"],
					["L", "LF", "L", "D", "F"],
				],
			);
			const resultado = countPinned(t);
			expect(resultado.d).toBe(3);
			expect(resultado.f).toBe(3);
			expect(resultado.total).toBe(6);
		});

		it("debería manejar caso sin pinned states", () => {
			const t = makeTrabajadera(["A", "B"], ["T1"], null);
			const resultado = countPinned(t);
			expect(resultado.d).toBe(0);
			expect(resultado.f).toBe(0);
			expect(resultado.total).toBe(0);
		});
	});

	describe("validarPinned", () => {
		it("debería retornar errores si hay más de 5 fijados dentro", () => {
			const t = makeTrabajadera(
				["A", "B", "C", "D", "E", "F"],
				["T1"],
				[["D", "D", "D", "D", "D", "D"]],
			);
			const errs = validarPinned(t);
			expect(errs.length).toBeGreaterThan(0);
			expect(errs[0]).toContain("máx. 5");
		});

		it("debería retornar errores si hay más fijados fuera que F", () => {
			const t = makeTrabajadera(
				["A", "B", "C", "D", "E", "F"],
				["T1"],
				[["F", "F", "L", "L", "L", "L"]],
			);
			const errs = validarPinned(t);
			expect(errs.length).toBeGreaterThan(0);
			expect(errs[0]).toContain("fijados fuera");
		});

		it("debería retornar array vacío para pinned válido", () => {
			const t = makeTrabajadera(
				["A", "B", "C", "D", "E", "F"],
				["T1"],
				[["D", "D", "L", "L", "L", "F"]],
			);
			const errs = validarPinned(t);
			expect(errs).toEqual([]);
		});
	});

	describe("completarAuto", () => {
		it("debería generar plan con pinned states válidos", () => {
			const t = makeTrabajadera(
				["Juan", "Pedro", "Luis", "Ana", "María", "Sofía"],
				["T1", "T2", "T3"],
				[
					["D", "D", "L", "L", "L", "L"],
					["L", "L", "D", "L", "L", "L"],
					["L", "L", "L", "D", "D", "L"],
				],
				2,
			);
			const resultado = completarAuto(t);
			expect("error" in resultado).toBe(false);
			if (!("error" in resultado)) {
				expect(resultado.plan).toHaveLength(3);
				expect(resultado.plan[0].dentro).toContain(0);
				expect(resultado.plan[0].dentro).toContain(1);
				expect(resultado.plan[1].dentro).toContain(2);
				expect(resultado.plan[2].dentro).toContain(3);
				expect(resultado.plan[2].dentro).toContain(4);
			}
		});

		it("debería reportar errores con pinned inválido", () => {
			const t = makeTrabajadera(
				["A", "B", "C", "D", "E", "F"],
				["T1"],
				[["D", "D", "D", "D", "D", "D"]],
			);
			const resultado = completarAuto(t);
			expect("error" in resultado).toBe(true);
			if ("error" in resultado) {
				expect(resultado.error.length).toBeGreaterThan(0);
			}
		});

		it("debería funcionar sin pinned states", () => {
			const t = makeTrabajadera(
				["A", "B", "C", "D", "E", "F"],
				["T1", "T2"],
				null,
			);
			const resultado = completarAuto(t);
			expect("error" in resultado).toBe(false);
			if (!("error" in resultado)) {
				expect(resultado.plan).toHaveLength(2);
			}
		});
	});

	describe("getFueraPorTramo", () => {
		it("debería retornar total - 5 para estándar", () => {
			const t = makeTrabajadera(
				["A", "B", "C", "D", "E", "F"],
				["T1"],
			);
			expect(getFueraPorTramo(t)).toBe(1);
		});

		it("debería retornar 1 para regla 5", () => {
			const t = makeTrabajadera(
				["A", "B", "C", "D", "E"],
				["T1"],
				null,
				1,
				true,
			);
			expect(getFueraPorTramo(t)).toBe(1);
		});

		it("debería retornar 2 para 7 costaleros", () => {
			const t = makeTrabajadera(
				["A", "B", "C", "D", "E", "F", "G"],
				["T1"],
			);
			expect(getFueraPorTramo(t)).toBe(2);
		});
	});

	describe("getF (REQ-PLANPREC-3)", () => {
		it("debería retornar 0 con 6 nombres y 1 baja", () => {
			const t = makeTrabajadera(
				["A", "B", "C", "D", "E", "F"],
				["T1"],
				null,
				2,
				false,
			);
			t.bajas = [0];
			expect(getF(t)).toBe(0);
		});

		it("debería retornar 1 con 6 nombres y 0 bajas", () => {
			const t = makeTrabajadera(
				["A", "B", "C", "D", "E", "F"],
				["T1"],
			);
			expect(getF(t)).toBe(1);
		});

		it("debería retornar 1 para regla5 (5 nombres, 0 bajas)", () => {
			const t = makeTrabajadera(
				["A", "B", "C", "D", "E"],
				["T1"],
				null,
				1,
				true,
			);
			expect(getF(t)).toBe(1);
		});
	});
});
