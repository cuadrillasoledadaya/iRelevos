// ══════════════════════════════════════════════════════════════════
// PLAN STORE — Slice de planificación y cálculos (Phase 5.1)
// Delega a mutar() para modificar el projectStore.
// ══════════════════════════════════════════════════════════════════

import { create } from "zustand";
import {
	calcularCiclo,
	completarAuto,
	analizar,
	getPinned,
	validarPinned,
	aplicarIntercambio,
} from "@/lib/algoritmos";
import { ordenarDentroFisico } from "@/lib/roles";
import type {
	DatosPerfil,
	PinState,
	SwapState,
	Trabajadera,
} from "@/lib/types";

export interface PlanStore {
	calcularTodo: () => void;
	calcularTrab: (tid: number) => void;
	completarPlan: (tid: number) => void;
	limpiarPlan: (tid: number) => void;
	quitarBloqueos: (tid: number) => void;
	setPinned: (tid: number, ti: number, ci: number, v: PinState) => void;
	getErroresPinned: (tid: number) => string[];
	confirmarSwap: (ws: SwapState) => void;
	aplicarSugerencia: (
		tid: number,
		ti1: number,
		ti2: number,
		ciA: number,
		ciB: number,
	) => boolean;
	limpiarPlanificacion: () => void;
	limpiarTrabajaderas: () => void;
	resetTodo: () => void;
	addPlan: (nombre: string, tramos?: string[]) => void;
	updatePlan: (id: string, nombre: string) => void;
	delPlan: (id: string) => void;
	cargarPlanEnTrabajadera: (tid: number, planId: string) => void;
}

type MutarFn = (fn: (draft: DatosPerfil) => void) => void;
type GetTrabFn = (d: DatosPerfil, tid: number) => Trabajadera;
type GetSFn = () => DatosPerfil;

export function createPlanStore(
	mutar: MutarFn,
	getTrabFn: GetTrabFn,
	getS: GetSFn,
) {
	return create<PlanStore>()(() => ({
		calcularTodo: () => {
			mutar((d) => {
				d.trabajaderas.forEach((t) => {
					const { plan, objetivo } = calcularCiclo(t);
					ordenarDentroFisico(t, plan);
					t.plan = plan;
					t.obj = objetivo;
					t.analisis = analizar(plan, t.nombres.length, objetivo, t);
					t.pinned = null;
				});
			});
		},

		calcularTrab: (tid) => {
			mutar((d) => {
				const t = getTrabFn(d, tid);
				const { plan, objetivo } = calcularCiclo(t);
				ordenarDentroFisico(t, plan);
				t.plan = plan;
				t.obj = objetivo;
				t.analisis = analizar(plan, t.nombres.length, objetivo, t);
				t.pinned = null;
			});
		},

		completarPlan: (tid) => {
			mutar((d) => {
				const t = getTrabFn(d, tid);
				const res = completarAuto(t);
				if ("error" in res) return;
				ordenarDentroFisico(t, res.plan);
				t.plan = res.plan;
				t.obj = res.obj;
				t.analisis = res.analisis;
			});
		},

		limpiarPlan: (tid) => {
			mutar((d) => {
				const t = getTrabFn(d, tid);
				t.plan = null;
				t.obj = null;
				t.analisis = null;
			});
		},

		quitarBloqueos: (tid) => {
			mutar((d) => {
				getTrabFn(d, tid).pinned = null;
			});
		},

		setPinned: (tid, ti, ci, v) => {
			mutar((d) => {
				const t = getTrabFn(d, tid);
				const p = getPinned(t);
				p[ti][ci] = v;
				t.pinned = p;
			});
		},

		getErroresPinned: (tid): string[] => {
			const t = getTrabFn(getS(), tid);
			return validarPinned(t);
		},

		confirmarSwap: (ws) => {
			mutar((d) => {
				const { a, ambosD, nuevoDentroF, nuevoFuera } = ws;
				const t = getTrabFn(d, a.tid);
				const r = t.plan![a.ti];
				if (r) {
					r.dentroFisico = [...nuevoDentroF];
					r.dentro = nuevoDentroF.filter((x): x is number => x !== null);
					if (!ambosD) {
						r.fuera = [...nuevoFuera];
					}
					const nuevoObj: Record<number, number> = {};
					for (let i = 0; i < t.nombres.length; i++) nuevoObj[i] = 0;
					t.plan!.forEach((tramo) =>
						tramo.fuera.forEach((ci) => {
							nuevoObj[ci]++;
						}),
					);
					t.obj = nuevoObj;
					t.analisis = analizar(t.plan!, t.nombres.length, nuevoObj, t);
				}
			});
		},

		aplicarSugerencia: (tid, ti1, ti2, ciA, ciB) => {
			const t = getTrabFn(getS(), tid);
			return aplicarIntercambio(t, ti1, ti2, ciA, ciB);
		},

		limpiarPlanificacion: () => {
			mutar((d) => {
				d.trabajaderas.forEach((t) => {
					t.plan = null;
					t.analisis = null;
					t.obj = null;
				});
			});
		},

		limpiarTrabajaderas: () => {
			mutar((d) => {
				d.trabajaderas.forEach((t) => {
					t.nombres = t.nombres.map((_, i) => `Costalero ${i + 1}`);
					t.bajas = [];
					t.plan = null;
					t.analisis = null;
					t.obj = null;
					t.puntuaciones = {};
				});
			});
		},

		resetTodo: () => {
			mutar((d) => {
				d.trabajaderas = [
					{
						id: 1,
						nombres: [
							"Costalero 1",
							"Costalero 2",
							"Costalero 3",
							"Costalero 4",
							"Costalero 5",
							"Costalero 6",
						],
						salidas: 2,
						roles: [
							{ pri: "COS_I", sec: "COR" },
							{ pri: "COS_D", sec: "COR" },
							{ pri: "COS_I", sec: "FIJ_I" },
							{ pri: "COS_D", sec: "FIJ_D" },
							{ pri: "COR", sec: "COS_I" },
							{ pri: "COR", sec: "COS_D" },
						],
						tramos: ["Tramo 1 (T1)", "Tramo 2 (T1)", "Tramo 3 (T1)"],
						plan: null,
						obj: null,
						analisis: null,
						pinned: null,
						bajas: [],
						regla5costaleros: false,
						puntuaciones: {},
						tramosClaves: [],
					},
				];
				d.banco = [];
			});
		},

		addPlan: (nombre, tramos) => {
			mutar((d) => {
				if (!d.planes) d.planes = [];
				d.planes.push({
					id: `plan_${Date.now()}`,
					nombre: nombre || "Nuevo plan",
					tramos: tramos || [],
				});
			});
		},

		updatePlan: (id, nombre) => {
			mutar((d) => {
				if (!d.planes) d.planes = [];
				const plan = d.planes.find((p) => p.id === id);
				if (plan) plan.nombre = nombre;
			});
		},

		delPlan: (id) => {
			mutar((d) => {
				if (!d.planes) d.planes = [];
				d.planes = d.planes.filter((p) => p.id !== id);
			});
		},

		cargarPlanEnTrabajadera: (tid, planId) => {
			mutar((d) => {
				if (!d.planes) d.planes = [];
				const plan = d.planes.find((p) => p.id === planId);
				if (!plan) return;
				const t = d.trabajaderas.find((x) => x.id === tid);
				if (!t) return;
				t.tramos = [...plan.tramos];
				t.plan = null;
				t.obj = null;
				t.analisis = null;
				t.pinned = null;
			});
		},
	}));
}
