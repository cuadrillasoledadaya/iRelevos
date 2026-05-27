import { describe, it, expect } from "vitest";
import {
	ROL_JERARQUIA,
	rolBase,
	rolLado,
	makeRolCode,
	rolesDisponibles,
	rolLabel,
	rolEmoji,
	defaultRoles,
	getRol,
	esRolHabitual,
	idealRoles,
	estructuraPaso,
	rolDePosicion,
	asignarRolesTramo,
	getDentroFisico,
	ordenarDentroFisico,
} from "../roles";
import type { Trabajadera, TramoSlot } from "../types";

describe("roles", () => {
	describe("ROL_JERARQUIA", () => {
		it("debería tener jerarquías correctas para todos los roles", () => {
			expect(ROL_JERARQUIA.PAT_D).toBe(3);
			expect(ROL_JERARQUIA.PAT_I).toBe(3);
			expect(ROL_JERARQUIA.COS_D).toBe(3);
			expect(ROL_JERARQUIA.COS_I).toBe(3);
			expect(ROL_JERARQUIA.FIJ_D).toBe(2);
			expect(ROL_JERARQUIA.FIJ_I).toBe(2);
			expect(ROL_JERARQUIA.COR).toBe(1);
		});
	});

	describe("rolBase", () => {
		it("debería extraer el rol base sin lado", () => {
			expect(rolBase("PAT_D")).toBe("PAT");
			expect(rolBase("PAT_I")).toBe("PAT");
			expect(rolBase("COS_D")).toBe("COS");
			expect(rolBase("COS_I")).toBe("COS");
			expect(rolBase("FIJ_D")).toBe("FIJ");
			expect(rolBase("FIJ_I")).toBe("FIJ");
			expect(rolBase("COR")).toBe("COR");
		});
	});

	describe("rolLado", () => {
		it("debería extraer el lado", () => {
			expect(rolLado("PAT_D")).toBe("D");
			expect(rolLado("COS_I")).toBe("I");
			expect(rolLado("FIJ_D")).toBe("D");
			expect(rolLado("COR")).toBeNull();
		});
	});

	describe("makeRolCode", () => {
		it("debería construir RolCode desde base + lado", () => {
			expect(makeRolCode("PAT", "D")).toBe("PAT_D");
			expect(makeRolCode("PAT", "I")).toBe("PAT_I");
			expect(makeRolCode("COS", "D")).toBe("COS_D");
			expect(makeRolCode("FIJ", "I")).toBe("FIJ_I");
			expect(makeRolCode("COR", "D")).toBe("COR");
			expect(makeRolCode("COR", null)).toBe("COR");
			// default a derecho si no se especifica
			expect(makeRolCode("PAT", null)).toBe("PAT_D");
		});
	});

	describe("rolesDisponibles", () => {
		it("debería retornar roles con lado para paso primario", () => {
			expect(rolesDisponibles(1)).toEqual([
				"PAT_D",
				"PAT_I",
				"FIJ_D",
				"FIJ_I",
				"COR",
			]);
		});

		it("debería retornar roles con lado para tid 7", () => {
			expect(rolesDisponibles(7)).toEqual([
				"PAT_D",
				"PAT_I",
				"FIJ_D",
				"FIJ_I",
				"COR",
			]);
		});

		it("debería retornar roles con lado para paso secundario", () => {
			expect(rolesDisponibles(2)).toEqual([
				"COS_D",
				"COS_I",
				"FIJ_D",
				"FIJ_I",
				"COR",
			]);
			expect(rolesDisponibles(5)).toEqual([
				"COS_D",
				"COS_I",
				"FIJ_D",
				"FIJ_I",
				"COR",
			]);
		});
	});

	describe("rolLabel", () => {
		it("debería retornar etiquetas con lado para roles con variante", () => {
			expect(rolLabel("PAT_D")).toBe("Patero Der");
			expect(rolLabel("PAT_I")).toBe("Patero Izq");
			expect(rolLabel("COS_D")).toBe("Costero Der");
			expect(rolLabel("COS_I")).toBe("Costero Izq");
			expect(rolLabel("FIJ_D")).toBe("Fijador Der");
			expect(rolLabel("FIJ_I")).toBe("Fijador Izq");
			expect(rolLabel("COR")).toBe("Corriente");
		});
	});

	describe("rolEmoji", () => {
		it("debería retornar emojis correctos por base", () => {
			expect(rolEmoji("PAT_D")).toBe("⚓");
			expect(rolEmoji("PAT_I")).toBe("⚓");
			expect(rolEmoji("COS_D")).toBe("⚓");
			expect(rolEmoji("COS_I")).toBe("⚓");
			expect(rolEmoji("FIJ_D")).toBe("🔩");
			expect(rolEmoji("FIJ_I")).toBe("🔩");
			expect(rolEmoji("COR")).toBe("〰️");
		});
	});

	describe("defaultRoles", () => {
		it("debería generar roles con lado para paso primario (tid=1)", () => {
			const roles = defaultRoles(6, 1);
			expect(roles).toHaveLength(6);
			expect(roles[0]).toEqual({ pri: "PAT_I", sec: "FIJ_I" });
			expect(roles[1]).toEqual({ pri: "PAT_D", sec: "FIJ_D" });
			expect(roles[2]).toEqual({ pri: "FIJ_I", sec: "PAT_I" });
			expect(roles[3]).toEqual({ pri: "FIJ_D", sec: "PAT_D" });
			expect(roles[4]).toEqual({ pri: "COR", sec: "FIJ_I" });
			expect(roles[5]).toEqual({ pri: "COR", sec: "FIJ_I" });
		});

		it("debería generar roles con lado para paso secundario (tid=2)", () => {
			const roles = defaultRoles(6, 2);
			expect(roles[0]).toEqual({ pri: "COS_I", sec: "FIJ_I" });
			expect(roles[1]).toEqual({ pri: "COS_D", sec: "FIJ_D" });
			expect(roles[2]).toEqual({ pri: "FIJ_I", sec: "COS_I" });
			expect(roles[3]).toEqual({ pri: "FIJ_D", sec: "COS_D" });
			expect(roles[4]).toEqual({ pri: "COR", sec: "FIJ_I" });
		});
	});

	describe("getRol", () => {
		const trabajadera = {
			roles: [
				{ pri: "PAT_D", sec: "FIJ_D" },
				{ pri: "COS_I", sec: "FIJ_I" },
			],
		} as Trabajadera;

		it("debería retornar rol existente", () => {
			expect(getRol(trabajadera, 0)).toEqual({ pri: "PAT_D", sec: "FIJ_D" });
			expect(getRol(trabajadera, 1)).toEqual({ pri: "COS_I", sec: "FIJ_I" });
		});

		it("debería retornar COR/FIJ_I para índice fuera de rango", () => {
			expect(getRol(trabajadera, 5)).toEqual({ pri: "COR", sec: "FIJ_I" });
		});

		it("debería retornar default si no hay roles", () => {
			expect(getRol({} as Trabajadera, 0)).toEqual({
				pri: "COR",
				sec: "FIJ_I",
			});
		});
	});

	describe("esRolHabitual", () => {
		const trabajadera = {
			roles: [
				{ pri: "PAT_D", sec: "FIJ_D" },
				{ pri: "COS_I", sec: "FIJ_I" },
			],
		} as Trabajadera;

		it("debería retornar true si coincide rol primario", () => {
			expect(esRolHabitual(trabajadera, 0, "PAT_D")).toBe(true);
		});

		it("debería retornar true si coincide rol secundario", () => {
			expect(esRolHabitual(trabajadera, 0, "FIJ_D")).toBe(true);
		});

		it("debería retornar false si no coincide", () => {
			expect(esRolHabitual(trabajadera, 0, "COR")).toBe(false);
		});

		it("debería retornar true para rol null (sin filtro)", () => {
			expect(esRolHabitual(trabajadera, 0, null)).toBe(true);
		});
	});

	describe("idealRoles", () => {
		it("debería retornar distribución con lado para paso primario", () => {
			expect(idealRoles(1)).toEqual({
				PAT_D: 1,
				PAT_I: 1,
				FIJ_D: 1,
				FIJ_I: 1,
				COR: 1,
			});
			expect(idealRoles(7)).toEqual({
				PAT_D: 1,
				PAT_I: 1,
				FIJ_D: 1,
				FIJ_I: 1,
				COR: 1,
			});
		});

		it("debería retornar distribución con lado para paso secundario", () => {
			expect(idealRoles(2)).toEqual({
				COS_D: 1,
				COS_I: 1,
				FIJ_D: 1,
				FIJ_I: 1,
				COR: 1,
			});
		});
	});

	describe("estructuraPaso", () => {
		it("debería retornar estructura PAT con lado para paso primario", () => {
			expect(estructuraPaso(1)).toEqual([
				"PAT_I",
				"FIJ_I",
				"COR",
				"FIJ_D",
				"PAT_D",
			]);
		});

		it("debería retornar estructura COS con lado para paso secundario", () => {
			expect(estructuraPaso(2)).toEqual([
				"COS_I",
				"FIJ_I",
				"COR",
				"FIJ_D",
				"COS_D",
			]);
		});
	});

	describe("rolDePosicion", () => {
		const trabajadera = { id: 1 } as Trabajadera;

		it("debería retornar rol por posición con lado", () => {
			expect(rolDePosicion(trabajadera, 0)).toBe("PAT_I");
			expect(rolDePosicion(trabajadera, 2)).toBe("COR");
			expect(rolDePosicion(trabajadera, 4)).toBe("PAT_D");
		});

		it("debería retornar COR para posición fuera de rango", () => {
			expect(rolDePosicion(trabajadera, 10)).toBe("COR");
		});
	});

	describe("asignarRolesTramo", () => {
		it("debería asignar roles óptimos según capacidades con lado", () => {
			const trabajadera = {
				id: 1,
				roles: [
					{ pri: "PAT_I", sec: "FIJ_I" },
					{ pri: "PAT_D", sec: "FIJ_D" },
					{ pri: "FIJ_I", sec: "PAT_I" },
					{ pri: "FIJ_D", sec: "PAT_D" },
					{ pri: "COR", sec: "FIJ_I" },
				],
			} as Trabajadera;

			const asignados = asignarRolesTramo(trabajadera, [0, 1, 2, 3, 4]);
			expect(asignados.size).toBe(5);
			// Los pateros deberían ir en posiciones PAT
			expect(asignados.get(0)).toBeDefined();
			expect(asignados.get(1)).toBeDefined();
		});

		it("debería retornar mapa vacío para array vacío", () => {
			const asignados = asignarRolesTramo({ id: 1 } as Trabajadera, []);
			expect(asignados.size).toBe(0);
		});

		it("debería asignar COR a extras (>5)", () => {
			const trabajadera = {
				id: 1,
				roles: Array(7).fill({ pri: "COR", sec: "FIJ_I" }),
			} as Trabajadera;

			const asignados = asignarRolesTramo(trabajadera, [0, 1, 2, 3, 4, 5, 6]);
			expect(asignados.get(5)).toBe("COR");
			expect(asignados.get(6)).toBe("COR");
		});
	});

	describe("getDentroFisico", () => {
		it("debería retornar orden físico según roles con lado", () => {
			const trabajadera = {
				id: 1,
				roles: [
					{ pri: "PAT_I", sec: "FIJ_I" },
					{ pri: "FIJ_I", sec: "COR" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "FIJ_D", sec: "PAT_D" },
					{ pri: "PAT_D", sec: "FIJ_D" },
				],
			} as Trabajadera;

			const slot: TramoSlot = { dentro: [0, 1, 2, 3, 4], fuera: [] };
			const fisico = getDentroFisico(trabajadera, slot);
			expect(fisico).toHaveLength(5);
			expect(fisico.every((x) => x !== null)).toBe(true);
		});

		it("debería usar dentroFisico si ya existe", () => {
			const slot: TramoSlot = {
				dentro: [0, 1],
				dentroFisico: [1, 0, null, null, null],
				fuera: [],
			};
			const fisico = getDentroFisico({ id: 1 } as Trabajadera, slot);
			expect(fisico).toEqual([1, 0, null, null, null]);
		});
	});

	// ══════════════════════════════════════════════════════════════════
	// Regla 5 costaleros — cooriente libre
	// ══════════════════════════════════════════════════════════════════
	describe("getDentroFisico — regla5 costaleros", () => {
		const t5Regla5: Trabajadera = {
			id: 1,
			nombres: ["A", "B", "C", "D", "E"],
			roles: [
				{ pri: "PAT_I", sec: "FIJ_I" },
				{ pri: "FIJ_I", sec: "COR" },
				{ pri: "COR", sec: "FIJ_I" },
				{ pri: "FIJ_D", sec: "PAT_D" },
				{ pri: "PAT_D", sec: "FIJ_D" },
			],
			salidas: 5,
			tramos: ["T1"],
			bajas: [],
			regla5costaleros: true,
			plan: null,
			obj: null,
			analisis: null,
			pinned: null,
			puntuaciones: {},
			tramosClaves: [],
		};

		const t5SinRegla: Trabajadera = {
			...t5Regla5,
			regla5costaleros: false,
		};

		it("con regla5=true, dentroFisico[2] debe ser null (cooriente libre)", () => {
			const slot: TramoSlot = { dentro: [0, 1, 2, 3], fuera: [] }; // 4 dentro (regla5)
			const fisico = getDentroFisico(t5Regla5, slot);
			expect(fisico).toHaveLength(5);
			expect(fisico[2]).toBeNull();
		});

		it("con regla5=true, los 4 costaleros aparecen en dentroFisico fuera de la cooriente", () => {
			const slot: TramoSlot = { dentro: [0, 1, 2, 3], fuera: [] };
			const fisico = getDentroFisico(t5Regla5, slot);
			// Todos los costaleros deben estar en alguna posición distinta de la cooriente
			const costalerosEnPaso = fisico.filter((x): x is number => x !== null);
			expect(costalerosEnPaso).toHaveLength(4);
			expect(costalerosEnPaso.sort()).toEqual([0, 1, 2, 3]);
		});

		it("con regla5=false, la cooriente PUEDE estar ocupada (comportamiento actual)", () => {
			const slot: TramoSlot = { dentro: [0, 1, 2, 3], fuera: [] };
			const fisico = getDentroFisico(t5SinRegla, slot);
			expect(fisico).toHaveLength(5);
			const ocupadas = fisico.filter((x): x is number => x !== null);
			expect(ocupadas.length).toBeGreaterThanOrEqual(4);
		});

		it("con 6 costaleros, regla5 no aplica aunque esté activa", () => {
			const t6: Trabajadera = {
				...t5Regla5,
				nombres: ["A", "B", "C", "D", "E", "F"],
				roles: [
					{ pri: "PAT_I", sec: "FIJ_I" },
					{ pri: "FIJ_I", sec: "COR" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "FIJ_D", sec: "PAT_D" },
					{ pri: "PAT_D", sec: "FIJ_D" },
					{ pri: "COR", sec: "FIJ_I" },
				],
				regla5costaleros: true,
			};
			const slot: TramoSlot = { dentro: [0, 1, 2, 3, 4, 5], fuera: [] };
			const fisico = getDentroFisico(t6, slot);
			expect(fisico).toHaveLength(5);
			const costaleros = fisico.filter((x): x is number => x !== null);
			expect(costaleros.length).toBeGreaterThanOrEqual(4);
		});

		it("con regla5=true y tid=2, cooriente también libre (paso secundario)", () => {
			const t5tid2: Trabajadera = {
				...t5Regla5,
				id: 2,
				roles: [
					{ pri: "COS_I", sec: "FIJ_I" },
					{ pri: "FIJ_I", sec: "COS_I" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "FIJ_D", sec: "COS_D" },
					{ pri: "COS_D", sec: "FIJ_D" },
				],
			};
			const slot: TramoSlot = { dentro: [0, 1, 2, 3], fuera: [] };
			const fisico = getDentroFisico(t5tid2, slot);
			expect(fisico).toHaveLength(5);
			expect(fisico[2]).toBeNull();
		});

		it("con regla5=true, los costaleros sobrantes se colocan en posiciones no activas", () => {
			const slot: TramoSlot = { dentro: [0, 1, 2, 3, 4], fuera: [] };
			const fisico = getDentroFisico(t5Regla5, slot);
			expect(fisico[2]).toBeNull();
			const costaleros = fisico.filter((x): x is number => x !== null);
			expect(costaleros.length).toBeGreaterThanOrEqual(4);
		});
	});

	describe("ordenarDentroFisico — regla5 costaleros", () => {
		const t5Regla5: Trabajadera = {
			id: 1,
			nombres: ["A", "B", "C", "D", "E"],
			roles: [
				{ pri: "PAT_I", sec: "FIJ_I" },
				{ pri: "FIJ_I", sec: "COR" },
				{ pri: "COR", sec: "FIJ_I" },
				{ pri: "FIJ_D", sec: "PAT_D" },
				{ pri: "PAT_D", sec: "FIJ_D" },
			],
			salidas: 5,
			tramos: ["T1"],
			bajas: [],
			regla5costaleros: true,
			plan: null,
			obj: null,
			analisis: null,
			pinned: null,
			puntuaciones: {},
			tramosClaves: [],
		};

		it("con regla5=true, dentroFisico[2] es null y slot.dentro tiene 4 índices sin nulls", () => {
			const plan: TramoSlot[] = [{ dentro: [0, 1, 2, 3], fuera: [] }];
			const ordenado = ordenarDentroFisico(t5Regla5, plan);
			const slot = ordenado[0];

			expect(slot.dentroFisico).toBeDefined();
			expect(slot.dentroFisico!).toHaveLength(5);
			expect(slot.dentroFisico![2]).toBeNull();

			expect(slot.dentro).toHaveLength(4);
			expect(slot.dentro.every((x) => typeof x === "number")).toBe(true);

			const fisicoFiltrado = slot.dentroFisico!.filter(
				(x): x is number => x !== null,
			);
			expect(slot.dentro).toEqual(fisicoFiltrado);
		});

		it("con regla5=false, no modifica la cooriente", () => {
			const t5SinRegla: Trabajadera = { ...t5Regla5, regla5costaleros: false };
			const plan: TramoSlot[] = [{ dentro: [0, 1, 2, 3], fuera: [] }];
			const ordenado = ordenarDentroFisico(t5SinRegla, plan);
			const slot = ordenado[0];

			expect(slot.dentroFisico).toBeDefined();
			expect(slot.dentroFisico!).toHaveLength(5);
		});
	});

	describe("ordenarDentroFisico", () => {
		it("debería ordenar plan completo según roles", () => {
			const trabajadera = {
				id: 1,
				roles: [
					{ pri: "PAT_I", sec: "FIJ_I" },
					{ pri: "FIJ_I", sec: "COR" },
					{ pri: "COR", sec: "FIJ_I" },
					{ pri: "FIJ_D", sec: "PAT_D" },
					{ pri: "PAT_D", sec: "FIJ_D" },
				],
			} as Trabajadera;

			const plan: TramoSlot[] = [
				{ dentro: [0, 1, 2, 3, 4], fuera: [] },
				{ dentro: [4, 3, 2, 1, 0], fuera: [] },
			];

			const ordenado = ordenarDentroFisico(trabajadera, plan);
			expect(ordenado).toHaveLength(2);
			expect(ordenado[0].dentro).toHaveLength(5);
			expect(ordenado[1].dentro).toHaveLength(5);
		});

		it("no debería modificar slots vacíos", () => {
			const plan: TramoSlot[] = [{ dentro: [], fuera: [] }];
			const ordenado = ordenarDentroFisico({ id: 1 } as Trabajadera, plan);
			expect(ordenado[0].dentro).toEqual([]);
		});

		it("debería preferir ambos en secundaria antes que uno fuera de posición", () => {
			// Escenario con roles con lado: Emilio (COS_D/FIJ_D) en COR es fuera de posición.
			// Gorrion (FIJ_I/COR) está en FIJ_I (su principal).
			const trabajadera = {
				id: 2, // tid=2 → estructura = [COS_I, FIJ_I, COR, FIJ_D, COS_D]
				nombres: ["Patro", "Israel", "Emilio", "Gorrion", "Susino"],
				roles: [
					{ pri: "COS_I", sec: "FIJ_I" }, // Patro
					{ pri: "FIJ_I", sec: "COS_I" }, // Israel
					{ pri: "COS_D", sec: "FIJ_D" }, // Emilio
					{ pri: "FIJ_I", sec: "COR" }, // Gorrion
					{ pri: "COS_D", sec: "FIJ_D" }, // Susino
				],
			} as Trabajadera;

			const plan: TramoSlot[] = [
				{ dentro: [0, 1, 2, 3, 4], fuera: [] }, // Todos dentro
			];

			const ordenado = ordenarDentroFisico(trabajadera, plan);
			const fisico = ordenado[0].dentroFisico!;

			// Verificar que NADIE esté fuera de posición
			const estructura = estructuraPaso(trabajadera.id);
			const fueraDePosicion = fisico.filter((ci, posIdx) => {
				if (ci === null) return false;
				const rol = getRol(trabajadera, ci);
				const rolReq = estructura[posIdx];
				return rol.pri !== rolReq && rol.sec !== rolReq;
			});

			expect(fueraDePosicion).toHaveLength(0);
		});
	});
});
