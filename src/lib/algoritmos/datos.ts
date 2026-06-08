// ══════════════════════════════════════════════════════════════════
// DATOS — factory y migración de datos de perfil
// ══════════════════════════════════════════════════════════════════

import type { DatosPerfil } from "../types";
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

export function datosVacios(): DatosPerfil {
	return {
		banco: [...BANCO_DEFAULT],
		planes: [],
		trabajaderas: Array.from({ length: 7 }, (_, i) => ({
			id: i + 1,
			nombres: defaultNombres(6),
			salidas: 2,
			roles: defaultRoles(6, i + 1),
			tramos: [
				`Tramo 1 (T${i + 1})`,
				`Tramo 2 (T${i + 1})`,
				`Tramo 3 (T${i + 1})`,
			],
			plan: null,
			obj: null,
			analisis: null,
			pinned: null,
			bajas: [],
			regla5costaleros: false,
			puntuaciones: {},
			boquilla: {},
			tramosClaves: [],
		})),
	};
}

export function migrarDatos(datos: DatosPerfil): DatosPerfil {
	if (!datos.planes) {
		datos.planes = [];
	}
	datos.trabajaderas = datos.trabajaderas.map((t) => {
		if (!t.nombres) {
			t.nombres = defaultNombres(6);
		}
		if (!t.salidas) t.salidas = 2;
		if (!t.pinned) t.pinned = null;
		if (!t.bajas) t.bajas = [];
		if (!t.regla5costaleros) t.regla5costaleros = false;
		if (!t.roles) {
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
