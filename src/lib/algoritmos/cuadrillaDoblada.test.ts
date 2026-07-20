// ══════════════════════════════════════════════════════════════════
// TESTS — cuadrillaDoblada.ts
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import {
	ANCHO_TRABAJADERA,
	UMBRAL_DOBLADO,
	puedeDoblarse,
	requiereDecisionDoblado,
	sugerirDistribucion,
	agruparEnCuadrillas,
	crearEstadoInicial,
	aplicarRelevoPrincipal,
	aplicarRelevoIntermedio,
	simularCicloCompleto,
	cuadrillaDobladaATramoSlots,
	type EstadoPlan,
} from "./cuadrillaDoblada"
import type { Trabajadera } from "../types"

const nombres = (n: number): string[] =>
	Array.from({ length: n }, (_, i) => `c${i + 1}`)

// Helper: devuelve un estado con A activa y cargando (los primeros 5 de su
// distribución). Para llegar ahí: estado inicial → A→B → intermedios de B → B→A.
function setupACargando(aSize: number, bSize: number): EstadoPlan {
	let estado = crearEstadoInicial({ a: nombres(aSize), b: nombres(bSize) })
	estado = aplicarRelevoPrincipal(estado).estado // A → B
	for (let i = 0; i < bSize - 5; i++) {
		estado = aplicarRelevoIntermedio(estado).estado
	}
	estado = aplicarRelevoPrincipal(estado).estado // B → A
	return estado
}

describe("cuadrillaDoblada", () => {
	describe("constantes", () => {
		it("ANCHO_TRABAJADERA es 5", () => {
			expect(ANCHO_TRABAJADERA).toBe(5)
		})
		it("UMBRAL_DOBLADO es 10", () => {
			expect(UMBRAL_DOBLADO).toBe(10)
		})
	})

	describe("puedeDoblarse", () => {
		it("debería retornar false con 9 costaleros", () => {
			expect(puedeDoblarse(nombres(9))).toBe(false)
		})
		it("debería retornar true con 10 costaleros", () => {
			expect(puedeDoblarse(nombres(10))).toBe(true)
		})
		it("debería retornar true con 13 costaleros", () => {
			expect(puedeDoblarse(nombres(13))).toBe(true)
		})
		it("debería retornar false con 5 costaleros", () => {
			expect(puedeDoblarse(nombres(5))).toBe(false)
		})
		it("debería retornar false con 0 costaleros", () => {
			expect(puedeDoblarse([])).toBe(false)
		})
		it("debería respetar ancho custom", () => {
			expect(puedeDoblarse(nombres(5), 3)).toBe(false)
			expect(puedeDoblarse(nombres(6), 3)).toBe(true)
		})
	})

	describe("requiereDecisionDoblado", () => {
		it("debería retornar true con exactamente 10 costaleros", () => {
			expect(requiereDecisionDoblado(nombres(10))).toBe(true)
		})
		it("debería retornar false con 11 costaleros", () => {
			expect(requiereDecisionDoblado(nombres(11))).toBe(false)
		})
		it("debería retornar false con 9 costaleros", () => {
			expect(requiereDecisionDoblado(nombres(9))).toBe(false)
		})
	})

	describe("sugerirDistribucion", () => {
		it("debería dividir 10 en a=5, b=5", () => {
			const d = sugerirDistribucion(nombres(10))
			expect(d.a).toHaveLength(5)
			expect(d.b).toHaveLength(5)
		})
		it("debería dividir 11 en a=6, b=5 (A lleva el excedente)", () => {
			const d = sugerirDistribucion(nombres(11))
			expect(d.a).toHaveLength(6)
			expect(d.b).toHaveLength(5)
		})
		it("debería dividir 12 en a=6, b=6", () => {
			const d = sugerirDistribucion(nombres(12))
			expect(d.a).toHaveLength(6)
			expect(d.b).toHaveLength(6)
		})
		it("debería dividir 13 en a=7, b=6", () => {
			const d = sugerirDistribucion(nombres(13))
			expect(d.a).toHaveLength(7)
			expect(d.b).toHaveLength(6)
		})
		it("debería preservar el orden original", () => {
			const d = sugerirDistribucion(nombres(13))
			expect(d.a[0]).toBe("c1")
			expect(d.a[6]).toBe("c7")
			expect(d.b[0]).toBe("c8")
			expect(d.b[5]).toBe("c13")
		})
	})

	describe("agruparEnCuadrillas", () => {
		it("debería usar distribución sugerida si no se pasa", () => {
			const { a, b } = agruparEnCuadrillas(nombres(13))
			expect(a.miembros).toHaveLength(7)
			expect(b.miembros).toHaveLength(6)
			expect(a.id).toBe("A")
			expect(b.id).toBe("B")
		})
		it("debería respetar distribución manual", () => {
			const { a, b } = agruparEnCuadrillas(nombres(13), {
				a: ["x1", "x2", "x3", "x4", "x5", "x6", "x7"],
				b: ["y1", "y2", "y3", "y4", "y5", "y6"],
			})
			expect(a.miembros).toEqual(["x1", "x2", "x3", "x4", "x5", "x6", "x7"])
			expect(b.miembros).toEqual(["y1", "y2", "y3", "y4", "y5", "y6"])
		})
		it("debería lanzar error si la suma de la distribución no coincide", () => {
			expect(() =>
				agruparEnCuadrillas(nombres(13), { a: ["x"], b: ["y"] }),
			).toThrow(/Distribución inválida/)
		})
	})

	describe("crearEstadoInicial", () => {
		it("debería iniciar con A como cuadrilla activa", () => {
			const e = crearEstadoInicial({ a: nombres(7), b: nombres(6) })
			expect(e.cuadrillaActiva).toBe("A")
		})
		it("debería iniciar con cargando vacío en ambas cuadrillas", () => {
			const e = crearEstadoInicial({ a: nombres(7), b: nombres(6) })
			expect(e.estados.A.cargando).toEqual([])
			expect(e.estados.B.cargando).toEqual([])
		})
		it("debería poner todos los miembros en disponibles", () => {
			const e = crearEstadoInicial({ a: nombres(7), b: nombres(6) })
			expect(e.estados.A.disponibles).toEqual(nombres(7))
			expect(e.estados.B.disponibles).toEqual(nombres(6))
		})
	})

	describe("aplicarRelevoPrincipal", () => {
		it("debería cambiar de A a B con A=7, B=6", () => {
			const estado = crearEstadoInicial({ a: nombres(7), b: nombres(6) })
			const { estado: nuevo, relevo } = aplicarRelevoPrincipal(estado)
			expect(nuevo.cuadrillaActiva).toBe("B")
			expect(relevo.tipo).toBe("principal")
			expect(relevo.cuadrilla).toBe("B")
			expect(relevo.sale).toEqual([])
			expect(relevo.entra).toEqual(["c1", "c2", "c3", "c4", "c5"])
		})
		it("los que salen deberían ir al final de disponibles de la saliente", () => {
			const estado = crearEstadoInicial({ a: nombres(7), b: nombres(6) })
			const { estado: nuevo } = aplicarRelevoPrincipal(estado)
			// A sale con [] (cargando vacío en estado inicial), disponibles original = [c1..c7]
			expect(nuevo.estados.A.cargando).toEqual([])
			expect(nuevo.estados.A.disponibles).toEqual(nombres(7))
		})
		it("la entrante debería tener los primeros 5 de sus disponibles en cargando", () => {
			const estado = crearEstadoInicial({ a: nombres(7), b: nombres(6) })
			const { estado: nuevo } = aplicarRelevoPrincipal(estado)
			expect(nuevo.estados.B.cargando).toEqual(["c1", "c2", "c3", "c4", "c5"])
			expect(nuevo.estados.B.disponibles).toEqual(["c6"])
		})
		it("debería cambiar de B a A con B cargando", () => {
			// Simular B ya cargando: A→B primero
			const estadoInicial = crearEstadoInicial({ a: nombres(7), b: nombres(6) })
			const { estado: e1 } = aplicarRelevoPrincipal(estadoInicial)
			const { estado: e2, relevo } = aplicarRelevoPrincipal(e1)
			expect(e2.cuadrillaActiva).toBe("A")
			expect(relevo.cuadrilla).toBe("A")
			expect(relevo.sale).toEqual(["c1", "c2", "c3", "c4", "c5"])
			expect(relevo.entra).toEqual(["c1", "c2", "c3", "c4", "c5"])
		})
	})

	describe("aplicarRelevoIntermedio", () => {
		it("debería rotar uno de cargando por uno de disponibles (A=7)", () => {
			const estado = setupACargando(7, 6)
			const { estado: nuevo, relevo } = aplicarRelevoIntermedio(estado)
			expect(nuevo.cuadrillaActiva).toBe("A")
			expect(relevo.tipo).toBe("intermedio")
			expect(relevo.cuadrilla).toBe("A")
			expect(relevo.sale).toEqual(["c1"])
			expect(relevo.entra).toEqual(["c6"])
			// Verificamos el set (miembros), no el orden del array.
			// El modelo FIFO pone al que entra al final de cargando.
			expect(nuevo.estados.A.cargando).toHaveLength(5)
			expect(nuevo.estados.A.cargando).toEqual(expect.arrayContaining(["c2", "c3", "c4", "c5", "c6"]))
			expect(nuevo.estados.A.cargando).not.toContain("c1")
			expect(nuevo.estados.A.disponibles).toEqual(["c7", "c1"])
		})
		it("dos intermedios consecutivos deberían rotar dos distintos", () => {
			const estado = setupACargando(7, 6)
			const { estado: e1 } = aplicarRelevoIntermedio(estado)
			const { estado: e2, relevo } = aplicarRelevoIntermedio(e1)
			expect(relevo.sale).toEqual(["c2"])
			expect(relevo.entra).toEqual(["c7"])
			expect(e2.estados.A.cargando).toHaveLength(5)
			expect(e2.estados.A.cargando).toEqual(expect.arrayContaining(["c3", "c4", "c5", "c6", "c7"]))
			expect(e2.estados.A.cargando).not.toContain("c1")
			expect(e2.estados.A.cargando).not.toContain("c2")
			expect(e2.estados.A.disponibles).toEqual(["c1", "c2"])
		})
		it("debería lanzar error si no hay disponibles", () => {
			// Estado: A está activa con cargando=[a1..a5] y disponibles=[].
			const estado: EstadoPlan = {
				cuadrillaActiva: "A",
				estados: {
					A: { cargando: ["c1", "c2", "c3", "c4", "c5"], disponibles: [] },
					B: { cargando: [], disponibles: ["c1", "c2", "c3", "c4", "c5"] },
				},
			}
			expect(() => aplicarRelevoIntermedio(estado)).toThrow(/No hay disponibles/)
		})
	})

	describe("simularCicloCompleto", () => {
		it("con 10 (A=5, B=5) debería generar 2 relevos (sin intermedios)", () => {
			const relevos = simularCicloCompleto(nombres(10))
			// 1 principal A→B + 0 intermedios B + 1 principal B→A + 0 intermedios A
			expect(relevos).toHaveLength(2)
			expect(relevos.every((r) => r.tipo === "principal")).toBe(true)
		})
		it("con 13 (A=7, B=6) debería generar 5 relevos (3 intermedios)", () => {
			const relevos = simularCicloCompleto(nombres(13))
			// 1 A→B + 1 intermedio B + 1 B→A + 2 intermedios A = 5
			expect(relevos).toHaveLength(5)
			const intermedios = relevos.filter((r) => r.tipo === "intermedio")
			expect(intermedios).toHaveLength(3) // 1 de B + 2 de A
		})
		it("con 11 (A=6, B=5) debería generar 3 relevos (1 intermedio)", () => {
			const relevos = simularCicloCompleto(nombres(11))
			// 1 A→B + 0 intermedios B + 1 B→A + 1 intermedio A = 3
			expect(relevos).toHaveLength(3)
			const intermedios = relevos.filter((r) => r.tipo === "intermedio")
			expect(intermedios).toHaveLength(1)
		})
		it("los intermedios deberían corresponder a la cuadrilla activa correcta", () => {
			const relevos = simularCicloCompleto(nombres(13))
			// Rele 1: principal A→B (entra B)
			// Rele 2: intermedio de B
			// Rele 3: principal B→A (entra A)
			// Rele 4: intermedio de A
			// Rele 5: intermedio de A
			expect(relevos[0].tipo).toBe("principal")
			expect(relevos[0].cuadrilla).toBe("B")
			expect(relevos[1].tipo).toBe("intermedio")
			expect(relevos[1].cuadrilla).toBe("B")
			expect(relevos[2].tipo).toBe("principal")
			expect(relevos[2].cuadrilla).toBe("A")
			expect(relevos[3].tipo).toBe("intermedio")
			expect(relevos[3].cuadrilla).toBe("A")
			expect(relevos[4].tipo).toBe("intermedio")
			expect(relevos[4].cuadrilla).toBe("A")
		})
		it("debería respetar distribución manual", () => {
			const relevos = simularCicloCompleto(
				nombres(13),
				{ a: ["x1", "x2", "x3", "x4", "x5", "x6", "x7"], b: ["y1", "y2", "y3", "y4", "y5", "y6"] },
			)
			// Relevos: 1) A→B (entra [y1..y5]), 2) intermedio B (sale y1, entra y6), 3) B→A (entra [x1..x5]), 4) intermedio A, 5) intermedio A
			expect(relevos[0].entra).toEqual(["y1", "y2", "y3", "y4", "y5"])
			expect(relevos[1].entra).toEqual(["y6"])
			expect(relevos[2].entra).toEqual(["x1", "x2", "x3", "x4", "x5"])
			expect(relevos[3].entra).toEqual(["x6"])
			expect(relevos[4].entra).toEqual(["x7"])
		})
		it("los relevos deberían estar numerados secuencialmente desde 1", () => {
			const relevos = simularCicloCompleto(nombres(13))
			relevos.forEach((r, i) => expect(r.numero).toBe(i + 1))
		})
	})

	describe("cuadrillaDobladaATramoSlots", () => {
		function makeTrabajadera(
			nombres: string[],
			distribucionCuadrillas?: { a: number[]; b: number[] },
		): Trabajadera {
			return {
				id: 1,
				nombres,
				roles: nombres.map(() => ({ pri: "COR" as const, sec: "FIJ_I" as const })),
				salidas: 2,
				tramos: ["T1", "T2", "T3"],
				bajas: [],
				regla5costaleros: false,
				plan: null,
				obj: null,
				analisis: null,
				pinned: null,
				puntuaciones: {},
				tramosClaves: [],
				distribucionCuadrillas,
			}
		}

		it("returns [] when n < 10", () => {
			const t = makeTrabajadera(nombres(8))
			expect(cuadrillaDobladaATramoSlots(t)).toEqual([])
		})

		it("produces valid TramoSlot[] for n=10", () => {
			const t = makeTrabajadera(nombres(10))
			const slots = cuadrillaDobladaATramoSlots(t)
			expect(slots.length).toBeGreaterThan(0)
			slots.forEach((s) => {
				expect(s.dentro).toHaveLength(5)
				expect(s.fuera).toHaveLength(5)
			})
		})

		it("produces valid TramoSlot[] for n=12 with 6/6 distribution", () => {
			const t = makeTrabajadera(nombres(12), {
				a: [0, 1, 2, 3, 4, 5],
				b: [6, 7, 8, 9, 10, 11],
			})
			// Adapter accepts name-based Distribucion; indices are on Trabajadera
			const slots = cuadrillaDobladaATramoSlots(t, {
				a: ["c1", "c2", "c3", "c4", "c5", "c6"],
				b: ["c7", "c8", "c9", "c10", "c11", "c12"],
			})
			expect(slots.length).toBeGreaterThan(0)
			slots.forEach((s) => {
				expect(s.dentro).toHaveLength(5)
				expect(s.fuera).toHaveLength(7)
			})
		})

		it("produces valid TramoSlot[] for n=13", () => {
			const t = makeTrabajadera(nombres(13))
			const slots = cuadrillaDobladaATramoSlots(t)
			expect(slots.length).toBeGreaterThan(0)
			slots.forEach((s) => {
				expect(s.dentro).toHaveLength(5)
				expect(s.fuera).toHaveLength(8)
			})
		})

		it("produces valid TramoSlot[] for n=20", () => {
			const t = makeTrabajadera(nombres(20))
			const slots = cuadrillaDobladaATramoSlots(t)
			expect(slots.length).toBeGreaterThan(0)
			slots.forEach((s) => {
				expect(s.dentro).toHaveLength(5)
				expect(s.fuera).toHaveLength(15)
			})
		})

		it("throws on name/index drift", () => {
			const t = makeTrabajadera(nombres(10), {
				a: [0, 1, 2, 3, 4],
				b: [5, 6, 7, 8, 9],
			})
			// Distribution references names that don't exist in t.nombres
			const badDist = {
				a: ["c1", "c2", "c3", "c4", "c99"],
				b: ["c5", "c6", "c7", "c8", "c10"],
			}
			expect(() => cuadrillaDobladaATramoSlots(t, badDist)).toThrow(
				/c99/,
			)
		})
	})
})
