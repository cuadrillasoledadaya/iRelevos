"use client";

import { useEffect, useState } from "react";
import { uiStore, temporadaStore, trabajaderaStore, projectStore } from "@/stores";
import { supabase } from "@/lib/supabase";
import type { RolCode } from "@/lib/types";

interface CensusEntry {
	id: string;
	nombre: string;
	apellidos: string;
	apodo?: string;
	trabajadera?: number;
	rol?: RolCode;
	rol_sec?: RolCode;
}

interface EditingApodoState {
	[id: string]: string | undefined;
}

export default function CensusSheet() {
	const activeSheet = uiStore((s) => s.activeSheet);
	const closeSheet = uiStore.getState().closeSheet;
	const censusTarget = uiStore((s) => s.censusTarget);
	const setCensusTarget = uiStore.getState().setCensusTarget;
	const setNombre = trabajaderaStore.getState().setNombre;
	const setRolPri = trabajaderaStore.getState().setRolPri;
	const setRolSec = trabajaderaStore.getState().setRolSec;
	const activeTemporadaId = temporadaStore((s) => s.activeTemporadaId);
	const [census, setCensus] = useState<CensusEntry[]>([]);
	const [loading, setLoading] = useState(false);
	const [filter, setFilter] = useState("");
	const [editingApodo, setEditingApodo] = useState<EditingApodoState>({});
	const [savingApodo, setSavingApodo] = useState<Record<string, boolean>>({});

	const isOpen = activeSheet === "censo";

	useEffect(() => {
		async function fetchCensus() {
			if (!activeTemporadaId) return;
			setLoading(true);
			const { data, error } = await supabase
				.from("census")
				.select("id, nombre, apellidos, apodo, trabajadera, rol, rol_sec")
				.eq("temporada_id", activeTemporadaId)
				.order("nombre", { ascending: true });

			if (!error && data) {
				setCensus(data);
			}
			setLoading(false);
		}

		if (isOpen && activeTemporadaId) {
			fetchCensus();
			projectStore.getState().fetchCensusApodos();
		}
	}, [isOpen, activeTemporadaId]);

	function handleSelect(c: CensusEntry) {
		if (censusTarget) {
			const display = c.apodo ? c.apodo : `${c.nombre} ${c.apellidos}`;
			setNombre(censusTarget.tid, censusTarget.ci, display);
			// Aplicar rol principal si existe
			if (c.rol) {
				setRolPri(censusTarget.tid, censusTarget.ci, c.rol);
			}
			// Aplicar rol secundario si existe
			if (c.rol_sec) {
				setRolSec(censusTarget.tid, censusTarget.ci, c.rol_sec);
			}
			setCensusTarget(null);
			closeSheet();
		}
	}

	const filtered = census.filter((c) =>
		`${c.nombre} ${c.apellidos} ${c.apodo || ""}`
			.toLowerCase()
			.includes(filter.toLowerCase()),
	);

	function syncApodosATrabajadoras() {
		projectStore.getState().aplicarApodosATrabajadoras();
		alert("✓ Apodos sincronizados a las trabajaderas. Revisa la hoja del Capataz y las exportaciones.");
	}

	return (
		<>
			<div className={`bso${isOpen ? " open" : ""}`} onClick={closeSheet} />
			<div className={`bss${isOpen ? " open" : ""}`}>
				<div className="bs-handle" />
				<div className="bs-hdr">
					<span className="bs-title">📋 Censo de Cuadrilla</span>
					<button className="btn btn-ghost btn-sm" onClick={closeSheet}>
						✕
					</button>
				</div>

				<div className="px-4 mb-2">
					<input
						className="inp w-full"
						placeholder="Buscar por nombre o apodo..."
						value={filter}
						onChange={(e) => setFilter(e.target.value)}
						style={{ height: "40px" }}
					/>
				</div>
				<button
					className="btn btn-oro btn-sm"
					onClick={syncApodosATrabajadoras}
					style={{ height: "40px", marginLeft: "8px", fontSize: "0.75rem" }}
				>
					🔄 Sincronizar apodos a trabajaderas
				</button>

				<div
					className="bs-body"
					style={{ maxHeight: "60vh", overflowY: "auto" }}
				>
					{loading ? (
						<div className="p-4 text-center tcre-o cinzel">
							Cargando censo...
						</div>
					) : filtered.length === 0 ? (
						<div className="p-4 text-center tcre-o">
							No hay costaleros registrados en el censo para este proyecto.
						</div>
					) : (
						(() => {
							// Agrupar por trabajadera
							const groups: Record<string, CensusEntry[]> = {};
							filtered.forEach((c) => {
								const t = c.trabajadera
									? `TRABAJADERA ${c.trabajadera}`
									: "SIN ASIGNAR";
								if (!groups[t]) groups[t] = [];
								groups[t].push(c);
							});

							// Ordenar grupos (primero TR 1, TR 2... luego SIN ASIGNAR)
							const sortedGroups = Object.keys(groups).sort((a, b) => {
								if (a === "SIN ASIGNAR") return 1;
								if (b === "SIN ASIGNAR") return -1;
								return a.localeCompare(b, undefined, { numeric: true });
							});

							return sortedGroups.map((groupName) => (
								<div key={groupName} className="mb-6">
									<div className="px-4 py-2 bg-[rgba(184,151,62,0.2)] text-[var(--oro)] text-[0.7rem] font-black uppercase tracking-[0.3em] border-y-2 border-[var(--oro)]/30 flex justify-between items-center sticky top-0 z-10 backdrop-blur-sm">
										<span>{groupName}</span>
										<span className="opacity-60 text-[0.6rem]">
											{groups[groupName].length} PERSONAS
										</span>
									</div>
									<div className="divide-y divide-[var(--oro)]/10">
										{groups[groupName].map((c) => (
											<div
												key={c.id}
												className="bs-item flex items-center gap-3 cursor-pointer hover:bg-[rgba(201,168,76,0.1)] transition-colors py-3"
												onClick={() => handleSelect(c)}
											>
												<div className="flex-1">
													<div className="font-bold text-[var(--cre)] text-base">
														{c.nombre} {c.apellidos}
													</div>
													{c.apodo && (
														<div className="text-[0.65rem] text-[var(--oro)] uppercase font-black tracking-widest mt-0.5">
															@{c.apodo}
														</div>
													)}
												{editingApodo[c.id] !== undefined && (
													<div className="mt-2 flex gap-2">
														<input
															className="inp w-48"
															placeholder="Apodo"
															value={editingApodo[c.id]}
															onChange={e => setEditingApodo({ ...editingApodo, [c.id]: e.target.value })}
															style={{ height: "34px", fontSize: "0.85rem" }}
														/>
														<button
															onClick={() => {
																const v = (editingApodo[c.id] ?? "").trim();
																if (v === c.apodo) {
																	setEditingApodo({ ...editingApodo, [c.id]: undefined });
																	return;
																}
																setSavingApodo({ ...savingApodo, [c.id]: true });
																fetch(`/api/census/${c.id}/apodo`, {
																	method: "PATCH",
																	headers: { "Content-Type": "application/json" },
																	body: JSON.stringify({ apodo: v }),
																})
																	.then(async res => {
																		if (!res.ok) throw new Error("Error al guardar");
																		const updated = await res.json();
																		setCensus(census.map(x => (x.id === c.id ? { ...x, apodo: updated.apodo } : x)));
																		setEditingApodo({ ...editingApodo, [c.id]: undefined });
																		projectStore.getState().aplicarApodosATrabajadoras();
																	})
																	.catch(err => {
																		console.error(err);
																		alert("No se pudo guardar el apodo");
																	})
																	.finally(() => setSavingApodo({ ...savingApodo, [c.id]: false }));
															}}														className="btn btn-oro btn-sm"
															style={{ height: "34px", padding: "0 8px", fontSize: "0.75rem", display: savingApodo[c.id] ? "none" : "inline-block" }}
														>💾</button>
														<button
															onClick={() => setEditingApodo({ ...editingApodo, [c.id]: undefined })}
															className="btn btn-ghost btn-sm"
															style={{ height: "34px", padding: "0 8px", fontSize: "0.75rem" }}
														>✕</button>
													</div>
												)}
												</div>
												{c.trabajadera && (
													<div
														className="t-badge !w-7 !h-7 !text-[0.7rem] border-[var(--oro)]/50"
														title="Trabajadera"
													>
														{c.trabajadera}
													</div>
												)}
											</div>
										))}
									</div>
								</div>
							));
						})()
					)}
				</div>
			</div>
		</>
	);
}
