// ══════════════════════════════════════════════════════════════════
// PROJECT STORE — Slice de proyecto (Phase 3.1)
// Maneja la lista de proyectos (pasos), el proyecto activo (pid),
// y los datos derivados (nombrePaso, nombreCuadrilla, S).
// ══════════════════════════════════════════════════════════════════

import { create } from "zustand";
import type { DatosPerfil, PasoDB } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { datosVacios } from "@/lib/algoritmos";
import { deriveFromPasos } from "./helpers";

let getActiveTemporadaId = () => "";

export function setTemporadaGetter(fn: () => string) {
	getActiveTemporadaId = fn;
}

// ── Estado ────────────────────────────────────────────────────────

export interface ProjectStoreState {
	pasos: PasoDB[];
	pid: string;
	nombrePaso: string;
	nombreCuadrilla: string;
	S: DatosPerfil;
	censusHeights: Record<string, number>;
}

export interface ProjectStoreActions {
	setPid: (id: string) => void;
	setPasos: (pasos: PasoDB[]) => void;
	refetchPasos: () => Promise<void>;
	fetchCensusHeights: () => Promise<void>;
	vaciarCenso: () => Promise<void>;
}

export type ProjectStore = ProjectStoreState & ProjectStoreActions;

// ── Helpers ───────────────────────────────────────────────────────

const LS_PID = "cpwa_active_paso_id";

// ── Store ─────────────────────────────────────────────────────────

export const createProjectStore = () =>
	create<ProjectStore>()((set, get) => ({
		// ── Estado inicial ──

		pasos: [],
		pid: "",
		nombrePaso: "Sin Paso",
		nombreCuadrilla: "Sin Cuadrilla",
		S: datosVacios(),
		censusHeights: {},

		// ── Acciones ──

		setPid: (id) => {
			const { pasos } = get();
			localStorage.setItem(LS_PID, id);
			set({
				pid: id,
				...deriveFromPasos(pasos, id),
			});
		},

		setPasos: (pasos) => {
			const state = get();
			let nextPid = state.pid;

			if (pasos.length > 0) {
				const savedPid = localStorage.getItem(LS_PID);
				if (savedPid && pasos.some((p) => p.id === savedPid)) {
					nextPid = savedPid;
				} else {
					nextPid = pasos[0].id;
				}
			} else {
				nextPid = "";
			}

			set({
				pasos,
				pid: nextPid,
				...deriveFromPasos(pasos, nextPid),
			});
		},

		refetchPasos: async () => {
			const activeTemporadaId = getActiveTemporadaId();
			if (!activeTemporadaId) return;

			const { data, error } = await supabase
				.from("proyectos")
				.select(
					"id, nombre_paso, nombre_cuadrilla, num_trabajaderas, content, created_at, temporada_id",
				)
				.eq("temporada_id", activeTemporadaId)
				.order("created_at", { ascending: false });

			if (!error && data) {
				get().setPasos(data as PasoDB[]);
			}
		},

		fetchCensusHeights: async () => {
			const activeTemporadaId = getActiveTemporadaId();
			if (!activeTemporadaId) return;

			const { data } = await supabase
				.from("census")
				.select("nombre, apellidos, apodo, altura")
				.eq("temporada_id", activeTemporadaId);

			if (data) {
				const map: Record<string, number> = {};
				data.forEach(
					(c: {
						nombre: string;
						apellidos: string;
						apodo?: string;
						altura?: number;
					}) => {
						if (c.altura) {
							const fullName = `${c.nombre} ${c.apellidos}`.trim();
							map[fullName] = c.altura;
							if (c.apodo) map[c.apodo.trim()] = c.altura;
						}
					},
				);
				set({ censusHeights: map });
			}
		},

		vaciarCenso: async () => {
			const { pid } = get();
			if (!pid) return;

			const { error } = await supabase
				.from("census")
				.delete()
				.eq("proyecto_id", pid);

			if (error) {
				console.error("Error al vaciar censo:", error.message);
				alert("Error al vaciar el censo: " + error.message);
			} else {
				alert("Censo vaciado correctamente.");
			}
		},
	}));

export const projectStore = createProjectStore();
