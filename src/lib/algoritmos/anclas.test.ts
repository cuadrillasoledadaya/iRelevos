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
	crearEstadoInicial,
	aplicarRelevoIntermedio,
	transicionActiva,
	simularCicloConTipos,
	relevosATramoSlots,
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

describe("anclas — motor", () => {
	/**
	 * Plan golden de la working crew de 12 costaleros SIN anclas.
	 * Se congela aquí para detectar cualquier regresión del motor: si este
	 * array cambia, el comportamiento legacy se rompió.
	 */
	const PLAN_SIN_ANCLAS = [
		[0, 1, 2, 3, 4],
		[1, 2, 3, 4, 5],
		[6, 7, 8, 9, 10],
		[7, 8, 9, 10, 11],
		[0, 2, 3, 4, 5],
		[0, 1, 3, 4, 5],
		[6, 8, 9, 10, 11],
		[6, 7, 9, 10, 11],
		[0, 1, 2, 4, 5],
		[0, 1, 2, 3, 5],
		[6, 7, 8, 10, 11],
		[6, 7, 8, 9, 11],
	]

	it("sin anclas el plan es idéntico al de antes (golden)", () => {
		const t = makeAnclasT()
		const relevos = simularCicloConTipos(t, t.tramosTipo!, t.salidas)
		const plan = relevosATramoSlots(t, relevos)
		expect(plan.map((s) => s.dentro)).toEqual(PLAN_SIN_ANCLAS)
	})

	it("el estado inicial reserva las anclas (no entran al disp)", () => {
		const estado = crearEstadoInicial(
			{ a: ["c1", "c2", "c3", "c4", "c5", "c6"], b: ["c7"] },
			5,
			{ a: ["c6"], b: [] },
		)
		expect(estado.estados.A.anclas).toEqual(["c6"])
		expect(estado.estados.A.disponibles).toEqual([
			"c1",
			"c2",
			"c3",
			"c4",
			"c5",
		])
		expect(estado.estados.A.cargando).toEqual([])
	})

	it("el LOAD de una cuadrilla anclada deja 6 dentro (5 rotantes + ancla)", () => {
		const t = makeAnclasT({ anclas: { a: [5], b: [] } })
		const relevos = simularCicloConTipos(t, t.tramosTipo!, t.salidas)
		// Primer relevo = LOAD de la cuadrilla A (turnoInicial = 0)
		expect(relevos[0].cuadrilla).toBe("A")
		const plan = relevosATramoSlots(t, relevos)
		expect(plan[0].dentro).toEqual([0, 1, 2, 3, 4, 5])
		expect(plan[0].dentro.length).toBe(6)
	})

	it("el ancla nunca sale en ningún relevo", () => {
		const t = makeAnclasT({ anclas: { a: [5], b: [] } })
		const relevos = simularCicloConTipos(t, t.tramosTipo!, t.salidas)
		const nombreAncla = t.nombres[5]
		for (const r of relevos) {
			expect(r.sale).not.toContain(nombreAncla)
			expect(r.entra).not.toContain(nombreAncla)
		}
	})

	it("el ancla está dentro mientras su cuadrilla está activa y fuera en la otra", () => {
		const t = makeAnclasT({ anclas: { a: [5], b: [] } })
		const relevos = simularCicloConTipos(t, t.tramosTipo!, t.salidas)
		const plan = relevosATramoSlots(t, relevos)
		plan.forEach((slot, i) => {
			if (relevos[i].cuadrilla === "A") {
				expect(slot.dentro).toContain(5)
				expect(slot.fuera).not.toContain(5)
			} else {
				expect(slot.dentro).not.toContain(5)
				expect(slot.fuera).toContain(5)
			}
		})
	})

	it("al cambiar de cuadrilla las anclas no van al disp", () => {
		let estado = crearEstadoInicial(
			{ a: ["c1", "c2", "c3", "c4", "c5", "c6"], b: ["c7", "c8"] },
			5,
			{ a: ["c6"], b: [] },
		)
		estado = aplicarRelevoIntermedio(estado).estado
		expect(estado.estados.A.cargando).toEqual([
			"c1",
			"c2",
			"c3",
			"c4",
			"c5",
		])
		estado = transicionActiva(estado, "B")
		// El ancla NO está en el disp de A…
		expect(estado.estados.A.disponibles).not.toContain("c6")
		// …pero sigue siendo ancla de A.
		expect(estado.estados.A.anclas).toEqual(["c6"])
	})

	it("una ancla inválida aborta el cálculo con error tipado", () => {
		const t = makeAnclasT({ anclas: { a: [7], b: [] } })
		expect(() => simularCicloConTipos(t, t.tramosTipo!, t.salidas)).toThrowError(
			CuadrillaDobladaDistribucionInvalidaError,
		)
	})
})
