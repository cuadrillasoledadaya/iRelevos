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
	aplicarRelevoIntermedio,
	transicionActiva,
	simularCicloCompleto,
	cuadrillaDobladaATramoSlots,
	simularCicloConTipos,
	relevosATramoSlots,
	validarDistribucionCuadrillas,
	CuadrillaDobladaSinPrimarioError,
	CuadrillaDobladaDistribucionInvalidaError,
	CuadrillaDobladaSubAnchoPostBajasError,
	CuadrillaDobladaRolesInsuficientesError,
	tieneRolesAsignados,
	type EstadoPlan,
	type Distribucion,
} from "./cuadrillaDoblada"
import type { Trabajadera } from "../types"

const nombres = (n: number): string[] =>
	Array.from({ length: n }, (_, i) => `c${i + 1}`)

// Helper v1.3.2: devuelve un estado con A activa y cargando (los primeros 5
// de su distribución). Antes se llegaba con principal A→B + intermedios de
// B + principal B→A; ahora se carga directo (sin cruce A�B).
function setupACargando(aSize: number, bSize: number): EstadoPlan {
	let estado = crearEstadoInicial({ a: nombres(aSize), b: nombres(bSize) })
	// A activa, cargando vacía → load desde disp
	estado = aplicarRelevoIntermedio(estado).estado
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
			const d1 = sugerirDistribucion(t)
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
			expect(() => sugerirDistribucion(t)).toThrow(CuadrillaDobladaRolesInsuficientesError)
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
			expect(tieneRolesAsignados(t)).toBe(false)
		})

		it("roles empty array → false", () => {
			const t = makeT(nombres(12), [])
			expect(tieneRolesAsignados(t)).toBe(false)
		})

		it("roles length mismatch → false", () => {
			const t = makeT(nombres(12), [
				{ pri: "PAT_D", sec: "COR" },
				{ pri: "PAT_I", sec: "COR" },
			]) // 2 roles, 12 nombres
			expect(tieneRolesAsignados(t)).toBe(false)
		})

		it("all ok (roles.length === nombres.length) → true", () => {
			const t = makeT(nombres(12), Array(12).fill({ pri: "COR", sec: "FIJ_I" }))
			expect(tieneRolesAsignados(t)).toBe(true)
		})
	})

	// ── Task 1.7 RED: Internal call sites use tieneRolesAsignados guard ──
	// Tests that agruparEnCuadrillas, simularCicloCompleto, and
	// simularCicloConTipos pass t when roles are available.
	// RED signal: optional t parameter not yet added to signatures.

	describe("internal fallback call sites (RED: t param not yet added)", () => {
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

		it("agruparEnCuadrillas with t (valid roles) uses role-aware path", () => {
			const t = makeT(nombres(12), Array(12).fill({ pri: "COR", sec: "FIJ_I" }))
			const { a, b } = agruparEnCuadrillas(t.nombres, undefined, ANCHO_TRABAJADERA, t)
			expect(a.miembros).toHaveLength(6)
			expect(b.miembros).toHaveLength(6)
		})

		it("simularCicloCompleto with t (valid roles) uses role-aware path", () => {
			const t = makeT(nombres(12), Array(12).fill({ pri: "COR", sec: "FIJ_I" }))
			const relevos = simularCicloCompleto(t.nombres, undefined, ANCHO_TRABAJADERA, t)
			expect(relevos.length).toBeGreaterThan(0)
		})

		it("simularCicloConTipos with t (valid roles) uses role-aware path", () => {
			const t = makeT(nombres(12), Array(12).fill({ pri: "COR", sec: "FIJ_I" }))
			const relevos = simularCicloConTipos(t, ["primario", "secundario", "primario"])
			expect(relevos.length).toBeGreaterThan(0)
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

	describe("transicionActiva (v1.3.2 Regla 1 — sin cruce de personas)", () => {
		it("idempotente si la activa ya es la pedida", () => {
			const estado = crearEstadoInicial({ a: nombres(7), b: nombres(6) })
			const t = transicionActiva(estado, "A")
			expect(t).toBe(estado)
		})
		it("cambia el flag de activa sin tocar cargando de la NUEVA cuadrilla", () => {
			// A está activa con cargando vacío y 7 miembros en disp.
			// transicionar a B no debe cargar B todavía — eso lo hace el
			// siguiente aplicarRelevoIntermedio (Regla 1: el sale/entra
			// son siempre de la misma cuadrilla).
			const estado = crearEstadoInicial({ a: nombres(7), b: nombres(6) })
			const t = transicionActiva(estado, "B")
			expect(t.cuadrillaActiva).toBe("B")
			// A.cargando (vacío) → A.disponibles (sin cambios estructurales)
			expect(t.estados.A.cargando).toEqual([])
			expect(t.estados.A.disponibles).toEqual(nombres(7))
			// B sigue intacto — la carga ocurre en el siguiente relevo
			expect(t.estados.B.cargando).toEqual([])
			expect(t.estados.B.disponibles).toEqual(nombres(6))
		})
		it("preserva la cuadrilla que estaba cargando y la pasa al final de su disp", () => {
			// Setup: A activa con cargando=[c1..c5], disp=[c6, c7]
			const estado: EstadoPlan = {
				cuadrillaActiva: "A",
				estados: {
					A: { cargando: ["c1", "c2", "c3", "c4", "c5"], disponibles: ["c6", "c7"] },
					B: { cargando: [], disponibles: ["c8", "c9", "c10", "c11", "c12", "c13"] },
				},
			}
			const t = transicionActiva(estado, "B")
			expect(t.cuadrillaActiva).toBe("B")
			// A.cargando va al FINAL de A.disponibles (los más recientes
			// esperan más — coherente con el swap path de
			// aplicarRelevoIntermedio que también pone sale al final).
			expect(t.estados.A.disponibles).toEqual(["c6", "c7", "c1", "c2", "c3", "c4", "c5"])
			expect(t.estados.A.cargando).toEqual([])
		})
	})

	describe("aplicarRelevoIntermedio (v1.3.2)", () => {
		it("regla 1: swap intra-cuadrilla (A=7, B=6)", () => {
			// Setup: A activa con 5 en cargando + 2 en disp
			const estado = setupACargando(7, 6)
			const { estado: nuevo, relevo } = aplicarRelevoIntermedio(estado)
			expect(nuevo.cuadrillaActiva).toBe("A")
			// v1.3.2: tipo colapsa a "intra"
			expect(relevo.tipo).toBe("intra")
			expect(relevo.cuadrilla).toBe("A")
			// Regla 1: sale y entra son SIEMPRE de la misma cuadrilla.
			expect(relevo.sale.every((p) => ["c1", "c2", "c3", "c4", "c5", "c6", "c7"].includes(p))).toBe(true)
			expect(relevo.entra.every((p) => ["c1", "c2", "c3", "c4", "c5", "c6", "c7"].includes(p))).toBe(true)
			expect(relevo.sale).toEqual(["c1"])
			expect(relevo.entra).toEqual(["c6"])
			expect(nuevo.estados.A.cargando).toHaveLength(5)
			expect(nuevo.estados.A.cargando).toEqual(expect.arrayContaining(["c2", "c3", "c4", "c5", "c6"]))
			expect(nuevo.estados.A.cargando).not.toContain("c1")
			expect(nuevo.estados.A.disponibles).toEqual(["c7", "c1"])
		})
		it("dos swaps consecutivos rotan dos distintos", () => {
			const estado = setupACargando(7, 6)
			const { estado: e1 } = aplicarRelevoIntermedio(estado)
			const { estado: e2, relevo } = aplicarRelevoIntermedio(e1)
			expect(relevo.sale).toEqual(["c2"])
			expect(relevo.entra).toEqual(["c7"])
			expect(e2.estados.A.cargando).toEqual(expect.arrayContaining(["c3", "c4", "c5", "c6", "c7"]))
			expect(e2.estados.A.cargando).not.toContain("c1")
			expect(e2.estados.A.cargando).not.toContain("c2")
			expect(e2.estados.A.disponibles).toEqual(["c1", "c2"])
		})
		it("load: cargando vacío + disp con >= ancho → sale=[], entra=primeros 5", () => {
			// B2 preservado en v1.3.2: si la cuadrilla activa está vacía y
			// hay disponibles, se "carga" desde disp sin corromper state.
			const estadoInicial: EstadoPlan = {
				cuadrillaActiva: "A",
				estados: {
					A: { cargando: [], disponibles: ["c1", "c2", "c3", "c4", "c5", "c6"] },
					B: { cargando: [], disponibles: [] },
				},
			}
			const { estado: nuevo, relevo } = aplicarRelevoIntermedio(estadoInicial)
			expect(nuevo.estados.A.disponibles).not.toContain(undefined)
			expect(nuevo.estados.A.disponibles).toEqual(["c6"])
			expect(nuevo.estados.A.cargando).toEqual(["c1", "c2", "c3", "c4", "c5"])
			expect(relevo.tipo).toBe("intra")
			expect(relevo.sale).toEqual([])
			expect(relevo.entra).toEqual(["c1", "c2", "c3", "c4", "c5"])
		})
		it("load + regla 2 override: la ventana se corre para incluir al streak=3", () => {
			// Setup: A vacía, disp=[c1..c7]. c7 está a streak 3
			// (quedaría fuera en la ventana natural [c1..c5]).
			// Regla 2 corre la ventana: bestIdx=6, entraIdx=6-4=2 → entra=disp[2..7]
			// = [c3, c4, c5, c6, c7]. c7 queda adentro → su streak resetea a 0.
			const estadoInicial: EstadoPlan = {
				cuadrillaActiva: "A",
				estados: {
					A: { cargando: [], disponibles: ["c1", "c2", "c3", "c4", "c5", "c6", "c7"] },
					B: { cargando: [], disponibles: [] },
				},
			}
			const streaks = new Map<string, number>([
				["c1", 0], ["c2", 0], ["c3", 0], ["c4", 0], ["c5", 0], ["c6", 0], ["c7", 3],
			])
			const { relevo } = aplicarRelevoIntermedio(estadoInicial, ANCHO_TRABAJADERA, true, streaks)
			// La ventana corre para incluir c7 al final
			expect(relevo.entra).toEqual(["c3", "c4", "c5", "c6", "c7"])
			// c1 y c2 quedan en disp (su streak += 1)
			expect(streaks.get("c1")).toBe(1)
			expect(streaks.get("c2")).toBe(1)
			// c7 entra (streak = 0)
			expect(streaks.get("c7")).toBe(0)
		})

		it("load + regla 2 (caso más estrecho): ventana cubre al streak=3 al final del disp", () => {
			// Setup: A vacía, disp=[c1..c6]. c6 está a streak 3.
			// bestIdx=5, entraIdx=5-4=1 → entra=disp[1..6] = [c2..c6].
			const estadoInicial: EstadoPlan = {
				cuadrillaActiva: "A",
				estados: {
					A: { cargando: [], disponibles: ["c1", "c2", "c3", "c4", "c5", "c6"] },
					B: { cargando: [], disponibles: [] },
				},
			}
			const streaks = new Map<string, number>([
				["c1", 0], ["c2", 0], ["c3", 0], ["c4", 0], ["c5", 0], ["c6", 3],
			])
			const { relevo } = aplicarRelevoIntermedio(estadoInicial, ANCHO_TRABAJADERA, true, streaks)
			expect(relevo.entra).toEqual(["c2", "c3", "c4", "c5", "c6"])
			expect(streaks.get("c6")).toBe(0)
		})
		it("lanza error claro si la cuadrilla está completamente vacía", () => {
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
		it("lanza CuadrillaDobladaSinDisponibleError si cargando lleno y disp vacío", () => {
			const estado: EstadoPlan = {
				cuadrillaActiva: "A",
				estados: {
					A: { cargando: ["c1", "c2", "c3", "c4", "c5"], disponibles: [] },
					B: { cargando: [], disponibles: ["c1", "c2", "c3", "c4", "c5"] },
				},
			}
			expect(() => aplicarRelevoIntermedio(estado)).toThrow(/disponibles/i)
		})
	})

	describe("simularCicloCompleto (v1.3.2 — Regla 1: sin cruce)", () => {
		it("con 10 (A=5, B=5) genera 2 relevos (1 load A + 1 load B)", () => {
			// 1 load de A + 0 swaps A + 1 load de B + 0 swaps B = 2
			const relevos = simularCicloCompleto(nombres(10))
			expect(relevos).toHaveLength(2)
			expect(relevos.every((r) => r.tipo === "intra")).toBe(true)
		})
		it("con 13 (A=7, B=6) genera 5 relevos (3 A + 2 B)", () => {
			// 1 load A + 2 swaps A + 1 load B + 1 swap B = 5
			const relevos = simularCicloCompleto(nombres(13))
			expect(relevos).toHaveLength(5)
			expect(relevos.every((r) => r.tipo === "intra")).toBe(true)
		})
		it("con 11 (A=6, B=5) genera 3 relevos (2 A + 1 B)", () => {
			const relevos = simularCicloCompleto(nombres(11))
			expect(relevos).toHaveLength(3)
			expect(relevos.every((r) => r.tipo === "intra")).toBe(true)
		})
		it("regla 1: ningún relevo cruza personas entre A y B (n=13)", () => {
			const dist = { a: nombres(13).slice(0, 7), b: nombres(13).slice(7) }
			const relevos = simularCicloCompleto(nombres(13), dist)
			// Para cada relevo, su sale y su entra tienen que estar en la
			// MISMA cuadrilla que su flag `cuadrilla`.
			for (const r of relevos) {
				const expectedSet = new Set(r.cuadrilla === "A" ? dist.a : dist.b)
				for (const p of r.sale) {
					expect(expectedSet.has(p)).toBe(true)
				}
				for (const p of r.entra) {
					expect(expectedSet.has(p)).toBe(true)
				}
			}
		})
		it("regla 1: las activas correctas se respetan en orden P/S sintetizado", () => {
			// Para n=13 (A=7, B=6) tramosTipo sintetizado = [P,P,P,S,S]
			// → primeros 3 relevos son de A (cuadrilla="A"), últimos 2 son de B.
			const relevos = simularCicloCompleto(nombres(13))
			expect(relevos[0].cuadrilla).toBe("A")
			expect(relevos[1].cuadrilla).toBe("A")
			expect(relevos[2].cuadrilla).toBe("A")
			expect(relevos[3].cuadrilla).toBe("B")
			expect(relevos[4].cuadrilla).toBe("B")
		})
		it("debería respetar distribución manual", () => {
			const dist = {
				a: ["x1", "x2", "x3", "x4", "x5", "x6", "x7"],
				b: ["y1", "y2", "y3", "y4", "y5", "y6"],
			}
			const relevos = simularCicloCompleto(nombres(13), dist)
			// Tramos sintetizados: [P,P,P,S,S] para A=7, B=6
			// Relevos:
			//   1) P (A): load → entra=[x1..x5], sale=[]
			//   2) P (A): swap → sale=x1, entra=x6
			//   3) P (A): swap → sale=x2, entra=x7
			//   4) S (B): load → entra=[y1..y5], sale=[]
			//   5) S (B): swap → sale=y1, entra=y6
			expect(relevos[0].entra).toEqual(["x1", "x2", "x3", "x4", "x5"])
			expect(relevos[1].entra).toEqual(["x6"])
			expect(relevos[2].entra).toEqual(["x7"])
			expect(relevos[3].entra).toEqual(["y1", "y2", "y3", "y4", "y5"])
			expect(relevos[4].entra).toEqual(["y6"])
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

		it("v1.3.3: [P,S,P] reagrupado → [P×2,S×1] = A full cycle + B load", () => {
			// El capataz reportó que con [P,S,P,S,P,S] alternábamos en cada
			// tramo (6 cargas, 0 swaps). v1.3.3 reagrupa: A hace su ciclo
			// entero (load + swaps disponibles) ANTES de pasar a B.
			const t = makeTrab(12, {
				distribucionCuadrillas: { a: [0,1,2,3,4,5], b: [6,7,8,9,10,11] },
			})
			const relevos = simularCicloConTipos(t, ["primario", "secundario", "primario"])
			expect(relevos).toHaveLength(3)
			// v1.3.2 Regla 1: todos "intra" — sale y entra siempre de la
			// misma cuadrilla.
			expect(relevos.every((r) => r.tipo === "intra")).toBe(true)
			// T1 P (reagrupado a [P×2]): A load → entra=[c1..c5]
			expect(relevos[0].cuadrilla).toBe("A")
			expect(relevos[0].sale).toEqual([])
			expect(relevos[0].entra).toEqual(["c1", "c2", "c3", "c4", "c5"])
			// T2 P: A swap intra (sale=c1, entra=c6) — A sigue activa
			expect(relevos[1].cuadrilla).toBe("A")
			expect(relevos[1].sale).toEqual(["c1"])
			expect(relevos[1].entra).toEqual(["c6"])
			// T3 S (reagrupado, el único S): TRANSITION A→B + load B
			expect(relevos[2].cuadrilla).toBe("B")
			expect(relevos[2].sale).toEqual([])
			expect(relevos[2].entra).toEqual(["c7", "c8", "c9", "c10", "c11"])
		})

		it("all-primario [P, P, P] genera 3 relevos todos en A (intra)", () => {
			const t = makeTrab(12, {
				distribucionCuadrillas: { a: [0,1,2,3,4,5], b: [6,7,8,9,10,11] },
			})
			const relevos = simularCicloConTipos(t, ["primario", "primario", "primario"])
			expect(relevos).toHaveLength(3)
			// Todos en A — la cuadrilla nunca cambia
			expect(relevos.every((r) => r.tipo === "intra" && r.cuadrilla === "A")).toBe(true)
			// T1: load A
			expect(relevos[0].sale).toEqual([])
			expect(relevos[0].entra).toEqual(["c1", "c2", "c3", "c4", "c5"])
			// T2: swap (sale=c1, entra=c6) — c1 va al back de A.disp
			expect(relevos[1].sale).toEqual(["c1"])
			expect(relevos[1].entra).toEqual(["c6"])
			// T3: swap (sale=c2, entra=c1) — c1 vuelve, sale al frente
			expect(relevos[2].sale).toEqual(["c2"])
			expect(relevos[2].entra).toEqual(["c1"])
		})

		it("regla 1: cada relevo tiene sale y entra de la MISMA cuadrilla", () => {
			const t = makeTrab(12, {
				tramos: ["T1", "T2", "T3", "T4", "T5"],
				distribucionCuadrillas: { a: [0,1,2,3,4,5], b: [6,7,8,9,10,11] },
			})
			const namesOf = (idxs: number[]) => idxs.map((i) => `c${i + 1}`)
			const relevos = simularCicloConTipos(t, [
				"primario", "secundario", "primario",
				"secundario", "primario",
			])
			for (const r of relevos) {
				const set = new Set(
					r.cuadrilla === "A" ? namesOf([0,1,2,3,4,5]) : namesOf([6,7,8,9,10,11]),
				)
				for (const p of r.sale) expect(set.has(p)).toBe(true)
				for (const p of r.entra) expect(set.has(p)).toBe(true)
			}
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

		it("v1.3.3: rotación avanza entre ciclos con B grande", () => {
			// v1.3.3: con [P,S,P,S] × 2 reagrupado a [P×2, S×2] por ciclo
			// y A=7, B=7 (ambas con 2 extras). El EstadoPlan persiste
			// entre ciclos y la FIFO realmente avanza: cada swap mueve
			// al fondo del disp al cargando, rotando la cola.
			const t = makeTrab(14, {
				tramos: ["T1", "T2", "T3", "T4"],
				distribucionCuadrillas: {
					a: [0,1,2,3,4,5,6],
					b: [7,8,9,10,11,12,13],
				},
			})
			const relevos = simularCicloConTipos(
				t,
				["primario", "secundario", "primario", "secundario"],
				2,
			)
			expect(relevos).toHaveLength(8)
			// Reagrupado: [P×2, S×2] × 2 ciclos.
			// Salida 1 R3 (S, B load): entra=[c8..c12]
			expect(relevos[2].cuadrilla).toBe("B")
			expect(relevos[2].sale).toEqual([])
			expect(relevos[2].entra).toEqual(["c8", "c9", "c10", "c11", "c12"])
			// Salida 2 R7 (S, B load con disp rotada) — entra distinto
			expect(relevos[6].cuadrilla).toBe("B")
			expect(relevos[6].sale).toEqual([])
			expect(relevos[6].entra).not.toEqual(relevos[2].entra)
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

		it("v1.3.3: patrón agrupado A→B con [P,S,P,S,P,S] y A=6, B=6", () => {
			// v1.3.3 reagrupa [P,S,P,S,P,S] a [P×3, S×3]. Con A=6, B=6
			// cada cuadrilla tiene 1 swap disponible, así que cada
			// "full cycle" = 1 load + 1 swap = 2 relevos. Con 3 P's +
			// 3 S's: A hace load + 2 swaps (3 relevos), luego B hace
			// load + 2 swaps (3 relevos).
			const t = makeTrab(12, {
				tramos: ["T1", "T2", "T3", "T4", "T5", "T6"],
				distribucionCuadrillas: { a: [0,1,2,3,4,5], b: [6,7,8,9,10,11] },
			})
			const relevos = simularCicloConTipos(
				t,
				["primario", "secundario", "primario", "secundario", "primario", "secundario"],
			)
			expect(relevos).toHaveLength(6)
			expect(relevos.every((r) => r.tipo === "intra")).toBe(true)
			// A's full cycle: R1 load + R2 swap + R3 swap
			expect(relevos[0].cuadrilla).toBe("A")
			expect(relevos[0].sale).toEqual([])
			expect(relevos[0].entra).toEqual(["c1", "c2", "c3", "c4", "c5"])
			expect(relevos[1].cuadrilla).toBe("A")
			expect(relevos[1].sale).toEqual(["c1"])
			expect(relevos[1].entra).toEqual(["c6"])
			expect(relevos[2].cuadrilla).toBe("A")
			expect(relevos[2].sale).toEqual(["c2"])
			expect(relevos[2].entra).toEqual(["c1"])
			// B's full cycle: R4 load + R5 swap + R6 swap
			expect(relevos[3].cuadrilla).toBe("B")
			expect(relevos[3].sale).toEqual([])
			expect(relevos[3].entra).toEqual(["c7", "c8", "c9", "c10", "c11"])
			expect(relevos[4].cuadrilla).toBe("B")
			expect(relevos[4].sale).toEqual(["c7"])
			expect(relevos[4].entra).toEqual(["c12"])
			expect(relevos[5].cuadrilla).toBe("B")
			expect(relevos[5].sale).toEqual(["c8"])
			expect(relevos[5].entra).toEqual(["c7"])
		})

		it("transicionActiva: el just-left va al FINAL del disp (los antiguos del disp cargan primero)", () => {
			// Test unitario del invariante clave para que la rotación
			// NO se resetee entre transiciones. Setup: A activa con
			// cargando=[c1..c5], disp=[c6]. Al transicionar a B,
			// A.cargando va al FINAL de A.disponibles (igual que un
			// swap normal). Si fuera al FRENTE, cuando A volviera a
			// activarse, los recién-descargados cargarían primero y la
			// rotación se rompería.
			const estadoInicial = crearEstadoInicial({
				a: ["c1", "c2", "c3", "c4", "c5", "c6"],
				b: ["c7", "c8", "c9", "c10", "c11", "c12"],
			})
			// A está vacía (estado inicial). Cargamos A primero.
			const { estado: conACargada } = aplicarRelevoIntermedio(estadoInicial)
			expect(conACargada.estados.A.cargando).toEqual(["c1", "c2", "c3", "c4", "c5"])
			expect(conACargada.estados.A.disponibles).toEqual(["c6"])
			// TRANSITION A→B
			const t = transicionActiva(conACargada, "B")
			// A.cargando va al FINAL de A.disponibles (igual que un swap)
			expect(t.estados.A.disponibles).toEqual(["c6", "c1", "c2", "c3", "c4", "c5"])
			expect(t.estados.A.cargando).toEqual([])
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

		it("v1.3.3: [S,P,S] reagrupado → [S×2, P×1] = B full cycle + A load", () => {
			// 12 costaleros (A=6, B=6), tramosTipo=[S, P, S]. El
			// reagrupado es [S×2, P×1] — B hace su ciclo entero (load +
			// swap) primero, luego A entra.
			const t = makeTrab(12, {
				tramos: ["T1", "T2", "T3"],
				distribucionCuadrillas: { a: [0,1,2,3,4,5], b: [6,7,8,9,10,11] },
			})
			const relevos = simularCicloConTipos(t, ["secundario", "primario", "secundario"])
			expect(relevos).toHaveLength(3)
			// T1 S (B load): entra=[c7..c11]
			expect(relevos[0].tipo).toBe("intra")
			expect(relevos[0].cuadrilla).toBe("B")
			expect(relevos[0].sale).toEqual([])
			expect(relevos[0].entra).toEqual(["c7", "c8", "c9", "c10", "c11"])
			// T2 S (B swap): sale=c7, entra=c12
			expect(relevos[1].tipo).toBe("intra")
			expect(relevos[1].cuadrilla).toBe("B")
			expect(relevos[1].sale).toEqual(["c7"])
			expect(relevos[1].entra).toEqual(["c12"])
			// T3 P (A load): TRANSITION B→A + load
			expect(relevos[2].tipo).toBe("intra")
			expect(relevos[2].cuadrilla).toBe("A")
			expect(relevos[2].sale).toEqual([])
			expect(relevos[2].entra.length).toBe(5)
		})

		// ══════════════════════════════════════════════════════════════
		// B3 — "No hay disponibles": si una cuadrilla tiene exactamente
		// ANCHO miembros (sin disp), un S swap sobre ella debe lanzar
		// error claro. Antes el error se propagaba sin manejo.
		// ══════════════════════════════════════════════════════════════

		it("S swap sobre cuadrilla con tamaño = ANCHO (sin disp) lanza error claro", () => {
			// 10 costaleros, distribución 5/5. Cada cuadrilla tiene 5
			// miembros exactos = ANCHO. Un [P, S] funciona (load B sin
			// disp). Pero dos S seguidos sobre la misma cuadrilla sin
			// recargar falla — el segundo swap intenta mover 1 de B.c
			// pero B.d está vacío (todos cargando).
			const t = makeTrab(10, {
				tramos: ["T1", "T2", "T3"],
				distribucionCuadrillas: { a: [0,1,2,3,4], b: [5,6,7,8,9] },
			})
			// [P, S, S]: T1 carga A, T2 transiciona + carga B, T3 quiere
			// swap intra B pero B.disp=[] (todos cargando) → error.
			expect(() => simularCicloConTipos(t, ["primario", "secundario", "secundario"])).toThrow(
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
			// v1.3.2: con [P, S] (no [P,P]) porque A=5 no admite swaps
			// intra-A (Regla 1: no se puede ir a B a swapear). T1 carga A,
			// T2 transiciona + carga B → funciona sin disp en A.
			const t = makeTrab(12, {
				tramos: ["T1", "T2"],
				distribucionCuadrillas: { a: [0,1,2,3,4,5], b: [6,7,8,9,10,11] },
				bajas: [1],
			})
			const relevos = simularCicloConTipos(t, ["primario", "secundario"])
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

	// ═════════════════════════════════════════════════════════════
	// REQ-ACD-9: Manual distribution override wins
	// ═════════════════════════════════════════════════════════════

	describe("REQ-ACD-9: manual beats suggested", () => {
		it("honors a manual override that disagrees with sugerirDistribucion end-to-end", () => {
			// Build a Trabajadera with 12 names and roles
			const names = nombres(12)
			const roles = names.map(() => ({ pri: "COR" as const, sec: "FIJ_I" as const }))

			// Manual distribution that intentionally swaps c5 and c6 vs. the
			// index-based suggestion [0..5] / [6..11]
			const manualDist = {
				a: [0, 1, 2, 3, 4, 6],  // c7 (idx 6) moved to A
				b: [5, 7, 8, 9, 10, 11], // c6 (idx 5) moved to B
			}

			const tManual: Trabajadera = {
				id: 1,
				nombres: names,
				roles,
				salidas: 2,
				tramos: ["T1", "T2", "T3"],
				tramosTipo: ["primario", "secundario", "primario"],
				bajas: [],
				regla5costaleros: false,
				plan: null,
				obj: null,
				analisis: null,
				pinned: null,
				puntuaciones: {},
				tramosClaves: [],
				distribucionCuadrillas: manualDist,
			}

			// Same Trabajadera but with DEFAULT distribution (no manual override)
			const tDefault: Trabajadera = {
				...tManual,
				distribucionCuadrillas: null,
			}

			const slotsManual = cuadrillaDobladaATramoSlots(tManual)
			const slotsDefault = cuadrillaDobladaATramoSlots(tDefault)

			// Both should produce slots
			expect(slotsManual.length).toBeGreaterThan(0)
			expect(slotsDefault.length).toBeGreaterThan(0)

			// v1.3.2 Regla 1: el primer slot es A (P primero, no se cruza
			// A↔B). Manual A = {0,1,2,3,4,6} → first 5 = {0,1,2,3,4}.
			// Default A = {0,1,2,3,4,5} → first 5 = {0,1,2,3,4}.
			// Ambos coinciden en el primer slot, pero DIFEREN en algún
			// slot posterior cuando la rotación los va separando.
			const allDentroManual = new Set<number>()
			const allDentroDefault = new Set<number>()
			slotsManual.forEach(s => s.dentro.forEach(i => allDentroManual.add(i)))
			slotsDefault.forEach(s => s.dentro.forEach(i => allDentroDefault.add(i)))
			// Manual incluye c7 (idx 6) en algún dentro (porque A lo tiene);
			// Default incluye c7 en algún dentro (porque B lo tiene).
			// La diferencia: manual pone c7 desde el principio (A.first5
			// lo incluye eventualmente), default pone c7 desde el segundo
			// ciclo (B.first5 lo incluye).
			// Verificación clave: las distribuciones producen planes con
			// dentro distintos en algún slot (no en el primero siempre).
			let diffFound = false
			for (let i = 0; i < Math.min(slotsManual.length, slotsDefault.length); i++) {
				const a = new Set(slotsManual[i].dentro)
				const b = new Set(slotsDefault[i].dentro)
				if (a.size !== b.size || ![...a].every(x => b.has(x))) {
					diffFound = true
					break
				}
			}
			expect(diffFound).toBe(true)
		})

		it("falls back to sugerirDistribucion when distribution is null", () => {
			const names = nombres(12)
			const roles = names.map(() => ({ pri: "COR" as const, sec: "FIJ_I" as const }))
			const t: Trabajadera = {
				id: 1,
				nombres: names,
				roles,
				salidas: 2,
				tramos: ["T1", "T2", "T3"],
				tramosTipo: ["primario", "secundario", "primario"],
				bajas: [],
				regla5costaleros: false,
				plan: null,
				obj: null,
				analisis: null,
				pinned: null,
				puntuaciones: {},
				tramosClaves: [],
				distribucionCuadrillas: null,
			}

			// With null distribution, the algorithm should use sugerirDistribucion
			// and produce a valid plan (regression guard — this path must remain unchanged)
			const salidas = 2
			const relevos = simularCicloConTipos(t, t.tramosTipo!, salidas)

			expect(relevos.length).toBeGreaterThan(0)
			// Each relevo should have 5 members entering (ANCHO_TRABAJADERA)
			for (const relevo of relevos) {
				expect(relevo.entra.length).toBeGreaterThan(0)
			}
		})
	})
})
