// ══════════════════════════════════════════════════════════════════
// PROJECT STORE — Slice de proyecto (Phase 3.1)
// Maneja la lista de proyectos (pasos), el proyecto activo (pid),
// y los datos derivados (nombrePaso, nombreCuadrilla, S).
// ══════════════════════════════════════════════════════════════════

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { DatosPerfil, PasoDB, Trabajadera } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { datosVacios } from "@/lib/algoritmos";
import { deriveFromPasos } from "./helpers";
import { defaultRoles } from "@/lib/roles";
import {
	apodosDifieren,
	calcularApodosCuadrilla,
	construirIndiceApodos,
	type IndiceApodos,
} from "@/lib/apodos";

let getActiveTemporadaId = () => "";

export function setTemporadaGetter(fn: () => string) {
	getActiveTemporadaId = fn;
}

// `mutar` (muta el content del paso activo y persiste en la nube) se
// inyecta desde @/stores/index.ts para evitar la dependencia circular.
type MutarFn = (fn: (draft: DatosPerfil) => void) => void;
let _mutar: MutarFn | null = null;

export function setProjectStoreMutar(fn: MutarFn) {
	_mutar = fn;
}

/**
 * Filtro del censo para el proyecto/temporada activos.
 *
 * El censo importado desde iCuadrilla lo escribe el RPC
 * `full_sync_icuadrilla_census`, que históricamente NO rellenaba
 * `temporada_id` (los registros quedaban con `temporada_id = NULL`).
 * Consultar solo por temporada dejaba los costaleros importados
 * invisibles en el Censo de Cuadrilla y sin apodos/alturas cargados.
 * Por eso se filtra por proyecto **o** por temporada.
 */
function filtroCenso(pid: string, temporadaId: string): string | null {
	const partes: string[] = [];
	if (pid) partes.push(`proyecto_id.eq.${pid}`);
	if (temporadaId) partes.push(`temporada_id.eq.${temporadaId}`);
	return partes.length > 0 ? partes.join(",") : null;
}

// ── Estado ────────────────────────────────────────────────────────

export interface ProjectStoreState {
	pasos: PasoDB[];
	pid: string;
	nombrePaso: string;
	nombreCuadrilla: string;
	S: DatosPerfil;
	censusHeights: Record<string, number>;
	censusBoquilla: Record<string, boolean>;
	censusApodos: IndiceApodos;
}

export interface ProjectStoreActions {
	setPid: (id: string) => void;
	setPasos: (pasos: PasoDB[]) => void;
	refetchPasos: () => Promise<void>;
	fetchCensusHeights: () => Promise<void>;
	fetchCensusBoquilla: () => Promise<void>;
	fetchCensusApodos: () => Promise<void>;
	aplicarApodosATrabajaderas: () => void;
	vaciarCenso: () => Promise<void>;
}

export type ProjectStore = ProjectStoreState & ProjectStoreActions;

// ── Helpers ───────────────────────────────────────────────────────

const LS_PID = "cpwa_active_paso_id";
const STORAGE_KEY = "cpwa_project_store";

/**
 * Calcula los apodos que hay que aplicar a las cuadrillas del proyecto.
 * Devuelve `null` si no hay nada que cambiar (sin cuadrillas, sin apodos
 * en el censo o apodos ya aplicados) — así no se dispara un guardado
 * inútil en la nube cada vez que se carga el proyecto.
 */
function calcularApodosAAplicar(
	S: DatosPerfil,
	indice: IndiceApodos,
): (string | undefined)[][] | null {
	const cuadrillas = S.trabajaderas ?? [];
	if (cuadrillas.length === 0) return null;

	const nuevos = calcularApodosCuadrilla(cuadrillas, indice);
	const cambio = cuadrillas.some((t, i) => apodosDifieren(t.apodos, nuevos[i]));
	if (!cambio) return null;

	return nuevos;
}

// ── Store ─────────────────────────────────────────────────────────

export const createProjectStore = () =>
	create<ProjectStore>()(
		persist(
			(set, get) => ({
				// ── Estado inicial ──

				pasos: [],
				pid: "",
				nombrePaso: "Sin Paso",
				nombreCuadrilla: "Sin Cuadrilla",
				S: datosVacios(),
				censusHeights: {},
				censusBoquilla: {},
				censusApodos: { exactos: {}, porPrimerNombre: {} },
				// ── Acciones ──

				setPid: (id) => {
					const { pasos } = get();
					localStorage.setItem(LS_PID, id);
					set({
						pid: id,
						...deriveFromPasos(pasos, id),
					});
					get().aplicarApodosATrabajaderas();
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
					get().aplicarApodosATrabajaderas();
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
						get().fetchCensusApodos();
					}
				},

				fetchCensusHeights: async () => {
					const { pid } = get();
					const activeTemporadaId = getActiveTemporadaId();
					const filtro = filtroCenso(pid, activeTemporadaId);
					if (!filtro) return;

					const { data } = await supabase
						.from("census")
						.select("nombre, apellidos, apodo, altura")
						.or(filtro);

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

				fetchCensusBoquilla: async () => {
					const { pid } = get();
					if (!pid) return;

					const { data } = await supabase
						.from("census")
						.select("nombre, apellidos, apodo, boquilla")
						.eq("proyecto_id", pid);

					if (data) {
						const map: Record<string, boolean> = {};
						data.forEach(
							(c: {
								nombre: string;
								apellidos: string;
								apodo?: string;
								boquilla?: boolean;
							}) => {
								if (c.boquilla) {
									const fullName = `${c.nombre} ${c.apellidos}`.trim();
									map[fullName] = true;
									if (c.apodo) map[c.apodo.trim()] = true;
								}
							},
						);
						set({ censusBoquilla: map });
					}
				},

				fetchCensusApodos: async () => {
					const { pid } = get();
					const activeTemporadaId = getActiveTemporadaId();
					const filtro = filtroCenso(pid, activeTemporadaId);
					if (!filtro) return;

					const { data, error } = await supabase
						.from("census")
						.select("nombre, apellidos, apodo")
						.or(filtro);

					if (error) {
						console.warn("[apodos] Error cargando apodos del censo:", error.message);
						return;
					}
					if (!data) return;

					const indice = construirIndiceApodos(
						data as { nombre: string; apellidos?: string | null; apodo?: string | null }[],
					);
					set({ censusApodos: indice });
					get().aplicarApodosATrabajaderas();
				},

			aplicarApodosATrabajaderas: () => {
				const { S, censusApodos } = get();
				const nuevos = calcularApodosAAplicar(S, censusApodos);
				if (!nuevos) return;

				// Persistir en la nube: mutar() actualiza `pasos` + `S` y
				// dispara saveCloud. Así el apodo llega al Capataz, al Plan,
				// a la Carga y a las exportaciones, y sobrevive al recargón.
				if (_mutar) {
					_mutar((draft) => {
						draft.trabajaderas = (draft.trabajaderas ?? []).map((t, i) => ({
							...t,
							apodos: nuevos[i],
						}));
					});
					return;
				}

				// Fallback sin mutar (store aislado en tests).
				set({
					S: {
						...S,
						trabajaderas: (S.trabajaderas ?? []).map((t, i) => ({
							...t,
							apodos: nuevos[i],
						})),
					},
				});
			},

			/**
			 * Asigna un apodo a un índice de una cuadrilla (override local).
			 * OJO: el censo es la fuente de verdad — el próximo
			 * `aplicarApodosATrabajaderas()` vuelve a imponer el apodo
			 * del censo. Sirve para fixes puntuales mientras tanto.
			 */
			asignarApodoATrabajadora: (tid: number, ci: number, apodo: string) => {
				const valor = apodo.trim() || undefined;

				if (_mutar) {
					_mutar((draft) => {
						const t = draft.trabajaderas?.find((x) => x.id === tid);
						if (!t) return;
						const apodos = [
							...(t.apodos ?? Array(t.nombres.length).fill(undefined)),
						];
						apodos[ci] = valor;
						t.apodos = apodos;
					});
					return;
				}

				const { S } = get();
				const trabajaderas =
					S.trabajaderas?.map((t: Trabajadera) => {
						if (t.id !== tid) return t;
						const apodos = [
							...(t.apodos ?? Array(t.nombres.length).fill(undefined)),
						];
						apodos[ci] = valor;
						return { ...t, apodos };
					}) ?? [];
				set({ S: { ...S, trabajaderas } });
			},

			vaciarCenso: async () => {
					const { pid, pasos } = get();
					if (!pid) return;

					// 1. Delete census entries for this project
					const { error: censusErr } = await supabase
						.from("census")
						.delete()
						.eq("proyecto_id", pid);

					if (censusErr) {
						console.error("Error al vaciar censo:", censusErr.message);
						alert("Error al vaciar el censo: " + censusErr.message);
						return;
					}

					// 2. Reset project content to clean state (remove stale names/roles)
					const paso = pasos.find((p) => p.id === pid);
					if (paso) {
						const cleanContent = {
							...paso.content,
							trabajaderas: paso.content.trabajaderas.map((t: { id: number }) => ({
								...t,
								nombres: ["Costalero 1", "Costalero 2", "Costalero 3", "Costalero 4", "Costalero 5", "Costalero 6"],
								apodos: [],
								roles: defaultRoles(6, t.id),
								plan: null,
								obj: {},
								analisis: null,
								pinned: null,
								bajas: [],
								puntuaciones: {},
								boquilla: {},
							})),
						};

						const { error: updateErr } = await supabase
							.from("proyectos")
							.update({ content: cleanContent })
							.eq("id", pid);

						if (updateErr) {
							console.error("Error al resetear content:", updateErr.message);
						}
					}

					// 3. Refetch to update local state
					await get().refetchPasos();

					alert("Censo vaciado y cuadrilla reseteada correctamente.");
				},
			}),
			{
				name: STORAGE_KEY,
				storage: createJSONStorage(() => localStorage),
				partialize: (state) => ({
					pasos: state.pasos,
					pid: state.pid,
				}),
			},
		),
	);

export const projectStore = createProjectStore();
