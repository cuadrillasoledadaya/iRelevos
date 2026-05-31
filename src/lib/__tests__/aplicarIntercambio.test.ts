import { describe, it, expect } from "vitest";
import { aplicarIntercambio } from "../algoritmos";
import type { Trabajadera } from "../types";

describe("aplicarIntercambio", () => {
	it("debería intercambiar costalero de dentro a fuera en el tramo destino", () => {
		// Given: trabajadera con plan donde ciB está dentro en ti2
		// El objetivo es que ciB pase de dentro a fuera, y ciA pase de fuera a dentro
		const trabajadera: Trabajadera = {
			id: 1,
			nombres: ["Juan", "Pedro", "Luis", "Ana", "María", "Sofía"],
			roles: [{ pri: "COR", sec: "FIJ_I" }],
			salidas: 2,
			tramos: ["Tramo 1", "Tramo 2"],
			bajas: [],
			regla5costaleros: false,
			plan: [
				{ dentro: [1, 2, 3, 4, 5], fuera: [0] }, // Juan fuera en tramo 0
				{ dentro: [0, 1, 3, 4, 5], fuera: [2] }, // Pedro (idx 1) está dentro en tramo 1
			],
			obj: { 0: 1, 1: 0, 2: 1, 3: 0, 4: 0, 5: 0 },
			analisis: null,
			pinned: null,
			puntuaciones: {},
			tramosClaves: [],
		};

		// When: aplicamos intercambio
		// ti1=0: Juan (idx 0) está fuera ✓
		// ti2=1: Pedro (idx 1) está dentro ✓
		const resultado = aplicarIntercambio(trabajadera, 0, 1, 0, 1);

		// Then: debe haber intercambiado en ti2
		expect(resultado).toBe(true);
		// En tramo 1: Pedro ahora debe estar fuera, Juan dentro
		expect(trabajadera.plan![1].fuera).toContain(1); // Pedro ahora fuera en tramo 1
		expect(trabajadera.plan![1].dentro).toContain(0); // Juan ahora dentro en tramo 1
	});

	it("debería retornar false si no hay plan", () => {
		// Given: trabajadera sin plan
		const trabajadera: Trabajadera = {
			id: 2,
			nombres: ["Juan", "Pedro"],
			roles: [{ pri: "COR", sec: "FIJ_I" }],
			salidas: 2,
			tramos: ["Tramo 1"],
			bajas: [],
			regla5costaleros: false,
			plan: null,
			obj: null,
			analisis: null,
			pinned: null,
			puntuaciones: {},
			tramosClaves: [],
		};

		// When: intentamos aplicar intercambio sin plan
		const resultado = aplicarIntercambio(trabajadera, 0, 0, 0, 1);

		// Then: debe retornar false
		expect(resultado).toBe(false);
	});

	it("debería retornar false si ciA no está fuera en ti1", () => {
		// Given: trabajadera con plan donde ciA no está fuera en ti1
		const trabajadera: Trabajadera = {
			id: 3,
			nombres: ["Juan", "Pedro", "Luis", "Ana", "María", "Sofía"],
			roles: [{ pri: "COR", sec: "FIJ_I" }],
			salidas: 2,
			tramos: ["Tramo 1", "Tramo 2"],
			bajas: [],
			regla5costaleros: false,
			plan: [
				{ dentro: [0, 1, 2, 3, 4], fuera: [5] }, // Solo Sofía fuera en tramo 0
				{ dentro: [1, 2, 3, 4, 5], fuera: [0] },
			],
			obj: { 0: 1, 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 },
			analisis: null,
			pinned: null,
			puntuaciones: {},
			tramosClaves: [],
		};

		// When: intentamos intercambiar a Pedro (idx 1) que está dentro en tramo 0
		// Pedro no está fuera en tramo 0
		const resultado = aplicarIntercambio(trabajadera, 0, 1, 1, 0);

		// Then: debe retornar false porque Pedro no está fuera en tramo 0
		expect(resultado).toBe(false);
	});

	it("debería recalcular objetivo y análisis después del intercambio", () => {
		// Given: trabajadera con plan
		const trabajadera: Trabajadera = {
			id: 4,
			nombres: ["Juan", "Pedro", "Luis", "Ana", "María", "Sofía"],
			roles: [{ pri: "COR", sec: "FIJ_I" }],
			salidas: 2,
			tramos: ["Tramo 1", "Tramo 2"],
			bajas: [],
			regla5costaleros: false,
			plan: [
				{ dentro: [1, 2, 3, 4, 5], fuera: [0] }, // Juan fuera 1 vez
				{ dentro: [0, 1, 3, 4, 5], fuera: [2] }, // Pedro dentro, no sale
			],
			obj: { 0: 1, 1: 0, 2: 1, 3: 0, 4: 0, 5: 0 },
			analisis: null,
			pinned: null,
			puntuaciones: {},
			tramosClaves: [],
		};

		// When: aplicamos intercambio válido
		aplicarIntercambio(trabajadera, 0, 1, 0, 1);

		// Then: debe haber recalculado objetivo y análisis
		expect(trabajadera.obj).toBeDefined();
		expect(trabajadera.analisis).toBeDefined();
		// Pedro ahora sale en tramo 1 (era 0, ahora es 1)
		expect(trabajadera.analisis!.conteo[1]).toBe(1);
	});
});
