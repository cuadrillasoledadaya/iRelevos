// ══════════════════════════════════════════════════════════════════
// DATOS — factory y migración de datos de perfil
// ══════════════════════════════════════════════════════════════════

import type { DatosPerfil, Trabajadera } from "../types";
import { defaultNombres } from "../nombres";
import { defaultRoles } from "../roles";

const BANCO_DEFAULT = [
	"Salida Iglesia",
	"Calle Real",
	"Plaza Mayor",
	"Calle Nueva",
	"Vuelta Esquina",
	"Bajada Cuesta",
	"Paso Puerta",
	"Tramo Largo",
	"Calle Ancha",
	"Entrada Carrera",
	"Final Carrera",
	"Calle Estrecha",
];

export { BANCO_DEFAULT };

/**
 * Nº de costaleros por defecto de una trabajadera.
 *
 * v1.4.9: una trabajadera nace SIEMPRE con 6 costaleros. Antes esta forma
 * estaba duplicada en 4 sitios (datosVacios, addTrab, createPaso, resetTodo)
 * y cada copia diferia: unas usaban `nombres: []` (sin costaleros) y otras
 * `salidas: 1` con 2 tramos. Esa divergencia es la que hacia que un paso
 * recien creado fuera inservible para el capataz.
 */
export const COSTALEROS_POR_TRABAJADERA = 6;

/**
 * Trabajadera nueva (forma canonica de la app).
 *
 * 6 costaleros placeholder, roles por defecto, 2 salidas y 3 tramos
 * (`Tramo N (T{id})`) - identico a `datosVacios()` y a `addTrab()`.
 * Cada llamada devuelve arrays independientes (nunca referencias compartidas).
 */
export function crearTrabajaderaBase(id: number): Trabajadera {
	return {
		id,
		nombres: defaultNombres(COSTALEROS_POR_TRABAJADERA),
		salidas: 2,
		roles: defaultRoles(COSTALEROS_POR_TRABAJADERA, id),
		tramos: [
			`Tramo 1 (T${id})`,
			`Tramo 2 (T${id})`,
			`Tramo 3 (T${id})`,
		],
		tramosTipo: ["primario", "primario", "primario"],
		plan: null,
		obj: null,
		analisis: null,
		pinned: null,
		bajas: [],
		regla5costaleros: false,
		puntuaciones: {},
		boquilla: {},
		tramosClaves: [],
	};
}

export function datosVacios(): DatosPerfil {
	return {
		banco: [...BANCO_DEFAULT],
		planes: [],
		trabajaderas: Array.from({ length: 7 }, (_, i) => crearTrabajaderaBase(i + 1)),
	};
}

export function migrarDatos(datos: DatosPerfil): DatosPerfil {
	if (!datos.planes) {
		datos.planes = [];
	}
	datos.trabajaderas = datos.trabajaderas.map((t) => {
		// v1.4.9: reparar tambien el array VACIO. Los pasos creados antes del
		// fix se guardaron con `nombres: []` (truthy) -> el `if (!t.nombres)`
		// original no los reparaba y el capataz tenia que crearlos a mano.
		if (!t.nombres || t.nombres.length === 0) {
			t.nombres = defaultNombres(COSTALEROS_POR_TRABAJADERA);
		}
		if (!t.salidas) t.salidas = 2;
		if (!t.pinned) t.pinned = null;
		if (!t.bajas) t.bajas = [];
		if (!t.regla5costaleros) t.regla5costaleros = false;
		if (!t.roles || t.roles.length === 0) {
			t.roles = defaultRoles(t.nombres.length, t.id);
		} else if (t.roles.length !== t.nombres.length) {
			// Rellenar o truncar sin perder los roles existentes
			while (t.roles.length < t.nombres.length) {
				t.roles.push({ pri: "COR", sec: "FIJ_I" });
			}
			if (t.roles.length > t.nombres.length) {
				t.roles = t.roles.slice(0, t.nombres.length);
			}
		}
		// Sanitizar: rellenar huecos undefined (arrays sparse)
		for (let i = 0; i < t.roles.length; i++) {
			if (!t.roles[i]) {
				t.roles[i] = { pri: "COR", sec: "FIJ_I" };
			}
		}
		if (!t.puntuaciones) t.puntuaciones = {};
		if (!t.boquilla) t.boquilla = {};
		if (!t.tramosClaves) t.tramosClaves = [];
		if (t.cuadrillaDoblada === undefined) t.cuadrillaDoblada = false;
		if (t.distribucionCuadrillas === undefined) t.distribucionCuadrillas = null;

		// Default tramosTipo to all-primario; repair length drift
		if (!t.tramosTipo) {
			t.tramosTipo = Array(t.tramos.length).fill("primario");
		} else if (t.tramosTipo.length !== t.tramos.length) {
			// Rebuild to match tramos length, preserving existing entries where possible
			const old = t.tramosTipo;
			t.tramosTipo = Array.from({ length: t.tramos.length }, (_, i) =>
				i < old.length ? old[i] : "primario",
			);
		}

		if (t.plan && t.plan[0]?.dentro?.length) {
			const idx = +t.plan[0].dentro[0];
			if (isNaN(idx) || idx >= t.nombres.length) {
				t.plan = null;
				t.obj = null;
				t.analisis = null;
			}
		}
		return t;
	});
	return datos;
}
