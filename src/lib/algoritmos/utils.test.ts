// ══════════════════════════════════════════════════════════════════
// TESTS — utils.ts
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { isGenericTramo } from "./utils";

describe("utils", () => {
	describe("isGenericTramo", () => {
		it("debería detectar tramos genéricos", () => {
			expect(isGenericTramo("Tramo 1 (T1)")).toBe(true);
			expect(isGenericTramo("Tramo 2 (T2)")).toBe(true);
			expect(isGenericTramo("Tramo 10 (T10)")).toBe(true);
			expect(isGenericTramo("Tramo 99 (T99)")).toBe(true);
		});

		it("debería retornar false para tramos con nombre propio", () => {
			expect(isGenericTramo("Calle Real")).toBe(false);
			expect(isGenericTramo("Plaza Mayor")).toBe(false);
			expect(isGenericTramo("Salida Iglesia")).toBe(false);
		});

		it("debería retornar false para formatos similares pero no exactos", () => {
			expect(isGenericTramo("Tramo 1")).toBe(false);
			expect(isGenericTramo("Tramo 1 T1")).toBe(false);
			expect(isGenericTramo("tramo 1 (T1)")).toBe(false);
			expect(isGenericTramo("Tramo 1 (T1) ")).toBe(false);
			expect(isGenericTramo(" Tramo 1 (T1)")).toBe(false);
		});

		it("debería retornar false para string vacío", () => {
			expect(isGenericTramo("")).toBe(false);
		});
	});
});
