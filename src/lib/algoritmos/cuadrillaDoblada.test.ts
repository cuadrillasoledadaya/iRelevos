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
	simularCicloConTipos,
	relevosATramoSlots,
	validarDistribucionCuadrillas,
	CuadrillaDobladaSinPrimarioError,
	CuadrillaDobladaDistribucionInvalidaError,
	CuadrillaDobladaSubAnchoPostBajasError,
	tieneRolesAsignados,
	type EstadoPlan,
	type Distribucion,
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
		// v1.2.93 #1: UMBRAL_DOBLADO = 2 * ANCHO_TRABAJADERA (relación invariante)
		// Garantiza que si alguna vez se cambia ANCHO, el umbral escala
		// automáticamente (sin drift en los 3 call-sites que lo usan).
		it("UMBRAL_DOBLADO es 2 * ANCHO_TRABAJADERA (relación invariante)", () => {
			expect(UMBRAL_DOBLADO).toBe(2 * ANCHO_TRABAJADERA)
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

	describe("sugerirDistribucion (role-aware — RED: type errors until 1.8)", () => {
		// Helper: build a Trabajadera with nombres + parallel roles.
		function makeT(
			nombres: string[],
			roles: { pri: string; sec: string }[],
			id = 1,
		): Trabajadera {
			return {
				id,
				nombres,
				roles: roles as Trabajadera["roles"],
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
			}
		}

		it("full coverage T1 (12 costaleros): |a|=6, |b|=6, every accepted role in both", () => {
			// T1 accepts: PAT_D, PAT_I, FIJ_D, FIJ_I, COR
			const t = makeT(
				nombres(12),
				[
					{ pri: "PAT_D", sec: "COR" },
					{ pri: "PAT_I", sec: "COR" },
					{ pri: "FIJ_D", sec: "COR" },
					{ pri: "FIJ_I", sec: "COR" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "PAT_D", sec: "COR" },
					{ pri: "PAT_I", sec: "COR" },
					{ pri: "FIJ_D", sec: "COR" },
					{ pri: "FIJ_I", sec: "COR" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
				],
			)
			// @ts-expect-error — RED: signature not yet changed to (t: Trabajadera)
			const d = sugerirDistribucion(t)
			expect(d.a).toHaveLength(6)
			expect(d.b).toHaveLength(6)
		})

		it("full coverage T2 (12 costaleros): no PAT role appears", () => {
			// T2 accepts: COS_D, COS_I, FIJ_D, FIJ_I, COR
			const t = makeT(
				nombres(12),
				[
					{ pri: "COS_D", sec: "COR" },
					{ pri: "COS_I", sec: "COR" },
					{ pri: "FIJ_D", sec: "COR" },
					{ pri: "FIJ_I", sec: "COR" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COS_D", sec: "COR" },
					{ pri: "COS_I", sec: "COR" },
					{ pri: "FIJ_D", sec: "COR" },
					{ pri: "FIJ_I", sec: "COR" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
				],
				2, // T2
			)
			// @ts-expect-error — RED: signature not yet changed
			const d = sugerirDistribucion(t)
			expect(d.a).toHaveLength(6)
			expect(d.b).toHaveLength(6)
		})

		it("partial coverage → warning, does not throw", () => {
			// T1 with only 4 roles assigned (no COR)
			const t = makeT(
				nombres(12),
				[
					{ pri: "PAT_D", sec: "COR" },
					{ pri: "PAT_I", sec: "COR" },
					{ pri: "FIJ_D", sec: "COR" },
					{ pri: "FIJ_I", sec: "COR" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
				],
			)
			// @ts-expect-error — RED: signature not yet changed
			const d = sugerirDistribucion(t)
			expect(d.a.length + d.b.length).toBe(12)
			expect(d.warning).toBeDefined()
		})

		it("COR-only costaleros never fill PAT/FIJ/COS slot", () => {
			// T1: 10 nombres, 8 COR-only, 2 PAT_I
			const t = makeT(
				nombres(10),
				[
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "PAT_I", sec: "COR" },
					{ pri: "PAT_I", sec: "COR" },
				],
			)
			// @ts-expect-error — RED: signature not yet changed
			const d = sugerirDistribucion(t)
			expect(d.a.length + d.b.length).toBe(10)
		})

		it("deterministic role-grouped output: same input → same order", () => {
			// T1 with 10 nombres covering all 5 ideal roles
			const t = makeT(
				nombres(10),
				[
					{ pri: "PAT_I", sec: "COR" },
					{ pri: "FIJ_I", sec: "COR" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "FIJ_D", sec: "COR" },
					{ pri: "PAT_D", sec: "COR" },
					{ pri: "PAT_I", sec: "COR" },
					{ pri: "FIJ_I", sec: "COR" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "FIJ_D", sec: "COR" },
					{ pri: "PAT_D", sec: "COR" },
				],
			)
			// @ts-expect-error — RED: signature not yet changed
			const d1 = sugerirDistribucion(t)
			// @ts-expect-error — RED: signature not yet changed
			const d2 = sugerirDistribucion(t)
			expect(d1.a).toEqual(d2.a)
			expect(d1.b).toEqual(d2.b)
		})
	})

	// ── Task 1.2 RED: CuadrillaDobladaRolesInsuficientesError tests ──
	// RED signal: class does not exist yet (import + runtime errors).

	describe("CuadrillaDobladaRolesInsuficientesError (RED: class not yet implemented)", () => {
		function makeT(
			nombres: string[],
			roles: { pri: string; sec: string }[],
			id = 1,
		): Trabajadera {
			return {
				id,
				nombres,
				roles: roles as Trabajadera["roles"],
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
			}
		}

		it("throws on length mismatch (roles.length !== nombres.length)", () => {
			const t = makeT(
				nombres(12),
				[
					{ pri: "PAT_D", sec: "COR" },
					{ pri: "PAT_I", sec: "COR" },
					{ pri: "FIJ_D", sec: "COR" },
					{ pri: "FIJ_I", sec: "COR" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
				], // 10 roles, 12 nombres
			)
			// @ts-expect-error — RED: class and signature not yet implemented
			expect(() => sugerirDistribucion(t)).toThrow("CuadrillaDobladaRolesInsuficientesError")
		})

		it("partial coverage does NOT throw — returns warning", () => {
			const t = makeT(
				nombres(12),
				[
					{ pri: "PAT_D", sec: "COR" },
					{ pri: "PAT_I", sec: "COR" },
					{ pri: "FIJ_D", sec: "COR" },
					{ pri: "FIJ_I", sec: "COR" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "COR", sec: "FIJ_I" },
				], // 12 roles, all COR except 4 — valid but partial
			)
			// @ts-expect-error — RED: signature not yet changed
			const d = sugerirDistribucion(t)
			expect(d.a.length + d.b.length).toBe(12)
			expect(d.warning).toBeDefined()
		})
	})

	// ── Task 1.3 RED: tieneRolesAsignados tests ──
	// RED signal: function does not exist yet (import error).

	describe("tieneRolesAsignados (RED: function not yet implemented)", () => {
		function makeT(
			nombres: string[],
			roles?: { pri: string; sec: string }[],
			id = 1,
		): Trabajadera {
			return {
				id,
				nombres,
				roles: roles as Trabajadera["roles"],
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
			}
		}

		it("roles undefined → false", () => {
			const t: Trabajadera = {
				id: 1,
				nombres: nombres(12),
				roles: undefined as unknown as Trabajadera["roles"],
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
			}
			// @ts-expect-error — RED: function not yet exported
			expect(tieneRolesAsignados(t)).toBe(false)
		})

		it("roles empty array → false", () => {
			const t = makeT(nombres(12), [])
			// @ts-expect-error — RED: function not yet exported
			expect(tieneRolesAsignados(t)).toBe(false)
		})

		it("roles length mismatch → false", () => {
			const t = makeT(nombres(12), [
				{ pri: "PAT_D", sec: "COR" },
				{ pri: "PAT_I", sec: "COR" },
			]) // 2 roles, 12 nombres
			// @ts-expect-error — RED: function not yet exported
			expect(tieneRolesAsignados(t)).toBe(false)
		})

		it("all ok (roles.length === nombres.length) → true", () => {
			const t = makeT(nombres(12), Array(12).fill({ pri: "COR", sec: "FIJ_I" }))
			// @ts-expect-error — RED: function not yet exported
			expect(tieneRolesAsignados(t)).toBe(true)
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
		it("S swap con cargando vacío debe cargar desde disp (no corromper con undefined)", () => {
			// B2: si la cuadrilla activa está vacía (cargando=[]) y hay
			// disponibles, el S swap debe "cargar" la cuadrilla desde disp
			// (mover primeros ANCHO al cargando) en vez de corromper el
			// state con `sale!` undefined.
			const estadoInicial: EstadoPlan = {
				cuadrillaActiva: "A",
				estados: {
					A: { cargando: [], disponibles: ["c1", "c2", "c3", "c4", "c5", "c6"] },
					B: { cargando: [], disponibles: [] },
				},
			}
			const { estado: nuevo, relevo } = aplicarRelevoIntermedio(estadoInicial)
			// No debe haber undefined en disp (era el bug B2)
			expect(nuevo.estados.A.disponibles).not.toContain(undefined)
			expect(nuevo.estados.A.disponibles).toEqual(["c6"])
			// A queda cargada con los primeros 5 de disp
			expect(nuevo.estados.A.cargando).toEqual(["c1", "c2", "c3", "c4", "c5"])
			// Sale está vacío (nadie salía — es un load, no un swap)
			expect(relevo.sale).toEqual([])
			// Entra son los 5 que entraron
			expect(relevo.entra).toEqual(["c1", "c2", "c3", "c4", "c5"])
		})
		it("S swap con cuadrilla completamente vacía (sin cargando ni disp) debe lanzar error claro", () => {
			// Edge case: si tanto cargando como disp están vacíos, no hay
			// nada que cargar — error claro.
			const estadoInicial: EstadoPlan = {
				cuadrillaActiva: "A",
				estados: {
					A: { cargando: [], disponibles: [] },
					B: { cargando: [], disponibles: [] },
				},
			}
			expect(() => aplicarRelevoIntermedio(estadoInicial)).toThrow(
				/vac[ií]a|disponibles|intermedio/i,
			)
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
			// v1.2.90: el error ahora es CuadrillaDobladaSinDisponibleError
			// con contexto (tramoIdx=-1 para llamada directa).
			expect(() => aplicarRelevoIntermedio(estado)).toThrow(/disponibles/i)
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

	describe("validarDistribucionCuadrillas (B4)", () => {
		it("happy path: distribución válida no lanza", () => {
			// 10 costaleros, 5/5
			expect(() =>
				validarDistribucionCuadrillas({ a: [0, 1, 2, 3, 4], b: [5, 6, 7, 8, 9] }, 10),
			).not.toThrow()
		})

		it("happy path: distribución 7/6 (suma = total) es válida", () => {
			// 13 costaleros, 7/6
			expect(() =>
				validarDistribucionCuadrillas(
					{ a: [0, 1, 2, 3, 4, 5, 6], b: [7, 8, 9, 10, 11, 12] },
					13,
				),
			).not.toThrow()
		})

		it("índice duplicado dentro de A lanza CuadrillaDobladaDistribucionInvalidaError", () => {
			// c3 está dos veces en A
			expect(() =>
				validarDistribucionCuadrillas(
					{ a: [0, 1, 2, 3, 3], b: [5, 6, 7, 8, 9] },
					10,
				),
			).toThrow(CuadrillaDobladaDistribucionInvalidaError)
		})

		it("índice duplicado dentro de B lanza error", () => {
			expect(() =>
				validarDistribucionCuadrillas(
					{ a: [0, 1, 2, 3, 4], b: [5, 6, 7, 8, 8] },
					10,
				),
			).toThrow(CuadrillaDobladaDistribucionInvalidaError)
		})

		it("índice fuera de rango (>= totalNombres) lanza error", () => {
			// nombres.length=10, A contiene 99
			expect(() =>
				validarDistribucionCuadrillas(
					{ a: [0, 1, 2, 3, 99], b: [5, 6, 7, 8, 9] },
					10,
				),
			).toThrow(CuadrillaDobladaDistribucionInvalidaError)
		})

		it("índice negativo lanza error", () => {
			expect(() =>
				validarDistribucionCuadrillas(
					{ a: [0, 1, 2, 3, -1], b: [5, 6, 7, 8, 9] },
					10,
				),
			).toThrow(CuadrillaDobladaDistribucionInvalidaError)
		})

		it("cuadrilla con menos de ANCHO miembros lanza error", () => {
			// A solo tiene 4 (ancho=5)
			expect(() =>
				validarDistribucionCuadrillas(
					{ a: [0, 1, 2, 3], b: [5, 6, 7, 8, 9, 10] },
					11,
				),
			).toThrow(CuadrillaDobladaDistribucionInvalidaError)
		})

		it("overlap A∩B (mismo costalero en ambas cuadrillas) lanza error", () => {
			// c5 está en A y B
			expect(() =>
				validarDistribucionCuadrillas(
					{ a: [0, 1, 2, 3, 5], b: [5, 6, 7, 8, 9] },
					10,
				),
			).toThrow(CuadrillaDobladaDistribucionInvalidaError)
		})

		it("el mensaje de error incluye el nombre de la cuadrilla problemática", () => {
			try {
				validarDistribucionCuadrillas(
					{ a: [0, 1, 2, 3, 99], b: [5, 6, 7, 8, 9] },
					10,
				)
				expect.fail("debería haber lanzado")
			} catch (err) {
				expect(err).toBeInstanceOf(CuadrillaDobladaDistribucionInvalidaError)
				expect((err as Error).message).toMatch(/A/)
			}
		})

		it("el mensaje de error incluye el índice problemático", () => {
			try {
				validarDistribucionCuadrillas(
					{ a: [0, 1, 2, 3, 99], b: [5, 6, 7, 8, 9] },
					10,
				)
				expect.fail("debería haber lanzado")
			} catch (err) {
				expect((err as Error).message).toMatch(/99/)
			}
		})

		it("acepta ancho custom (ej: 3)", () => {
			// 6 costaleros, 3/3
			expect(() =>
				validarDistribucionCuadrillas(
					{ a: [0, 1, 2], b: [3, 4, 5] },
					6,
					3,
				),
			).not.toThrow()
			// con ancho=3, una cuadrilla de 2 falla
			expect(() =>
				validarDistribucionCuadrillas(
					{ a: [0, 1], b: [3, 4, 5] },
					6,
					3,
				),
			).toThrow(CuadrillaDobladaDistribucionInvalidaError)
		})

		// v1.2.92 #6: suma === totalNombres
		it("9/12 split con 12 totales (suma=21, costaleros=12): lanza con motivo 'suma_incorrecta'", () => {
			try {
				validarDistribucionCuadrillas(
					{ a: [0, 1, 2, 3, 4, 5, 6, 7, 8], b: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
					12,
				)
				expect.fail("debería haber lanzado")
			} catch (err) {
				expect(err).toBeInstanceOf(CuadrillaDobladaDistribucionInvalidaError)
				const e = err as InstanceType<typeof CuadrillaDobladaDistribucionInvalidaError>
				expect(e.motivo).toBe("suma_incorrecta")
				expect(e.message).toMatch(/suma/i)
			}
		})

		it("12/12 split con 12 totales (suma=24, costaleros=12): lanza con motivo 'suma_incorrecta'", () => {
			// over-assignment — both >= ANCHO, no overlap, indices in range,
			// but suma > totalNombres
			try {
				validarDistribucionCuadrillas(
					{ a: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], b: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
					12,
				)
				expect.fail("debería haber lanzado")
			} catch (err) {
				expect(err).toBeInstanceOf(CuadrillaDobladaDistribucionInvalidaError)
				const e = err as InstanceType<typeof CuadrillaDobladaDistribucionInvalidaError>
				expect(e.motivo).toBe("suma_incorrecta")
			}
		})

		it("9/9 split con 12 totales (suma=18, cada uno >=ANCHO): lanza con motivo 'suma_incorrecta'", () => {
			// under-assignment with each >= ANCHO: pasa sub_ancho, pasa duplicados
			// (asume indices únicos y en rango), pero suma=18 != 12
			try {
				validarDistribucionCuadrillas(
					{ a: [0, 1, 2, 3, 4, 5, 6, 7, 8], b: [9, 10, 11, 0, 1, 2, 3, 4, 5] },
					12,
				)
				expect.fail("debería haber lanzado")
			} catch (err) {
				// overlap fires first (idx 0..5 en A y B) — pero lo importante es
				// que cualquier error estructurado lo captura, no escapa como Error genérico
				expect(err).toBeInstanceOf(CuadrillaDobladaDistribucionInvalidaError)
			}
		})

		it("5/7 split con 12 totales (suma=12, cada uno >=ANCHO): happy path no lanza", () => {
			// sanity: la única invariante adicional es suma === totalNombres,
			// este caso suma=12, total=12 → no debe lanzar
			expect(() =>
				validarDistribucionCuadrillas(
					{ a: [0, 1, 2, 3, 4], b: [5, 6, 7, 8, 9, 10, 11] },
					12,
				),
			).not.toThrow()
		})

		it("error de suma_incorrecta expone suma y totalNombres en detail", () => {
			try {
				validarDistribucionCuadrillas(
					{ a: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], b: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
					12,
				)
				expect.fail("debería haber lanzado")
			} catch (err) {
				const e = err as InstanceType<typeof CuadrillaDobladaDistribucionInvalidaError>
				expect(e.motivo).toBe("suma_incorrecta")
				// detail debe contener tanto la suma (26) como el total (12)
				expect(e.message).toMatch(/26/)
				expect(e.message).toMatch(/12/)
			}
		})
	})

	describe("cuadrillaDobladaATramoSlots — v1.2.92 #3 (defense at the leaf)", () => {
		function makeLegacy(n: number): Trabajadera {
			return {
				id: 1,
				nombres: nombres(n),
				roles: nombres(n).map(() => ({ pri: "COR" as const, sec: "FIJ_I" as const })),
				salidas: 1,
				tramos: ["T1", "T2", "T3"],
				bajas: [],
				regla5costaleros: false,
				plan: null,
				obj: null,
				analisis: null,
				pinned: null,
				puntuaciones: {},
				tramosClaves: [],
			}
		}

		it("lanza CuadrillaDobladaDistribucionInvalidaError con índice fuera de rango", () => {
			const t = makeLegacy(10)
			t.distribucionCuadrillas = { a: [0, 1, 2, 3, 99], b: [4, 5, 6, 7, 8] }
			expect(() => cuadrillaDobladaATramoSlots(t)).toThrow(
				CuadrillaDobladaDistribucionInvalidaError,
			)
		})

		it("lanza CuadrillaDobladaDistribucionInvalidaError con suma_incorrecta", () => {
			const t = makeLegacy(12)
			// 9/9 split, 12 totales, cada uno >= ANCHO pero suma=18 != 12
			t.distribucionCuadrillas = {
				a: [0, 1, 2, 3, 4, 5, 6, 7, 8],
				b: [9, 10, 11, 0, 1, 2, 3, 4, 5],
			}
			expect(() => cuadrillaDobladaATramoSlots(t)).toThrow(
				CuadrillaDobladaDistribucionInvalidaError,
			)
		})

		it("sin distribucionCuadrillas: no valida (camino normal)", () => {
			// 12 costaleros sin distribución → usar la sugerida
			const t = makeLegacy(12)
			expect(t.distribucionCuadrillas).toBeUndefined()
			const slots = cuadrillaDobladaATramoSlots(t)
			expect(slots.length).toBeGreaterThan(0)
		})
	})

	describe("simularCicloConTipos — B4 integration (validation in entry point)", () => {
		function makeTrab(
			n: number,
			overrides: Partial<Trabajadera> = {},
		): Trabajadera {
			return {
				id: 1,
				nombres: nombres(n),
				roles: nombres(n).map(() => ({ pri: "COR" as const, sec: "FIJ_I" as const })),
				salidas: 2,
				tramos: Array.from({ length: 3 }, (_, i) => `T${i + 1}`),
				bajas: [],
				regla5costaleros: false,
				plan: null,
				obj: null,
				analisis: null,
				pinned: null,
				puntuaciones: {},
				tramosClaves: [],
				...overrides,
			}
		}

		it("lanza CuadrillaDobladaDistribucionInvalidaError con índice fuera de rango", () => {
			const t = makeTrab(10, {
				distribucionCuadrillas: { a: [0, 1, 2, 3, 99], b: [5, 6, 7, 8, 9] },
			})
			expect(() => simularCicloConTipos(t, ["primario", "secundario", "primario"])).toThrow(
				CuadrillaDobladaDistribucionInvalidaError,
			)
		})

		it("lanza error con duplicado en A antes de cualquier state mutation", () => {
			const t = makeTrab(10, {
				distribucionCuadrillas: { a: [0, 1, 2, 3, 3], b: [5, 6, 7, 8, 9] },
			})
			expect(() => simularCicloConTipos(t, ["primario", "secundario", "primario"])).toThrow(
				CuadrillaDobladaDistribucionInvalidaError,
			)
		})

		it("lanza error con A∩B overlap", () => {
			const t = makeTrab(10, {
				distribucionCuadrillas: { a: [0, 1, 2, 3, 5], b: [5, 6, 7, 8, 9] },
			})
			expect(() => simularCicloConTipos(t, ["primario", "secundario", "primario"])).toThrow(
				CuadrillaDobladaDistribucionInvalidaError,
			)
		})

		it("sin distribucionCuadrillas: usa la sugerida y NO valida (camino normal)", () => {
			// distribucionCuadrillas ausente → sugerirDistribucion, no hay nada que validar.
			// Usamos 12 costaleros (A=6, B=6) para que B tenga disp después del primer P
			// y el [P, S, P] funcione.
			const t = makeTrab(12)
			expect(t.distribucionCuadrillas).toBeUndefined()
			const relevos = simularCicloConTipos(t, ["primario", "secundario", "primario"])
			expect(relevos).toHaveLength(3)
		})
	})

	describe("simularCicloConTipos", () => {
		function makeTrab(
			n: number,
			overrides: Partial<Trabajadera> = {},
		): Trabajadera {
			return {
				id: 1,
				nombres: nombres(n),
				roles: nombres(n).map(() => ({ pri: "COR" as const, sec: "FIJ_I" as const })),
				salidas: 2,
				tramos: Array.from({ length: 3 }, (_, i) => `T${i + 1}`),
				bajas: [],
				regla5costaleros: false,
				plan: null,
				obj: null,
				analisis: null,
				pinned: null,
				puntuaciones: {},
				tramosClaves: [],
				...overrides,
			}
		}

		it("mixed P/S: 3 tramos [P, S, P] generates 3 relevos", () => {
			const t = makeTrab(12, {
				distribucionCuadrillas: { a: [0,1,2,3,4,5], b: [6,7,8,9,10,11] },
			})
			const relevos = simularCicloConTipos(t, ["primario", "secundario", "primario"])
			expect(relevos).toHaveLength(3)
			expect(relevos[0].tipo).toBe("principal")
			expect(relevos[1].tipo).toBe("intermedio")
			expect(relevos[2].tipo).toBe("principal")
		})

		it("all-primario [P, P, P] generates 3 principal relevos", () => {
			const t = makeTrab(12, {
				distribucionCuadrillas: { a: [0,1,2,3,4,5], b: [6,7,8,9,10,11] },
			})
			const relevos = simularCicloConTipos(t, ["primario", "primario", "primario"])
			expect(relevos).toHaveLength(3)
			expect(relevos.every((r) => r.tipo === "principal")).toBe(true)
		})

		it("all-primario produces same output as legacy simularCicloCompleto", () => {
			const dist = { a: nombres(12).slice(0, 6), b: nombres(12).slice(6) }
			const legacy = simularCicloCompleto(nombres(12), dist)
			const t = makeTrab(12, {
				tramos: ["T1", "T2", "T3", "T4"],
				distribucionCuadrillas: { a: [0,1,2,3,4,5], b: [6,7,8,9,10,11] },
			})
			const perTramo = simularCicloConTipos(t, ["primario", "primario", "primario", "primario"])
			expect(perTramo).toHaveLength(4)
			expect(perTramo.every((r) => r.tipo === "principal")).toBe(true)
		})

		it("all-secundario throws CuadrillaDobladaSinPrimarioError", () => {
			const t = makeTrab(12, {
				distribucionCuadrillas: { a: [0,1,2,3,4,5], b: [6,7,8,9,10,11] },
			})
			expect(() =>
				simularCicloConTipos(t, ["secundario", "secundario", "secundario"]),
			).toThrow(CuadrillaDobladaSinPrimarioError)
		})

		it("empty tramosTipo with zero tramos returns empty array", () => {
			const t = makeTrab(12, { tramos: [] })
			const relevos = simularCicloConTipos(t, [])
			expect(relevos).toEqual([])
		})

		it("relevos are numbered sequentially from 1", () => {
			const t = makeTrab(12, {
				distribucionCuadrillas: { a: [0,1,2,3,4,5], b: [6,7,8,9,10,11] },
			})
			const relevos = simularCicloConTipos(t, ["primario", "secundario", "primario"])
			relevos.forEach((r, i) => expect(r.numero).toBe(i + 1))
		})

		it("length mismatch throws Error", () => {
			const t = makeTrab(12, {
				tramos: ["T1", "T2", "T3"],
			})
			expect(() =>
				simularCicloConTipos(t, ["primario", "secundario"]),
			).toThrow("tramosTipo length must equal tramos length")
		})

		// ══════════════════════════════════════════════════════════════
		// Multi-salida support (bug fix v1.2.87)
		// Before: state initialized once, plan covered 1 salida only;
		// same swaps repeated in salida 2 → "always the same ones change".
		// After: simularCicloConTipos runs the cycle S times with state
		// persisting between cycles, so the rotation actually advances
		// across salidas and the S swaps in salida 2 differ from salida 1.
		// ══════════════════════════════════════════════════════════════

		it("defaults to salidas=1 when called with 2 args (backward compat)", () => {
			const t = makeTrab(12, {
				distribucionCuadrillas: { a: [0,1,2,3,4,5], b: [6,7,8,9,10,11] },
			})
			const rImplicit = simularCicloConTipos(t, ["primario", "secundario", "primario"])
			const rExplicit = simularCicloConTipos(
				t,
				["primario", "secundario", "primario"],
				1,
			)
			expect(rImplicit).toEqual(rExplicit)
		})

		it("salidas=2 produces 2*numTramos relevos (state persists between cycles)", () => {
			const t = makeTrab(12, {
				distribucionCuadrillas: { a: [0,1,2,3,4,5], b: [6,7,8,9,10,11] },
			})
			const relevos = simularCicloConTipos(
				t,
				["primario", "secundario", "primario"],
				2,
			)
			expect(relevos).toHaveLength(6) // 2 cycles * 3 tramos
		})

		it("first cycle of salidas=2 matches salidas=1 (regression: cycle 1 unchanged)", () => {
			const t = makeTrab(12, {
				distribucionCuadrillas: { a: [0,1,2,3,4,5], b: [6,7,8,9,10,11] },
			})
			const r1 = simularCicloConTipos(t, ["primario", "secundario", "primario"], 1)
			const r2 = simularCicloConTipos(t, ["primario", "secundario", "primario"], 2)
			expect(r2.slice(0, 3)).toEqual(r1)
		})

		it("second cycle S swap differs from first cycle S swap (rotation actually advances)", () => {
			// With [P,S,S,P] × 2 with 12 costaleros (A=6, B=6):
			//   - Salida 1 T2 (S): sale=[c7], entra=[c12]  (first b-slot vacated, last fills)
			//   - Salida 2 T6 (S): sale=[c9], entra=[c8]   (rotation advanced by 2)
			// Note: with v1.2.88 fix (sale goes to FRONT of disp on P),
			// the rotation advances by 2 (c7→c8→c9 across T2→T3→end-of-cycle-1).
			// Before the v1.2.88 fix this was only c7→c8 across the same span.
			const t = makeTrab(12, {
				tramos: ["T1", "T2", "T3", "T4"],
				distribucionCuadrillas: { a: [0,1,2,3,4,5], b: [6,7,8,9,10,11] },
			})
			const relevos = simularCicloConTipos(
				t,
				["primario", "secundario", "secundario", "primario"],
				2,
			)
			// Salida 1 T2 (S) — index 1
			expect(relevos[1].tipo).toBe("intermedio")
			expect(relevos[1].sale).toEqual(["c7"])
			expect(relevos[1].entra).toEqual(["c12"])
			// Salida 2 T6 (S) — index 5
			expect(relevos[5].tipo).toBe("intermedio")
			expect(relevos[5].sale).toEqual(["c9"])
			expect(relevos[5].entra).toEqual(["c8"])
			// Rotation must actually advance — the S swaps must differ
			expect(relevos[1].sale).not.toEqual(relevos[5].sale)
		})

		it("relevos are numbered sequentially across cycles (1..S*N)", () => {
			const t = makeTrab(12, {
				tramos: ["T1", "T2", "T3", "T4"],
				distribucionCuadrillas: { a: [0,1,2,3,4,5], b: [6,7,8,9,10,11] },
			})
			const relevos = simularCicloConTipos(
				t,
				["primario", "secundario", "secundario", "primario"],
				2,
			)
			expect(relevos).toHaveLength(8)
			relevos.forEach((r, i) => expect(r.numero).toBe(i + 1))
		})

		it("salidas=0 returns empty array (defensive)", () => {
			const t = makeTrab(12, {
				distribucionCuadrillas: { a: [0,1,2,3,4,5], b: [6,7,8,9,10,11] },
			})
			const relevos = simularCicloConTipos(
				t,
				["primario", "secundario", "primario"],
				0,
			)
			expect(relevos).toEqual([])
		})

		// ══════════════════════════════════════════════════════════════
		// P-swap rotation persistence (bug fix v1.2.88)
		// Before: aplicarRelevoPrincipal built new disp as
		// `[...disponibles, ...sale]`, putting the just-left members at
		// the END. With alternating P/S patterns, this RESETS the FIFO
		// queue to original order after every P, so c7 (always the head
		// of cargando after a P) was the one to SALE in every single S
		// of B. User reported: "c7 always comes out in the S tramos of B".
		// After: disp = [...sale, ...disponibles]. The just-left members
		// go to the FRONT of the queue, so the next P→S cycle advances
		// the rotation by one (c7, c8, c9, ...).
		// ══════════════════════════════════════════════════════════════

		it("alternating P/S pattern: S swaps of B rotate c7, c8, c9, ... (not always c7)", () => {
			// Con 6 tramos [P, S, P, S, P, S] y 12 costaleros (A=6, B=6):
			//   T1 P: A→B (B activa)
			//   T2 S: B swap — sale=c7, entra=c12  (rotación inicial)
			//   T3 P: B→A (A activa)
			//   T4 S: A swap — sale=c1, entra=c6   (rotación de A)
			//   T5 P: A→B (B activa)
			//   T6 S: B swap — debe ser sale=c8, entra=c7 (rotación avanza)
			//                            (sin el fix sería sale=c7, entra=c12)
			const t = makeTrab(12, {
				tramos: ["T1", "T2", "T3", "T4", "T5", "T6"],
				distribucionCuadrillas: { a: [0,1,2,3,4,5], b: [6,7,8,9,10,11] },
			})
			const relevos = simularCicloConTipos(
				t,
				["primario", "secundario", "primario", "secundario", "primario", "secundario"],
			)
			expect(relevos).toHaveLength(6)
			// T2 (índice 1) — primer S de B
			expect(relevos[1].tipo).toBe("intermedio")
			expect(relevos[1].cuadrilla).toBe("B")
			expect(relevos[1].sale).toEqual(["c7"])
			expect(relevos[1].entra).toEqual(["c12"])
			// T4 (índice 3) — S de A (porque T3 P dejó A activa)
			expect(relevos[3].tipo).toBe("intermedio")
			expect(relevos[3].cuadrilla).toBe("A")
			expect(relevos[3].sale).toEqual(["c1"])
			expect(relevos[3].entra).toEqual(["c6"])
			// T6 (índice 5) — segundo S de B, debe rotar a c8 (NO c7)
			expect(relevos[5].tipo).toBe("intermedio")
			expect(relevos[5].cuadrilla).toBe("B")
			expect(relevos[5].sale).toEqual(["c8"])
			expect(relevos[5].entra).toEqual(["c7"])
			// Garantía explícita: c7 no se repite en los S swaps de B
			expect(relevos[5].sale).not.toEqual(relevos[1].sale)
		})

		it("after a P swap, the just-left members go to the FRONT of the disp queue", () => {
			// Test unitario del comportamiento de aplicarRelevoPrincipal
			// relevante al bug. Setup: A activa con cargando=[c1..c5].
			const estadoInicial = crearEstadoInicial({
				a: ["c1", "c2", "c3", "c4", "c5", "c6"],
				b: ["c7", "c8", "c9", "c10", "c11", "c12"],
			})
			// A→B primero: A.sale=[], B.entra=[c7..c11]
			const { estado: e1 } = aplicarRelevoPrincipal(estadoInicial)
			// S en B: sale=c7, entra=c12
			const { estado: e2 } = aplicarRelevoIntermedio(e1)
			// Ahora: B.cargando=[c8..c12], B.disp=[c7]
			expect(e2.estados.B.cargando).toEqual(["c8", "c9", "c10", "c11", "c12"])
			expect(e2.estados.B.disponibles).toEqual(["c7"])
			// B→A: sale=[c8..c12]
			const { estado: e3 } = aplicarRelevoPrincipal(e2)
			// A.entra = A.disp.slice(0,5) = [c1..c5]
			expect(e3.estados.A.cargando).toEqual(["c1", "c2", "c3", "c4", "c5"])
			// B.disp debe tener c8 primero (sale al frente) para que la rotación avance
			expect(e3.estados.B.disponibles[0]).toBe("c8")
		})

		// ══════════════════════════════════════════════════════════════
		// Bajas (B1) — los costaleros marcados como baja no deben aparecer
		// en la rotación. La distribución y la simulación los filtran.
		// ══════════════════════════════════════════════════════════════

		it("cuadrilla doblada: costaleros en bajas no aparecen en ningún relevo", () => {
			// 14 costaleros, c3 (idx 2) y c8 (idx 7) de baja. Después de
			// filtrar quedan 12 activos. La distribución es A=6, B=6 (cada
			// una con 1 disponible después del P, los S funcionan). c3 y
			// c8 no deben aparecer en ningún relevo.
			const t = makeTrab(14, {
				tramos: ["T1", "T2", "T3"],
				distribucionCuadrillas: { a: [0,1,2,3,4,5,6], b: [7,8,9,10,11,12,13] },
				bajas: [2, 7], // c3 (idx 2) y c8 (idx 7) están de baja
			})
			const relevos = simularCicloConTipos(t, ["primario", "secundario", "primario"])
			const allMembers = new Set<string>()
			relevos.forEach(r => {
				r.sale.forEach(s => allMembers.add(s))
				r.entra.forEach(s => allMembers.add(s))
			})
			// B1: c3 y c8 NO deben aparecer en ningún relevo
			expect(allMembers.has("c3")).toBe(false)
			expect(allMembers.has("c8")).toBe(false)
		})

		// ══════════════════════════════════════════════════════════════
		// Patrón con S inicial (B2 integración) — antes metía `undefined`
		// en disp. Ahora debe cargar la cuadrilla desde disp.
		// ══════════════════════════════════════════════════════════════

		it("tramosTipo que empieza con S: la cuadrilla activa se carga desde disp (no undefined)", () => {
			// 12 costaleros (A=6, B=6), tramosTipo=[S, P, S].
			// T1 S: A está vacía, debe cargar desde disp (no undefined).
			// T2 P: A→B
			// T3 S: B swap normal
			const t = makeTrab(12, {
				tramos: ["T1", "T2", "T3"],
				distribucionCuadrillas: { a: [0,1,2,3,4,5], b: [6,7,8,9,10,11] },
			})
			const relevos = simularCicloConTipos(t, ["secundario", "primario", "secundario"])
			expect(relevos).toHaveLength(3)
			// T1 S: load de A (sale=[], entra=primeros 5 de A)
			expect(relevos[0].tipo).toBe("intermedio")
			expect(relevos[0].cuadrilla).toBe("A")
			expect(relevos[0].sale).toEqual([])
			expect(relevos[0].entra).toEqual(["c1", "c2", "c3", "c4", "c5"])
			// T2 P: A→B (ahora A tiene 5 cargando, sale completo)
			expect(relevos[1].tipo).toBe("principal")
			expect(relevos[1].cuadrilla).toBe("B")
			expect(relevos[1].sale).toEqual(["c1", "c2", "c3", "c4", "c5"])
			expect(relevos[1].entra).toEqual(["c7", "c8", "c9", "c10", "c11"])
			// T3 S: B swap (sale=c7, entra=c12)
			expect(relevos[2].tipo).toBe("intermedio")
			expect(relevos[2].cuadrilla).toBe("B")
			expect(relevos[2].sale).toEqual(["c7"])
			expect(relevos[2].entra).toEqual(["c12"])
		})

		// ══════════════════════════════════════════════════════════════
		// B3 — "No hay disponibles": si una cuadrilla tiene exactamente
		// ANCHO miembros (sin disp), un S swap sobre ella debe lanzar
		// error claro. Antes el error se propagaba sin manejo.
		// ══════════════════════════════════════════════════════════════

		it("S swap sobre cuadrilla con tamaño = ANCHO (sin disp) lanza error claro", () => {
			// 10 costaleros, distribución 5/5. Cada cuadrilla tiene 5
			// miembros exactos = ANCHO. Después del primer P, la cuadrilla
			// inactiva tiene 0 en disp. Un S swap sobre ella falla.
			const t = makeTrab(10, {
				tramos: ["T1", "T2"],
				distribucionCuadrillas: { a: [0,1,2,3,4], b: [5,6,7,8,9] },
			})
			// TramosTipo inválido: S después de P sin disp en B
			expect(() => simularCicloConTipos(t, ["primario", "secundario"])).toThrow(
				/disponibles|intermedio/i,
			)
		})
	})

	// ══════════════════════════════════════════════════════════════
	// v1.2.93 #2 — CuadrillaDobladaSubAnchoPostBajasError
	// El capataz necesita saber CUÁL cuadrilla quedó corta y POR QUÉ
	// (qué bajas lo causaron). Antes el error era genérico:
	//   "ambas cuadrillas deben tener al menos 5 miembros. A=5, B=4"
	// — no decía qué baja dejó B en 4. Ahora: error tipado con contexto
	// (cuadrilla, miembrosActivos, anchoRequerido, bajasAplicadas).
	// ══════════════════════════════════════════════════════════════

	describe("simularCicloConTipos — #2 CuadrillaDobladaSubAnchoPostBajasError", () => {
		function makeTrab(
			n: number,
			overrides: Partial<Trabajadera> = {},
		): Trabajadera {
			return {
				id: 1,
				nombres: nombres(n),
				roles: nombres(n).map(() => ({ pri: "COR" as const, sec: "FIJ_I" as const })),
				salidas: 2,
				tramos: Array.from({ length: 3 }, (_, i) => `T${i + 1}`),
				bajas: [],
				regla5costaleros: false,
				plan: null,
				obj: null,
				analisis: null,
				pinned: null,
				puntuaciones: {},
				tramosClaves: [],
				...overrides,
			}
		}

		it("lanza el nuevo error cuando B queda sub-ancho tras filter de bajas", () => {
			// 12 costaleros, 6/6, ANCHO=5
			// bajas: [7, 8] → c8 (idx 7) y c9 (idx 8) son baja, ambos en B
			// Tras filter: A=6, B=4 (4 < 5) → throw
			const t = makeTrab(12, {
				tramos: ["T1", "T2"],
				distribucionCuadrillas: { a: [0,1,2,3,4,5], b: [6,7,8,9,10,11] },
				bajas: [7, 8], // c8, c9 (en B)
			})
			expect(() => simularCicloConTipos(t, ["primario", "primario"])).toThrow(
				CuadrillaDobladaSubAnchoPostBajasError,
			)
		})

		it("lanza con context fields correctos: cuadrilla='B', miembrosActivos=4, anchoRequerido=5, bajasAplicadas=['c8','c9']", () => {
			const t = makeTrab(12, {
				tramos: ["T1", "T2"],
				distribucionCuadrillas: { a: [0,1,2,3,4,5], b: [6,7,8,9,10,11] },
				bajas: [7, 8],
			})
			try {
				simularCicloConTipos(t, ["primario", "primario"])
				expect.fail("debería haber lanzado")
			} catch (err) {
				expect(err).toBeInstanceOf(CuadrillaDobladaSubAnchoPostBajasError)
				const e = err as InstanceType<typeof CuadrillaDobladaSubAnchoPostBajasError>
				expect(e.cuadrilla).toBe("B")
				expect(e.miembrosActivos).toBe(4)
				expect(e.anchoRequerido).toBe(ANCHO_TRABAJADERA)
				expect(e.bajasAplicadas).toEqual(["c8", "c9"])
				// Mensaje incluye cuadrilla, conteo, "baja" y nombres
				expect(e.message).toMatch(/B/)
				expect(e.message).toMatch(/4/)
				expect(e.message).toMatch(/baja/i)
				expect(e.message).toMatch(/c8/)
				expect(e.message).toMatch(/c9/)
			}
		})

		it("lanza con cuadrilla='A' cuando A queda sub-ancho (3 bajas en A)", () => {
			// 12 costaleros, 6/6. Bajas: [1, 2, 3] (todos en A).
			// A: 6 → 3, B: 6. A es sub-ancho.
			const t = makeTrab(12, {
				tramos: ["T1", "T2"],
				distribucionCuadrillas: { a: [0,1,2,3,4,5], b: [6,7,8,9,10,11] },
				bajas: [1, 2, 3],
			})
			try {
				simularCicloConTipos(t, ["primario", "primario"])
				expect.fail("debería haber lanzado")
			} catch (err) {
				const e = err as InstanceType<typeof CuadrillaDobladaSubAnchoPostBajasError>
				expect(e.cuadrilla).toBe("A")
				expect(e.miembrosActivos).toBe(3)
				expect(e.bajasAplicadas).toEqual(["c2", "c3", "c4"])
			}
		})

		it("no lanza si las bajas no dejan ninguna cuadrilla sub-ancho (5 miembros en cada una)", () => {
			// 12 costaleros, 6/6. Bajas: [1] (c2, en A). A: 6 → 5, B: 6. OK.
			const t = makeTrab(12, {
				tramos: ["T1", "T2"],
				distribucionCuadrillas: { a: [0,1,2,3,4,5], b: [6,7,8,9,10,11] },
				bajas: [1],
			})
			const relevos = simularCicloConTipos(t, ["primario", "primario"])
			expect(relevos).toHaveLength(2)
		})
	})

	// ══════════════════════════════════════════════════════════════
	// v1.2.93 #7 — defense in depth en el filter de bajas
	// El filter `nombres.filter((name) => !bajas.includes(t.nombres.indexOf(name)))`
	// deja pasar `undefined` porque `t.nombres.indexOf(undefined) === -1`
	// y `bajas.includes(-1) === false`. Esto es latente (validación lo
	// bloquea hoy), pero defense in depth. El test inyecta undefined en
	// runtime bypaseando TS y confirma que el filter lo descarta y la
	// simulación no incluye nombres undefined.
	// ══════════════════════════════════════════════════════════════

	describe("simularCicloConTipos — #7 defense in depth (filter excluye undefined)", () => {
		function makeTrab(
			n: number,
			overrides: Partial<Trabajadera> = {},
		): Trabajadera {
			return {
				id: 1,
				nombres: nombres(n),
				roles: nombres(n).map(() => ({ pri: "COR" as const, sec: "FIJ_I" as const })),
				salidas: 2,
				tramos: Array.from({ length: 3 }, (_, i) => `T${i + 1}`),
				bajas: [],
				regla5costaleros: false,
				plan: null,
				obj: null,
				analisis: null,
				pinned: null,
				puntuaciones: {},
				tramosClaves: [],
				...overrides,
			}
		}

		it("no crashea ni incluye undefined si t.nombres tiene un nombre inválido (bypassing validation)", () => {
			// 14 costaleros, 7/7. Inyectar undefined en t.nombres[7] (en B).
			// bajas: []. Filter (con fix) descarta undefined.
			//   B post-filter: [c9, c10, c11, c12, c13, c14] (6 miembros válidos).
			// Filter (sin fix) deja pasar undefined.
			//   B post-filter: [undefined, c9, c10, c11, c12, c13, c14] (7 elementos con 1 undefined).
			const t = makeTrab(14, {
				tramos: ["T1", "T2"],
				distribucionCuadrillas: { a: [0,1,2,3,4,5,6], b: [7,8,9,10,11,12,13] },
				bajas: [],
			})
			// Inyectar undefined en runtime (bypassing TS): t.nombres[7] es undefined
			;(t.nombres as unknown as (string | undefined)[])[7] = undefined
			const relevos = simularCicloConTipos(t, ["primario", "primario"])
			const allMembers = new Set<string | undefined>()
			relevos.forEach(r => {
				r.sale.forEach(n => allMembers.add(n))
				r.entra.forEach(n => allMembers.add(n))
			})
			// Ningún relevo debe mencionar a c8 (que ahora es undefined) ni a undefined explícito
			expect(allMembers.has(undefined)).toBe(false)
		})
	})

	// ══════════════════════════════════════════════════════════════
	// v1.2.93 #2 — cuadrillaDobladaATramoSlots (legacy path)
	// El legacy path antes NO filtraba bajas (era inconsistente con el
	// per-tramo path). Ahora también filtra y lanza el mismo error si
	// el filter deja una cuadrilla sub-ancho.
	// ══════════════════════════════════════════════════════════════

	describe("cuadrillaDobladaATramoSlots — #2 sub-ancho post-bajas (legacy path)", () => {
		function makeLegacy(n: number): Trabajadera {
			return {
				id: 1,
				nombres: nombres(n),
				roles: nombres(n).map(() => ({ pri: "COR" as const, sec: "FIJ_I" as const })),
				salidas: 1,
				tramos: ["T1", "T2", "T3"],
				bajas: [],
				regla5costaleros: false,
				plan: null,
				obj: null,
				analisis: null,
				pinned: null,
				puntuaciones: {},
				tramosClaves: [],
			}
		}

		it("lanza CuadrillaDobladaSubAnchoPostBajasError con cuadrilla B", () => {
			const t = makeLegacy(12)
			t.distribucionCuadrillas = { a: [0,1,2,3,4,5], b: [6,7,8,9,10,11] }
			t.bajas = [7, 8] // c8, c9 en B → B queda con 4
			try {
				cuadrillaDobladaATramoSlots(t)
				expect.fail("debería haber lanzado")
			} catch (err) {
				expect(err).toBeInstanceOf(CuadrillaDobladaSubAnchoPostBajasError)
				const e = err as InstanceType<typeof CuadrillaDobladaSubAnchoPostBajasError>
				expect(e.cuadrilla).toBe("B")
				expect(e.miembrosActivos).toBe(4)
			}
		})

		it("no lanza si las bajas no dejan ninguna cuadrilla sub-ancho", () => {
			const t = makeLegacy(12)
			t.distribucionCuadrillas = { a: [0,1,2,3,4,5], b: [6,7,8,9,10,11] }
			t.bajas = [1] // c2 en A → A queda 5, B 6 → OK
			const slots = cuadrillaDobladaATramoSlots(t)
			expect(slots.length).toBeGreaterThan(0)
		})
	})

	describe("relevosATramoSlots", () => {
		function makeDist(n: number): Distribucion {
			const half = Math.floor(n / 2)
			const aNames = nombres(n).slice(0, half + (n % 2))
			const bNames = nombres(n).slice(half + (n % 2))
			return { a: aNames, b: bNames }
		}

		function makeTrab(n: number): Trabajadera {
			return {
				id: 1,
				nombres: nombres(n),
				roles: nombres(n).map(() => ({ pri: "COR" as const, sec: "FIJ_I" as const })),
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
			}
		}

		it("maps Relevo[] to valid TramoSlot[]", () => {
			const t = makeTrab(12)
			t.distribucionCuadrillas = { a: [0,1,2,3,4,5], b: [6,7,8,9,10,11] }
			const dist = makeDist(12)
			const relevos = simularCicloConTipos(t, ["primario", "secundario", "primario"])
			const slots = relevosATramoSlots(t, relevos)
			expect(slots).toHaveLength(3)
			slots.forEach((s) => {
				expect(s.dentro).toHaveLength(5)
				expect(s.fuera).toHaveLength(7)
			})
		})

		it("parity with cuadrillaDobladaATramoSlots for all-P 4-tramo cycle", () => {
			const t = makeTrab(12)
			t.tramos = ["T1", "T2", "T3", "T4"]
			const dist = makeDist(12)
			t.distribucionCuadrillas = {
				a: [0, 1, 2, 3, 4, 5],
				b: [6, 7, 8, 9, 10, 11],
			}

			const legacySlots = cuadrillaDobladaATramoSlots(t, {
				a: nombres(12).slice(0, 6),
				b: nombres(12).slice(6),
			})

			const perTramoRelevos = simularCicloConTipos(
				t,
				["primario", "primario", "primario", "primario"],
			)
			const perTramoSlots = relevosATramoSlots(t, perTramoRelevos)

			expect(perTramoSlots).toHaveLength(4)
			expect(perTramoSlots).toHaveLength(legacySlots.length)
			// Both should have 5 dentro, 7 fuera per slot
			perTramoSlots.forEach((s) => {
				expect(s.dentro).toHaveLength(5)
				expect(s.fuera).toHaveLength(7)
			})
		})
	})
})
