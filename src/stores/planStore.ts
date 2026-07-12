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
	aplicarTodasLasCorrecciones,
	aplicarSugerenciaLatente,
	generarSugerenciasCorreccion,
	type ResultadoBulkApply,
	type BulkCorreccionesPreview,
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
	previsualizarCorreccionesBulk: (tid: number) => BulkCorreccionesPreview | null;
	confirmarCorreccionesBulk: (tid: number) => ResultadoBulkApply;
	confirmarAsignacion: (tid: number) => void;
	limpiarPlanificacion: () => void;
	limpiarTrabajaderas: () => void;
	resetTodo: () => void;
	addPlan: (nombre: string, tramos?: string[]) => void;
	updatePlan: (id: string, nombre: string) => void;
	updatePlanTramos: (id: string, tramos: string[]) => void;
	delPlan: (id: string) => void;
	cargarPlanEnTrabajadera: (tid: number, planId: string) => void;
	aplicarSugerenciaLatente: (tid: number) => boolean;
	ultimoResultadoBulk: ResultadoBulkApply | null;
}

type MutarFn = (fn: (draft: DatosPerfil) => void) => void;
type GetTrabFn = (d: DatosPerfil, tid: number) => Trabajadera;
type GetSFn = () => DatosPerfil;

let _mutar: MutarFn;
let _getTrab: GetTrabFn;
let _getS: GetSFn;

export function setPlanDeps(m: MutarFn, gt: GetTrabFn, gs: GetSFn) {
	_mutar = m;
	_getTrab = gt;
	_getS = gs;
}

export const planStore = create<PlanStore>()((set, get) => ({
		ultimoResultadoBulk: null as ResultadoBulkApply | null,
		calcularTodo: () => {
			_mutar((d) => {
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
			_mutar((d) => {
				const t = _getTrab(d, tid);
				const { plan, objetivo } = calcularCiclo(t);
				ordenarDentroFisico(t, plan);
				t.plan = plan;
				t.obj = objetivo;
				t.analisis = analizar(plan, t.nombres.length, objetivo, t);
				t.pinned = null;
			});
		},

		completarPlan: (tid) => {
			_mutar((d) => {
				const t = _getTrab(d, tid);
				const res = completarAuto(t);
				if ("error" in res) return;
				ordenarDentroFisico(t, res.plan);
				t.plan = res.plan;
				t.obj = res.obj;
				t.analisis = res.analisis;
			});
		},

		limpiarPlan: (tid) => {
			_mutar((d) => {
				const t = _getTrab(d, tid);
				t.plan = null;
				t.obj = null;
				t.analisis = null;
			});
		},

		quitarBloqueos: (tid) => {
			_mutar((d) => {
				_getTrab(d, tid).pinned = null;
			});
		},

		setPinned: (tid, ti, ci, v) => {
			_mutar((d) => {
				const t = _getTrab(d, tid);
				const p = getPinned(t);
				p[ti][ci] = v;
				t.pinned = p;
			});
		},

		getErroresPinned: (tid): string[] => {
			const t = _getTrab(_getS(), tid);
			return validarPinned(t);
		},

		confirmarSwap: (ws) => {
			_mutar((d) => {
				const { a, ambosD, nuevoDentroF, nuevoFuera } = ws;
				const t = _getTrab(d, a.tid);
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
			let result = false;
			_mutar((d) => {
				const t = _getTrab(d, tid);
				result = aplicarIntercambio(t, ti1, ti2, ciA, ciB);
			});
			return result;
		},

		previsualizarCorreccionesBulk: (tid) => {
			const t = _getTrab(_getS(), tid);
			if (!t.plan || !t.analisis) return null;
			const s = generarSugerenciasCorreccion(t);
			if (s.correcciones.length === 0) return null;
			const summary: Record<string, number> = {};
			for (const c of s.correcciones) {
				const key = `T${c.tramoOrigen + 1}\u2194T${c.tramoDestino + 1}`;
				summary[key] = (summary[key] ?? 0) + 1;
			}
			return { correcciones: s.correcciones, summary };
		},

		confirmarCorreccionesBulk: (tid) => {
			let result: ResultadoBulkApply = { aplicadas: 0, saltadas: 0, cap_alcanzado: false, violations: [] };
			_mutar((d) => {
				const t = _getTrab(d, tid);
				if (!t.plan) {
					set({ ultimoResultadoBulk: result });
					return;
				}
				result = aplicarTodasLasCorrecciones(t);
				set({ ultimoResultadoBulk: result });
			});
			return result;
		},

		confirmarAsignacion: (tid) => {
			// Thin wrapper for backward compat (D6)
			get().confirmarCorreccionesBulk(tid);
		},

		aplicarSugerenciaLatente: (tid) => {
			let result = false;
			_mutar((d) => {
				const t = _getTrab(d, tid);
				result = aplicarSugerenciaLatente(t);
			});
			return result;
		},

		limpiarPlanificacion: () => {
			_mutar((d) => {
				d.trabajaderas.forEach((t) => {
					t.plan = null;
					t.analisis = null;
					t.obj = null;
				});
			});
		},

		limpiarTrabajaderas: () => {
			_mutar((d) => {
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
			_mutar((d) => {
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
						boquilla: {},
						tramosClaves: [],
					},
				];
				d.banco = [];
			});
		},

		addPlan: (nombre, tramos) => {
			_mutar((d) => {
				if (!d.planes) d.planes = [];
				d.planes.push({
					id: `plan_${Date.now()}`,
					nombre: nombre || "Nuevo plan",
					tramos: tramos || [],
				});
			});
		},

		updatePlan: (id, nombre) => {
			_mutar((d) => {
				if (!d.planes) d.planes = [];
				const plan = d.planes.find((p) => p.id === id);
				if (plan) plan.nombre = nombre;
			});
		},

		updatePlanTramos: (id, tramos) => {
			_mutar((d) => {
				if (!d.planes) d.planes = [];
				const plan = d.planes.find((p) => p.id === id);
				if (plan) plan.tramos = [...tramos];
			});
		},

		delPlan: (id) => {
			_mutar((d) => {
				if (!d.planes) d.planes = [];
				d.planes = d.planes.filter((p) => p.id !== id);
			});
		},

		cargarPlanEnTrabajadera: (tid, planId) => {
			_mutar((d) => {
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
