// ══════════════════════════════════════════════════════════════════
// TESTS — datos.ts (factory y migración)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { datosVacios, migrarDatos, BANCO_DEFAULT } from "./datos";

describe("datos", () => {
	describe("BANCO_DEFAULT", () => {
		it("debería tener 12 tramos por defecto", () => {
			expect(BANCO_DEFAULT).toHaveLength(12);
			expect(BANCO_DEFAULT[0]).toBe("Salida Iglesia");
			expect(BANCO_DEFAULT[11]).toBe("Calle Estrecha");
		});
	});

	describe("datosVacios", () => {
		it("debería crear estructura completa con 7 trabajaderas", () => {
			const resultado = datosVacios();
			expect(resultado.banco).toEqual(BANCO_DEFAULT);
			expect(resultado.planes).toEqual([]);
			expect(resultado.trabajaderas).toHaveLength(7);
		});

		it("debería inicializar cada trabajadera con valores por defecto", () => {
			const resultado = datosVacios();
			const t = resultado.trabajaderas[0];
			expect(t.id).toBe(1);
			expect(t.nombres).toHaveLength(6);
			expect(t.salidas).toBe(2);
			expect(t.tramos).toHaveLength(3);
			expect(t.plan).toBeNull();
			expect(t.obj).toBeNull();
			expect(t.analisis).toBeNull();
			expect(t.pinned).toBeNull();
			expect(t.bajas).toEqual([]);
			expect(t.regla5costaleros).toBe(false);
			expect(t.puntuaciones).toEqual({});
			expect(t.tramosClaves).toEqual([]);
		});

		it("debería crear banco como copia independiente", () => {
			const d1 = datosVacios();
			const d2 = datosVacios();
			d1.banco.push("Extra");
			expect(d2.banco).not.toContain("Extra");
		});
	});

	describe("migrarDatos", () => {
		it("debería inicializar planes como array vacío en datos legacy", () => {
			const datosLegacy = {
				banco: ["Salida Iglesia"],
				trabajaderas: [
					{
						id: 1,
						nombres: ["Juan", "Pedro", "Luis", "Ana", "María", "Sofía"],
						salidas: 2,
						roles: [
							{ pri: "COS" as const, sec: "FIJ_I" as const },
							{ pri: "COS" as const, sec: "FIJ_I" as const },
							{ pri: "FIJ_I" as const, sec: "COS" as const },
							{ pri: "FIJ_D" as const, sec: "COS" as const },
							{ pri: "COR" as const, sec: "FIJ_I" as const },
							{ pri: "COR" as const, sec: "FIJ_I" as const },
						],
						pinned: null,
						bajas: [],
						regla5costaleros: false,
						puntuaciones: {},
						tramosClaves: [],
						tramos: ["Tramo 1 (T1)"],
						plan: null,
						obj: null,
						analisis: null,
					},
				],
			};
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const resultado = migrarDatos(datosLegacy as any);
			expect(resultado.planes).toBeDefined();
			expect(resultado.planes).toEqual([]);
		});

		it("debería migrar datos incompletos a estructura completa", () => {
			const datosIncompletos = {
				banco: ["Salida Iglesia", "Calle Real"],
				planes: [],
				trabajaderas: [
					{
						id: 1,
						nombres: null as unknown as string[],
						salidas: undefined,
						roles: [] as { pri: string; sec: string }[],
						pinned: undefined,
						bajas: undefined,
						regla5costaleros: undefined,
						puntuaciones: undefined,
						tramosClaves: undefined,
						plan: null,
						obj: null,
						analisis: null,
						tramos: [],
					},
				],
			};
			const resultado = migrarDatos(datosIncompletos);
			const t = resultado.trabajaderas[0];
			expect(t.nombres).toHaveLength(6);
			expect(t.salidas).toBe(2);
			expect(t.roles).toHaveLength(6);
			expect(t.pinned).toBeNull();
			expect(t.bajas).toEqual([]);
			expect(t.regla5costaleros).toBe(false);
			expect(t.puntuaciones).toEqual({});
			expect(t.tramosClaves).toEqual([]);
		});

		it("debería limpiar plan inválido con índice fuera de rango", () => {
			const datosConPlanInvalido = {
				banco: ["Salida Iglesia"],
				planes: [],
				trabajaderas: [
					{
						id: 1,
						nombres: ["Juan", "Pedro", "Luis", "Ana", "María", "Sofía"],
						salidas: 2,
						roles: [
							{ pri: "PAT" as const, sec: "FIJ_I" as const },
							{ pri: "COS" as const, sec: "FIJ_I" as const },
							{ pri: "PAT" as const, sec: "FIJ_I" as const },
							{ pri: "COS" as const, sec: "FIJ_I" as const },
							{ pri: "PAT" as const, sec: "FIJ_I" as const },
							{ pri: "COS" as const, sec: "FIJ_I" as const },
						],
						pinned: null,
						bajas: [],
						regla5costaleros: false,
						puntuaciones: {},
						tramosClaves: [],
						tramos: ["Tramo 1"],
						plan: [{ dentro: ["10"], fuera: [] }],
						obj: null,
						analisis: null,
					},
				],
			};
			const resultado = migrarDatos(datosConPlanInvalido);
			expect(resultado.trabajaderas[0].plan).toBeNull();
			expect(resultado.trabajaderas[0].obj).toBeNull();
			expect(resultado.trabajaderas[0].analisis).toBeNull();
		});

		it("debería corregir roles cuando longitud no coincide", () => {
			const datosConRolesInvalidos = {
				banco: ["Salida Iglesia"],
				planes: [],
				trabajaderas: [
					{
						id: 2,
						nombres: ["Juan", "Pedro", "Luis", "Ana", "María", "Sofía"],
						salidas: 2,
						roles: [
							{ pri: "PAT" as const, sec: "FIJ_I" as const },
							{ pri: "COS" as const, sec: "FIJ_I" as const },
						],
						pinned: null,
						bajas: [],
						regla5costaleros: false,
						puntuaciones: {},
						tramosClaves: [],
						tramos: ["Tramo 1"],
						plan: null,
						obj: null,
						analisis: null,
					},
				],
			};
			const resultado = migrarDatos(datosConRolesInvalidos);
			expect(resultado.trabajaderas[0].roles).toHaveLength(6);
		});

		it("debería truncar roles cuando hay más roles que nombres", () => {
			const datos = {
				banco: [],
				planes: [],
				trabajaderas: [
					{
						id: 1,
						nombres: ["Juan", "Pedro"],
						salidas: 2,
						roles: [
							{ pri: "PAT" as const, sec: "FIJ_I" as const },
							{ pri: "COS" as const, sec: "FIJ_I" as const },
							{ pri: "COR" as const, sec: "FIJ_I" as const },
							{ pri: "COR" as const, sec: "FIJ_I" as const },
						],
						pinned: null,
						bajas: [],
						regla5costaleros: false,
						puntuaciones: {},
						tramosClaves: [],
						tramos: ["Tramo 1"],
						plan: null,
						obj: null,
						analisis: null,
					},
				],
			};
			const resultado = migrarDatos(datos);
			expect(resultado.trabajaderas[0].roles).toHaveLength(2);
		});

		it("debería sanitizar roles sparse (undefined entries)", () => {
			const datos = {
				banco: [],
				planes: [],
				trabajaderas: [
					{
						id: 1,
						nombres: ["Juan", "Pedro", "Luis"],
						salidas: 2,
						roles: [
							{ pri: "PAT" as const, sec: "FIJ_I" as const },
							undefined as unknown as { pri: string; sec: string },
							{ pri: "COR" as const, sec: "FIJ_I" as const },
						],
						pinned: null,
						bajas: [],
						regla5costaleros: false,
						puntuaciones: {},
						tramosClaves: [],
						tramos: ["Tramo 1"],
						plan: null,
						obj: null,
						analisis: null,
					},
				],
			};
			const resultado = migrarDatos(datos);
			expect(resultado.trabajaderas[0].roles[1]).toEqual({
				pri: "COR",
				sec: "FIJ_I",
			});
		});
	});
});
