// ══════════════════════════════════════════════════════════════════
// TESTS — sugerencias.ts (sugerencias de pin basadas en puntuaciones)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { generarSugerencias, aplicarSugerencias } from "./sugerencias";
import type { Trabajadera, PinState } from "../types";

function makeTrabajadera(
	nombres: string[],
	puntuaciones: Record<string, number> = {},
	tramosClaves: number[] = [],
	tramos: string[] = ["T1", "T2"],
	pinned: PinState[][] | null = null,
): Trabajadera {
	return {
		id: 1,
		nombres,
		roles: nombres.map(() => ({ pri: "COR" as const, sec: "FIJ_I" as const })),
		salidas: 2,
		tramos,
		bajas: [],
		regla5costaleros: false,
		plan: null,
		obj: null,
		analisis: null,
		pinned,
		puntuaciones,
		tramosClaves,
	};
}

describe("sugerencias", () => {
	describe("generarSugerencias", () => {
		it("debería generar top 3 con costaleros puntuados", () => {
			const t = makeTrabajadera(
				["Juan", "Pedro", "Luis", "Ana", "María", "Sofía"],
				{ Juan: 10, Pedro: 8, Luis: 5, Ana: 3, María: 1, Sofía: 0 },
				[0, 2],
				["T1", "T2", "T3"],
			);
			const resultado = generarSugerencias(t);
			expect(resultado.top3).toHaveLength(3);
			expect(resultado.top3[0].nombre).toBe("Juan");
			expect(resultado.top3[0].puntuacion).toBe(10);
			expect(resultado.top3[1].nombre).toBe("Pedro");
			expect(resultado.top3[1].puntuacion).toBe(8);
			expect(resultado.top3[2].nombre).toBe("Luis");
			expect(resultado.top3[2].puntuacion).toBe(5);
			expect(resultado.tramosClaves).toEqual([0, 2]);
			expect(resultado.ultimoIdx).toBe(2);
		});

		it("debería retornar top3 vacío sin puntuaciones positivas", () => {
			const t = makeTrabajadera(
				["Juan", "Pedro", "Luis"],
				{ Juan: 0, Pedro: 0, Luis: 0 },
				[],
				["T1", "T2"],
			);
			const resultado = generarSugerencias(t);
			expect(resultado.top3).toHaveLength(0);
			expect(resultado.tramosClaves).toEqual([]);
			expect(resultado.ultimoIdx).toBe(1);
		});

		it("debería manejar caso sin tramosClaves definido", () => {
			const t = makeTrabajadera(
				["Juan", "Pedro", "Luis"],
				{ Juan: 15, Pedro: 10, Luis: 5 },
				[],
				["T1"],
			);
			const resultado = generarSugerencias(t);
			expect(resultado.top3).toHaveLength(3);
			expect(resultado.tramosClaves).toEqual([]);
			expect(resultado.ultimoIdx).toBe(0);
		});

		it("debería filtrar solo puntuaciones > 0", () => {
			const t = makeTrabajadera(
				["A", "B", "C", "D"],
				{ A: 5, B: 0, C: 3, D: 0 },
			);
			const resultado = generarSugerencias(t);
			expect(resultado.top3).toHaveLength(2);
			expect(resultado.top3[0].nombre).toBe("A");
			expect(resultado.top3[1].nombre).toBe("C");
		});
	});

	describe("aplicarSugerencias", () => {
		it("debería aplicar pins D a los top 3 en tramos objetivo", () => {
			const t = makeTrabajadera(
				["Juan", "Pedro", "Luis", "Ana", "María"],
				{ Juan: 20, Pedro: 15, Luis: 10, Ana: 5, María: 1 },
				[0, 1],
				["T1", "T2"],
				[
					["L", "L", "L", "L", "L"],
					["L", "L", "L", "L", "L"],
				],
			);
			aplicarSugerencias(t);
			expect(t.pinned![0][0]).toBe("D"); // Juan en T1
			expect(t.pinned![0][1]).toBe("D"); // Pedro en T1
			expect(t.pinned![1][2]).toBe("D"); // Luis en T2 (ultimoIdx=1)
		});

		it("debería lanzar error sin puntuaciones positivas", () => {
			const t = makeTrabajadera(
				["Juan", "Pedro", "Luis"],
				{ Juan: 0, Pedro: 0, Luis: 0 },
				[],
				["T1"],
			);
			expect(() => aplicarSugerencias(t)).toThrow(
				"No hay ningún costalero con valoración asignada",
			);
		});

		it("debería limpiar pins D existentes antes de aplicar nuevos", () => {
			const t = makeTrabajadera(
				["Juan", "Pedro", "Luis", "Ana", "María"],
				{ Juan: 20, Pedro: 15, Luis: 10 },
				[0],
				["T1", "T2"],
				[
					["D", "D", "D", "L", "L"], // pins D existentes
					["L", "L", "L", "L", "L"],
				],
			);
			aplicarSugerencias(t);
			// Los pins D originales deben haberse limpiado y reemplazado
			expect(t.pinned![0][0]).toBe("D"); // Juan (top3)
			expect(t.pinned![0][1]).toBe("D"); // Pedro (top3)
			expect(t.pinned![0][2]).toBe("D"); // Luis (top3)
		});

		it("debería aplicar en tramosClaves + último tramo", () => {
			const t = makeTrabajadera(
				["A", "B", "C", "D", "E"],
				{ A: 10, B: 8, C: 5 },
				[0],
				["T1", "T2", "T3"],
				[
					["L", "L", "L", "L", "L"],
					["L", "L", "L", "L", "L"],
					["L", "L", "L", "L", "L"],
				],
			);
			aplicarSugerencias(t);
			// tramosClaves=[0] + ultimoIdx=2
			expect(t.pinned![0][0]).toBe("D"); // A en T1
			expect(t.pinned![2][0]).toBe("D"); // A en T3
			// T2 no debe tener pins aplicados
			expect(t.pinned![1][0]).toBe("L");
		});
	});
});
