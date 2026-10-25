// ══════════════════════════════════════════════════════════════════
// TESTS — Anclas (v1.5.0)
// Costaleros que el capataz marca como "ancla": permanecen dentro del
// puesto de carga de su cuadrilla y nunca rotan fuera.
//
// El fichero agrupa los tests de la feature (algoritmo + store + UI) para
// que el diff sea revisable de un tirón.
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import type { Trabajadera } from "../types"
import {
	validarAnclas,
	CuadrillaDobladaDistribucionInvalidaError,
} from "./cuadrillaDoblada"

/**
 * Working crew de 12 costaleros con cuadrilla doblada y distribución
 * A = [0..5], B = [6..11] (el caso real del capataz).
 */
export function makeAnclasT(over: Partial<Trabajadera> = {}): Trabajadera {
	const n = 12
	const nombres = Array.from({ length: n }, (_, i) => `C${i + 1}`)
	return {
		id: 1,
		nombres,
		roles: nombres.map(() => ({ pri: "COR" as const, sec: "FIJ_I" as const })),
		salidas: 1,
		tramos: Array.from({ length: 12 }, (_, i) => `Tramo ${i + 1}`),
		tramosTipo: Array.from({ length: 12 }, () => "primario" as const),
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
		...over,
	}
}

describe("anclas — validación", () => {
	it("acepta una working crew sin anclas", () => {
		expect(() => validarAnclas(makeAnclasT())).not.toThrow()
	})

	it("acepta anclas vacías explícitas", () => {
		expect(() =>
			validarAnclas(makeAnclasT({ anclas: { a: [], b: [] } })),
		).not.toThrow()
	})

	it("acepta un ancla válida en A y otra en B", () => {
		expect(() =>
			validarAnclas(makeAnclasT({ anclas: { a: [5], b: [7] } })),
		).not.toThrow()
	})

	it("rechaza un índice fuera de rango", () => {
		expect(() =>
			validarAnclas(makeAnclasT({ anclas: { a: [99], b: [] } })),
		).toThrowError(CuadrillaDobladaDistribucionInvalidaError)
		try {
			validarAnclas(makeAnclasT({ anclas: { a: [99], b: [] } }))
		} catch (err) {
			expect((err as CuadrillaDobladaDistribucionInvalidaError).motivo).toBe(
				"ancla_fuera_de_rango",
			)
			expect((err as CuadrillaDobladaDistribucionInvalidaError).indice).toBe(99)
		}
	})

	it("rechaza índices duplicados en la misma cuadrilla", () => {
		try {
			validarAnclas(makeAnclasT({ anclas: { a: [2, 2], b: [] } }))
			throw new Error("debería haber lanzado")
		} catch (err) {
			expect(err).toBeInstanceOf(CuadrillaDobladaDistribucionInvalidaError)
			expect((err as CuadrillaDobladaDistribucionInvalidaError).motivo).toBe(
				"ancla_duplicada",
			)
		}
	})

	it("rechaza el mismo índice en A y en B", () => {
		try {
			validarAnclas(makeAnclasT({ anclas: { a: [3], b: [3] } }))
			throw new Error("debería haber lanzado")
		} catch (err) {
			expect(err).toBeInstanceOf(CuadrillaDobladaDistribucionInvalidaError)
			expect((err as CuadrillaDobladaDistribucionInvalidaError).motivo).toBe(
				"ancla_overlap",
			)
		}
	})

	it("rechaza un ancla que no pertenece a su cuadrilla", () => {
		try {
			validarAnclas(makeAnclasT({ anclas: { a: [7], b: [] } }))
			throw new Error("debería haber lanzado")
		} catch (err) {
			expect(err).toBeInstanceOf(CuadrillaDobladaDistribucionInvalidaError)
			expect((err as CuadrillaDobladaDistribucionInvalidaError).motivo).toBe(
				"ancla_fuera_de_cuadrilla",
			)
		}
	})

	it("rechaza un ancla que está de baja", () => {
		try {
			validarAnclas(
				makeAnclasT({ anclas: { a: [3], b: [] }, bajas: [3] }),
			)
			throw new Error("debería haber lanzado")
		} catch (err) {
			expect(err).toBeInstanceOf(CuadrillaDobladaDistribucionInvalidaError)
			expect((err as CuadrillaDobladaDistribucionInvalidaError).motivo).toBe(
				"ancla_baja",
			)
		}
	})

	it("no valida la pertenencia a la cuadrilla si no hay distribución", () => {
		expect(() =>
			validarAnclas(
				makeAnclasT({
					distribucionCuadrillas: null,
					anclas: { a: [5], b: [] },
				}),
			),
		).not.toThrow()
	})
})
