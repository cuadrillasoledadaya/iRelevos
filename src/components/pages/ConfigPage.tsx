"use client";

import React, { useState } from "react";
import {
	uiStore,
	projectStore,
	bancoStore,
	trabajaderaStore,
	planStore,
} from "@/stores";
import type { Trabajadera, PlanRelevo, TramoTipo } from "@/lib/types";
import { tramosOptimos, sugerirDistribucion } from "@/lib/algoritmos";
import { shortName, pillName } from "@/lib/nombres";
import DistributionEditor from "./DistributionEditor";
import { useAuth } from "@/hooks/useAuth";

export default function ConfigPage() {
	const S = projectStore((s) => s.S);
	const addBanco = bancoStore.getState().addBanco;
	const delBanco = bancoStore.getState().delBanco;
	const editBanco = bancoStore.getState().editBanco;
	const reorderBanco = bancoStore.getState().reorderBanco;
	const limpiarBanco = bancoStore.getState().limpiarBanco;
	const calcularTodo = planStore.getState().calcularTodo;
	const resetTodo = planStore.getState().resetTodo;
	const limpiarPlanificacion = planStore.getState().limpiarPlanificacion;
	const limpiarTrabajaderas = planStore.getState().limpiarTrabajaderas;
	const vaciarCenso = projectStore.getState().vaciarCenso;
	const addPlan = planStore.getState().addPlan;
	const updatePlan = planStore.getState().updatePlan;
	const updatePlanTramos = planStore.getState().updatePlanTramos;
	const delPlan = planStore.getState().delPlan;
	const [bancoInp, setBancoInp] = useState("");
	const [newPlanName, setNewPlanName] = useState("");
	const [selectedTramos, setSelectedTramos] = useState<string[]>([]);
	const [editingBancoIdx, setEditingBancoIdx] = useState<number | null>(null);
	const [editingBancoVal, setEditingBancoVal] = useState("");
	const [dragIdx, setDragIdx] = useState<number | null>(null);
	const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

	function handleAddBanco() {
		const val = bancoInp.trim();
		if (!val) return;
		addBanco(val);
		setBancoInp("");
	}

	function startEditBanco(idx: number) {
		setEditingBancoIdx(idx);
		setEditingBancoVal(S.banco[idx]);
	}

	function commitEditBanco() {
		if (editingBancoIdx === null) return;
		const val = editingBancoVal.trim();
		if (val) {
			editBanco(editingBancoIdx, val);
		}
		setEditingBancoIdx(null);
		setEditingBancoVal("");
	}

	function cancelEditBanco() {
		setEditingBancoIdx(null);
		setEditingBancoVal("");
	}

	function handleDragStart(idx: number) {
		setDragIdx(idx);
	}

	function handleDragOver(e: React.DragEvent, idx: number) {
		e.preventDefault();
		if (dragIdx === null || dragIdx === idx) return;
		reorderBanco(dragIdx, idx);
		setDragIdx(idx);
	}

	function handleDragEnd() {
		setDragIdx(null);
	}

	function handleAddPlan() {
		const name = newPlanName.trim();
		if (!name || selectedTramos.length === 0) return;
		addPlan(name, [...selectedTramos]);
		setNewPlanName("");
		setSelectedTramos([]);
	}

	function handleSavePlan() {
		if (!editingPlanId) return;
		const name = newPlanName.trim();
		if (!name || selectedTramos.length === 0) return;
		updatePlan(editingPlanId, name);
		updatePlanTramos(editingPlanId, [...selectedTramos]);
		setEditingPlanId(null);
		setNewPlanName("");
		setSelectedTramos([]);
	}

	function handleCancelEditPlan() {
		setEditingPlanId(null);
		setNewPlanName("");
		setSelectedTramos([]);
	}

	function startEditPlan(plan: PlanRelevo) {
		setEditingPlanId(plan.id);
		setNewPlanName(plan.nombre);
		setSelectedTramos([...plan.tramos]);
	}

	function toggleTramoEnPlan(nombre: string) {
		setSelectedTramos((prev) => {
			const exists = prev.some((t) => t.toLowerCase() === nombre.toLowerCase());
			if (exists) {
				return prev.filter((t) => t.toLowerCase() !== nombre.toLowerCase());
			}
			return [...prev, nombre];
		});
	}

	function moveSelectedTramo(index: number, direction: number) {
		const newIndex = index + direction;
		if (newIndex < 0 || newIndex >= selectedTramos.length) return;
		setSelectedTramos((prev) => {
			const arr = [...prev];
			const temp = arr[index];
			arr[index] = arr[newIndex];
			arr[newIndex] = temp;
			return arr;
		});
	}

	function removeSelectedTramo(index: number) {
		setSelectedTramos((prev) => prev.filter((_, i) => i !== index));
	}

	function handleReset() {
		if (
			confirm(
				"⚠ ATENCIÓN: Esta acción borrará TODO el plan actual, todos los costaleros, roles, tramos y estadísticas de este Paso.\n\n¿Estás completamente seguro de que quieres empezar desde cero?",
			)
		) {
			resetTodo();
		}
	}

	return (
		<div className="pb-8">
			{/* Banco de Relevos */}
			<div className="spanel mb4">
				<div className="sec">✦ Banco de Relevos</div>
				<div className="banco-tags mb3 flex flex-col gap-1">
					{S.banco.map((n: string, i: number) => (
						<div
							key={i}
							onDragOver={(e) => handleDragOver(e, i)}
							onDragEnd={handleDragEnd}
							className={`banco-tag-row flex items-center gap-2 px-2 py-1.5 rounded border ${
								dragIdx === i
									? "border-oro bg-oro/10"
									: "border-white/5 bg-black/10"
							}`}
						>
							<span
								draggable
								onDragStart={() => handleDragStart(i)}
								className="xs text-oro-o font-bold min-w-[28px] cursor-grab select-none"
								title="Arrastrar para reordenar"
							>
								⠿ {i + 1}.-
							</span>
							{editingBancoIdx === i ? (
								<input
									className="inp f1 sm"
									value={editingBancoVal}
									onChange={(e) => setEditingBancoVal(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") commitEditBanco();
										if (e.key === "Escape") cancelEditBanco();
									}}
									onBlur={commitEditBanco}
									autoFocus
									maxLength={50}
								/>
							) : (
								<span
									className="sm f1 cursor-text"
									onClick={() => startEditBanco(i)}
									title="Click para editar"
								>
									{n}
								</span>
							)}
							<span className="bdel ml-auto" onClick={() => delBanco(i)}>
								✕
							</span>
						</div>
					))}
				</div>
				<div className="flex g2">
					<input
						className="inp f1"
						placeholder="Añadir relevo…"
						maxLength={50}
						value={bancoInp}
						onChange={(e) => setBancoInp(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleAddBanco()}
					/>
					<button className="btn btn-out btn-sm" onClick={handleAddBanco}>
						+ Añadir
					</button>
				</div>
			</div>

			{/* Planes de Relevos */}
			<div className="spanel mb4">
				<div className="sec">✦ Planes de Relevos</div>
				<p className="sm tcre-o mb3">
					Crea plantillas de secuencias de tramos para aplicar en cualquier
					trabajadera.
				</p>

				{S.planes.length === 0 ? (
					<p className="sm tcre-o mb3">No hay planes de relevos.</p>
				) : (
					<div className="fc gap-3 mb3">
						{S.planes.map((plan: PlanRelevo) => (
							<div
								key={plan.id}
								className={`flex jb aic g2 p-3 rounded-xl border transition-all ${
									editingPlanId === plan.id
										? "border-[var(--oro)]/60 bg-[var(--oro)]/8 shadow-[0_0_12px_rgba(201,168,76,0.15)]"
										: "border-[var(--oro)]/15 bg-[var(--card)]/60 hover:border-[var(--oro)]/30 hover:bg-[var(--oro)]/4"
								}`}
								style={{
									boxShadow:
										editingPlanId === plan.id
											? "0 0 12px rgba(201,168,76,0.15)"
											: "0 1px 3px rgba(0,0,0,0.2)",
								}}
							>
								<div className="fc f1 gap-0.5">
									<span
										className="font-bold text-[var(--cre)] text-sm cinzel"
										style={{ cursor: "pointer" }}
										onClick={() => startEditPlan(plan)}
										title="Click para editar"
									>
										{plan.nombre}
									</span>
									<span className="xs tcre-o">
										{plan.tramos.length} tramos:{" "}
										{plan.tramos.slice(0, 4).join(", ")}
										{plan.tramos.length > 4 ? "…" : ""}
									</span>
								</div>
								<div className="flex g1 shrink-0">
									<button
										className="btn btn-ghost btn-sm"
										onClick={() => startEditPlan(plan)}
										title="Editar plan"
									>
										✏️
									</button>
									<button
										className="btn btn-ghost btn-sm"
										onClick={() => {
											if (confirm('¿Eliminar el plan "' + plan.nombre + '"?'))
												delPlan(plan.id);
										}}
									>
										✕
									</button>
								</div>
							</div>
						))}
					</div>
				)}

				<div className="fc gap-3">
					{/* Header del form */}
					<div className="flex jb aic">
						<span className="xs toro-o cinzel uppercase" style={{ letterSpacing: ".05em" }}>
							{editingPlanId ? "✏️ Editando plan" : "➕ Nuevo plan"}
						</span>
						{editingPlanId && (
							<button
								className="btn btn-ghost btn-xs text-red-400"
								onClick={handleCancelEditPlan}
							>
								Cancelar
							</button>
						)}
					</div>

					<input
						className="inp f1"
						placeholder="Nombre del plan…"
						maxLength={50}
						value={newPlanName}
						onChange={(e) => setNewPlanName(e.target.value)}
					/>

					{/* Selector del banco */}
					<div>
						<div
							className="xs toro-o cinzel uppercase mb2"
							style={{ letterSpacing: ".05em" }}
						>
							Seleccionar del banco
						</div>
						<div className="flex flex-wrap gap-2">
							{S.banco.map((nombre: string) => {
								const isSelected = selectedTramos.some(
									(t) => t.toLowerCase() === nombre.toLowerCase(),
								);
								return (
									<button
										key={nombre}
										className={`btn btn-sm ${isSelected ? "btn-oro" : "btn-ghost"}`}
										onClick={() => toggleTramoEnPlan(nombre)}
										title={isSelected ? "Quitar del plan" : "Añadir al plan"}
									>
										{isSelected ? "✓ " : "+ "}
										{nombre}
									</button>
								);
							})}
						</div>
					</div>

					{/* Tramos seleccionados (ordenados) */}
					{selectedTramos.length > 0 && (
						<div>
							<div
								className="xs toro-o cinzel uppercase mb2"
								style={{ letterSpacing: ".05em" }}
							>
								Orden del plan ({selectedTramos.length})
							</div>
							<div className="fc gap-2">
								{selectedTramos.map((nombre, idx) => (
									<div
										key={`${nombre}-${idx}`}
										className="flex jb aic g2 border border-white/10 rounded px-2 py-1.5 bg-black/20"
									>
										<span className="sm font-bold text-oro">{idx + 1}.</span>
										<span className="sm f1">{nombre}</span>
										<div className="flex g1">
											<button
												className="btn btn-ghost btn-icon btn-xs"
												onClick={() => moveSelectedTramo(idx, -1)}
												disabled={idx === 0}
											>
												↑
											</button>
											<button
												className="btn btn-ghost btn-icon btn-xs"
												onClick={() => moveSelectedTramo(idx, 1)}
												disabled={idx === selectedTramos.length - 1}
											>
												↓
											</button>
											<button
												className="btn btn-ghost btn-icon btn-xs text-red-400"
												onClick={() => removeSelectedTramo(idx)}
											>
												✕
											</button>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					<button
						className={`btn btn-sm w-full ${
							editingPlanId
								? "btn-oro"
								: "btn-out"
						}`}
						onClick={editingPlanId ? handleSavePlan : handleAddPlan}
						disabled={!newPlanName.trim() || selectedTramos.length === 0}
					>
						{editingPlanId ? "💾 Guardar cambios" : "+ Crear plan"}
					</button>
				</div>
			</div>

			{/* Trabajaderas */}
			<div className="sec">✦ Trabajaderas</div>
			<p className="sm tcre-o mb3" style={{ lineHeight: 1.6 }}>
				<span className="tok">① 5 dentro siempre</span> ·
				<span style={{ color: "var(--oro-c)" }}> ② Salidas equitativas</span> ·
				<span className="terr"> ③ Sin repetir 1º/último</span>
			</p>

			<div id="trab-list">
				{S.trabajaderas.map((t: Trabajadera) => (
					<ConfigTrabajadera key={t.id} t={t} />
				))}
			</div>

			{/* Mantenimiento y Limpieza */}
			<div
				className="spanel mb4"
				style={{ borderColor: "rgba(139,26,26,0.3)" }}
			>
				<div className="sec !text-red-400 !border-red-900/30">
					✦ Mantenimiento y Limpieza
				</div>
				<p className="sm tcre-o mb4">
					Acciones de borrado. Úsalas con precaución.
				</p>

				<div className="fc gap-3">
					<div className="flex jb aic g2 border-b border-white/5 pb-3">
						<div className="fc">
							<span className="sm font-bold">Limpiar Planificación</span>
							<span className="xs tcre-o">
								Borra solo los relevos calculados (mantiene nombres).
							</span>
						</div>
						<button
							className="btn btn-ghost btn-sm"
							onClick={() => {
								if (
									confirm(
										"¿Borrar todos los relevos calculados? Los nombres y equipos se mantendrán.",
									)
								)
									limpiarPlanificacion();
							}}
						>
							Limpiar
						</button>
					</div>

					<div className="flex jb aic g2 border-b border-white/5 pb-3">
						<div className="fc">
							<span className="sm font-bold">Vaciar Equipos</span>
							<span className="xs tcre-o">
								Quita todos los nombres y roles de las trabajaderas.
							</span>
						</div>
						<button
							className="btn btn-ghost btn-sm"
							onClick={() => {
								if (
									confirm(
										"¿Vaciar todos los nombres de las trabajaderas? Esto no se puede deshacer.",
									)
								)
									limpiarTrabajaderas();
							}}
						>
							Vaciar
						</button>
					</div>

					<div className="flex jb aic g2 border-b border-white/5 pb-3">
						<div className="fc">
							<span className="sm font-bold">Limpiar Banco</span>
							<span className="xs tcre-o">
								Vacía la lista de suplentes (Banco de nombres).
							</span>
						</div>
						<button
							className="btn btn-ghost btn-sm"
							onClick={() => {
								if (
									confirm("¿Borrar todos los nombres del banco de suplentes?")
								)
									limpiarBanco();
							}}
						>
							Borrar
						</button>
					</div>

					<div className="flex jb aic g2 border-b border-white/5 pb-3">
						<div className="fc">
							<span className="sm font-bold">Vaciar Censo</span>
							<span className="xs tcre-o">
								Borra la base de datos de personas de este proyecto.
							</span>
						</div>
						<button
							className="btn btn-ghost btn-sm"
							onClick={() => {
								if (
									confirm(
										"⚠ ATENCIÓN: Esto borrará permanentemente todos los costaleros del CENSO de este proyecto.\n\n¿Estás seguro?",
									)
								)
									vaciarCenso();
							}}
						>
							Vaciar
						</button>
					</div>

					<div className="flex jb aic g2 pt-1">
						<div className="fc">
							<span className="sm font-bold text-red-400">Reset Total</span>
							<span className="xs tcre-o">
								Borra TODO y empieza de cero (excepto el censo).
							</span>
						</div>
						<button className="btn btn-danger btn-sm" onClick={handleReset}>
							↺ Hard Reset
						</button>
					</div>
				</div>
			</div>

			<div className="btn-row mt4">
				<button className="btn btn-oro f1 w100" onClick={calcularTodo}>
					⚙ Calcular Todas
				</button>
			</div>
		</div>
	);
}

function ConfigTrabajadera({ t }: { t: Trabajadera }) {
	const S = projectStore((s) => s.S);
	const { profile } = useAuth();
	const esMando =
		profile?.role === "superadmin" ||
		profile?.role === "capataz" ||
		profile?.role === "auxiliar";
	const setSalidas = trabajaderaStore.getState().setSalidas;
	const addTramo = trabajaderaStore.getState().addTramo;
	const delTramo = trabajaderaStore.getState().delTramo;
	const setNombreTramo = trabajaderaStore.getState().setNombreTramo;
	const setBancoTarget = uiStore.getState().setBancoTarget;
	const openSheet = uiStore.getState().openSheet;
	const calcularTrab = planStore.getState().calcularTrab;
	const toggleTramoClave = trabajaderaStore.getState().toggleTramoClave;
	const cargarPlanEnTrabajadera = planStore.getState().cargarPlanEnTrabajadera;
	const toggleCuadrillaDoblada = trabajaderaStore.getState().toggleCuadrillaDoblada;
	const setTipoTramo = trabajaderaStore.getState().setTipoTramo;
	const setDistribucionCuadrillas = trabajaderaStore.getState().setDistribucionCuadrillas;

	const [isOpen, setIsOpen] = useState(false);
	const [planSel, setPlanSel] = useState("");
	const [showEditor, setShowEditor] = useState(false);
	const [editDist, setEditDist] = useState<{ a: number[]; b: number[] } | null>(null);
	const [allSecError, setAllSecError] = useState<string | null>(null);

	const total = t.nombres.length;
	const nBajas = t.bajas?.length || 0;
	const totalActivos = total - nBajas;
	const F = t.regla5costaleros && total === 5 ? 1 : total - 5;

	const salidas = t.salidas ?? 2;
	const nOpt = tramosOptimos(totalActivos, salidas, t.regla5costaleros);
	const nAct = t.tramos.length;
	const hayPlan = !!t.plan;
	const an = t.analisis;

	// Status computation (similar to original trabHTML logic)
	let stCls = "";
	let stTxt = "";
	let cardCls = "";
	if (!hayPlan) {
		stCls = "pend";
		stTxt = "Pendiente";
		cardCls = "";
	} else if (!an?.dentro5 || !an.okObj) {
		stCls = "err";
		stTxt = "✗ Error";
		cardCls = "err";
	} else if (an.rep.length > 0) {
		stCls = "warn";
		stTxt = `⚠ ${an.rep.length} repite`;
		cardCls = "warn";
	} else {
		stCls = "ok";
		stTxt = "✓ OK";
		cardCls = "ok";
	}

	const objV = t.obj ? Object.values(t.obj) : [];
	const minS = objV.length ? Math.min(...objV) : salidas;
	const maxS = objV.length ? Math.max(...objV) : salidas;
	const extC = objV.filter((v) => v === maxS).length;
	const salDesc =
		minS === maxS
			? `${minS} sal./cost.`
			: `${minS}-${maxS} sal. (${extC} con ${maxS})`;

	// Move array elements logic locally
	function moveTramo(ti: number, offset: number) {
		if (ti + offset < 0 || ti + offset >= t.tramos.length) return;
		const arr = [...t.tramos];
		const temp = arr[ti];
		arr[ti] = arr[ti + offset];
		arr[ti + offset] = temp;
		// Modifying through a simple array update wrapper trick or simply set names
		setNombreTramo(t.id, ti, arr[ti]);
		setNombreTramo(t.id, ti + offset, arr[ti + offset]);
	}

	function openSug() {
		setBancoTarget({ tid: t.id, ti: -1 });
		openSheet("sugerencia");
	}

	function openBnc(ti: number) {
		setBancoTarget({ tid: t.id, ti });
		openSheet("banco");
	}

	function handleToggleDoblada() {
		if (!esMando) return;
		const res = toggleCuadrillaDoblada(t.id);
		if (res.nuevo && res.distribucionAplicada) {
			setEditDist(res.distribucionAplicada);
			setShowEditor(true);
		} else {
			setShowEditor(false);
			setEditDist(null);
		}
		setAllSecError(null);
	}

	function handleTipoChange(ti: number, tipo: TramoTipo) {
		if (!esMando) return;
		// Read current tramosTipo from the store (not stale closure)
		const currentTrabajadera = projectStore.getState().S.trabajaderas.find(
			(w: Trabajadera) => w.id === t.id,
		);
		const current = currentTrabajadera?.tramosTipo ?? [];
		// Validate BEFORE mutating: would this result in all-secundario?
		const updated = current.map((v, i) => (i === ti ? tipo : v));
		if (!updated.includes("primario")) {
			setAllSecError("Al menos un tramo debe ser primario");
			return; // Block the store mutation
		}
		setAllSecError(null);
		setTipoTramo(t.id, ti, tipo);
	}

	function handleOpenEditor() {
		const dist = t.distribucionCuadrillas;
		if (dist) {
			setEditDist({ a: [...dist.a], b: [...dist.b] });
		} else {
			const suggested = sugerirDistribucion(t);
			const a = suggested.a.map((name) => t.nombres.indexOf(name));
			const b = suggested.b.map((name) => t.nombres.indexOf(name));
			setEditDist({ a, b });
		}
		setShowEditor(true);
	}

	function handleEditorConfirm() {
		if (editDist) {
			setDistribucionCuadrillas(t.id, editDist.a, editDist.b);
		}
		setShowEditor(false);
		setEditDist(null);
	}

	function handleEditorCancel() {
		setShowEditor(false);
		setEditDist(null);
	}

	return (
		<div className={`card ${cardCls} ${isOpen ? "open" : ""} mb-4`}>
			<div className="trab-hdr" onClick={() => setIsOpen(!isOpen)}>
				<div className="t-badge">{t.id}</div>
				<div className="t-info">
					<div className="t-name">Trabajadera {t.id}</div>
					<div className="t-meta">
						{totalActivos} cost. · {F} fuera/tramo · {salDesc}
					</div>
				</div>
				<span className={`badge ${stCls}`}>{stTxt}</span>
				<span className="t-chev">▼</span>
			</div>

			<div className="trab-body">
				<div className="flex g4 fw mb3">
					<div className="fc" style={{ gap: ".18rem" }}>
						<span
							className="xs toro-o cinzel uppercase"
							style={{ letterSpacing: ".05em" }}
						>
							Salidas objetivo
						</span>
						<div className="ctr">
							<button
								className="ctr-btn"
								onClick={() => setSalidas(t.id, salidas - 1)}
								disabled={salidas <= 1}
							>
								−
							</button>
							<div className="ctr-val">{salidas}</div>
							<button
								className="ctr-btn"
								onClick={() => setSalidas(t.id, salidas + 1)}
							>
								+
							</button>
						</div>
					</div>
				</div>

				<div className="mbox">
					<div className="mrow">
						<span className="ml">Costaleros:</span>
						<span className="mv">{totalActivos}</span>
						<span className="ms">·</span>
						<span className="ml">Fuera/tramo:</span>
						<span className="mv">{F}</span>
						<span className="ms">·</span>
						<span className="ml">Salidas obj.:</span>
						<span className="mv mok">{salidas}</span>
						<span className="ms">·</span>
						<span className="ml">Tramos ópt.:</span>
						<span className="mv mok">{nOpt}</span>
						{nAct !== nOpt && <span className="mw">← ahora {nAct}</span>}
					</div>
				</div>

				{/* Cuadrilla Doblada master toggle — mando-only */}
				{esMando && totalActivos >= 10 && (
					<div className="mbox mt3">
						<div className="flex aic jb">
							<div>
								<div className="text-[0.7rem] font-bold text-[var(--cd-tx)]">
									Cuadrilla Doblada
								</div>
								<div className="text-[0.55rem] text-[var(--cre-o)]">
									{t.cuadrillaDoblada
										? "Activa — configura tramos y distribución abajo"
										: "10+ costaleros disponibles — activar para rotación A/B"}
								</div>
							</div>
							<button
								type="button"
								className="cd-toggle"
								aria-pressed={t.cuadrillaDoblada}
								onClick={handleToggleDoblada}
							>
								<span className="cd-toggle-label">Doblada</span>
								<span
									className={`cd-toggle-pill ${t.cuadrillaDoblada ? "on" : "off"}`}
								>
									<span className="cd-toggle-knob" />
								</span>
								<span className="cd-toggle-state">
									{t.cuadrillaDoblada ? "ON" : "OFF"}
								</span>
							</button>
						</div>
						{t.cuadrillaDoblada && (
							<div className="mt2 text-[0.6rem] text-[var(--cre-o)]">
								{t.distribucionCuadrillas ? (
									<>
										A: {t.distribucionCuadrillas.a.length} / B:{" "}
										{t.distribucionCuadrillas.b.length}{" "}
										<button
											className="btn btn-ghost btn-xs ml1"
											onClick={handleOpenEditor}
											disabled
										>
											Editar distribución →
										</button>
										<button
											className="btn btn-ghost btn-xs ml1 text-red-400"
											onClick={() => {
												setDistribucionCuadrillas(t.id, [], []);
											}}
										>
											Limpiar distribución
										</button>
									</>
								) : (
									<button
										className="btn btn-ghost btn-xs ml1"
										onClick={handleOpenEditor}
									>
										Editar distribución →
									</button>
								)}
							</div>
						)}
					</div>
				)}

				<div
					className="xs toro-o cinzel uppercase mb3"
					style={{ letterSpacing: ".06em" }}
				>
					Tramos del ciclo
				</div>

				{/* Plan Selector */}
				{S.planes.length > 0 && (
					<div className="flex g2 aie mb3">
						<select
							className="inp f1"
							value={planSel}
							onChange={(e) => setPlanSel(e.target.value)}
							aria-label="Cargar plan de tramos"
						>
							<option value="">-- Cargar plan --</option>
							{S.planes.map((p: PlanRelevo) => (
								<option key={p.id} value={p.id}>
									{p.nombre} ({p.tramos.length} tramos)
								</option>
							))}
						</select>
						<button
							className="btn btn-out btn-sm"
							disabled={!planSel}
							onClick={() => {
								if (planSel) {
									cargarPlanEnTrabajadera(t.id, planSel);
									setPlanSel("");
								}
							}}
						>
							Cargar
						</button>
					</div>
				)}

				<div className="tramos-list">
					{t.tramos.map((nombre, ti) => {
						const esPri = ti === 0;
						const esUlt = ti === nAct - 1;
						const tagHtml = esPri ? (
							<span className="tr-tag p">1º</span>
						) : esUlt ? (
							<span className="tr-tag u">Últ</span>
						) : (
							<span className="tr-sp"></span>
						);

						const tipoActual: TramoTipo =
							t.tramosTipo?.[ti] ?? "primario";

						return (
							<div key={ti} className="tr-wrap">
								<div className="tr-row">
									<span className="tr-num">{ti + 1}</span>
									{tagHtml}
									<input
										className={`inp f1 ${esPri ? "primero" : esUlt ? "ultimo" : ""}`}
										style={{
											height: "40px",
											minHeight: "40px",
											...(t.tramosClaves?.includes(ti)
												? {
														borderColor: "var(--oro)",
														backgroundColor: "rgba(201,168,76,0.08)",
														color: "var(--oro)",
													}
												: {}),
										}}
										value={nombre}
										onChange={(e) => setNombreTramo(t.id, ti, e.target.value)}
									/>
									{/* P/S selector — only when doblado ON */}
									{t.cuadrillaDoblada && esMando && (
										<div className="flex gap-1 ml1">
											<button
												className={`btn btn-xs px2 py1 rounded text-[0.6rem] font-bold ${
													tipoActual === "primario"
														? "bg-[rgba(26,92,42,0.6)] text-ok-tx border border-ok-bd"
														: "bg-[var(--cd-bg)] text-[var(--cd-tx)] border border-[var(--cd-bd)]"
												}`}
												onClick={() => handleTipoChange(ti, "primario")}
												title="Tramo primario"
											>
												P
											</button>
											<button
												className={`btn btn-xs px2 py1 rounded text-[0.6rem] font-bold ${
													tipoActual === "secundario"
														? "bg-[rgba(139,26,26,0.6)] text-err-tx border border-err-bd"
														: "bg-[var(--cd-bg)] text-[var(--cd-tx)] border border-[var(--cd-bd)]"
												}`}
												onClick={() => handleTipoChange(ti, "secundario")}
												title="Tramo secundario"
											>
												S
											</button>
										</div>
									)}
									<button
										className={`btn btn-icon btn-sm ${t.tramosClaves?.includes(ti) ? "text-black shadow-[0_0_8px_rgba(201,168,76,0.5)]" : "btn-ghost text-cre-o"}`}
										style={
											t.tramosClaves?.includes(ti)
												? { backgroundColor: "var(--oro)" }
												: {}
										}
										onClick={() => toggleTramoClave(t.id, ti)}
										title={
											t.tramosClaves?.includes(ti)
												? "Quitar tramo clave"
												: "Marcar como tramo clave"
										}
									>
										{t.tramosClaves?.includes(ti) ? "★" : "☆"}
									</button>
									<button
										className="btn btn-ghost btn-icon btn-sm"
										onClick={() => openBnc(ti)}
									>
										📋
									</button>
									<button
										className="btn btn-ghost btn-icon btn-sm"
										disabled={esPri}
										onClick={() => moveTramo(ti, -1)}
									>
										↑
									</button>
									<button
										className="btn btn-ghost btn-icon btn-sm"
										disabled={esUlt}
										onClick={() => moveTramo(ti, +1)}
									>
										↓
									</button>
									<button
										className="btn btn-danger btn-icon btn-sm"
										onClick={() => delTramo(t.id, ti)}
										disabled={nAct <= 1}
									>
										✕
									</button>
								</div>
							</div>
						);
					})}
				</div>

				<div className="btn-row mt3 overflow-x-auto flex-wrap">
					<button
						className="btn btn-ghost btn-sm flex-1 min-w-[100px]"
						onClick={() => addTramo(t.id)}
					>
						+ Tramo
					</button>
					<button
						className="btn btn-out btn-sm flex-1 min-w-[100px]"
						onClick={openSug}
					>
						📐 Sugerir
					</button>
					<button
						className="btn btn-oro btn-sm flex-1 min-w-[100px]"
						onClick={() => calcularTrab(t.id)}
					>
						⚙ Calcular
					</button>
				</div>

				{/* Validation error: all-secundario blocks confirm */}
				{allSecError && (
					<div className="mt2 text-[0.65rem] text-err-tx font-bold text-center">
						⚠ {allSecError}
					</div>
				)}

				{/* Distribution Editor */}
				{showEditor && editDist && esMando && (
					<DistributionEditor
						tid={t.id}
						nombres={t.nombres}
						distribucion={editDist}
						onConfirm={handleEditorConfirm}
						onCancel={handleEditorCancel}
					/>
				)}

				{hayPlan && an && (
					<div className="mt4">
						<div
							className="xs toro-o cinzel mb3 uppercase"
							style={{ letterSpacing: ".06em", marginTop: ".7rem" }}
						>
							Salidas por costalero
						</div>
						<div className="sal-chips flex flex-wrap gap-1 mb3">
							{t.nombres.map((nombre, i) => {
								const v = an.conteo[i] ?? 0;
								const esp = t.obj?.[i] ?? 0;
								const cls = v === esp ? (v === minS ? "ok" : "hi") : "bad";
								return (
									<div
										key={i}
										className={`sc flex flex-col items-center gap-px px-2 py-1 rounded border text-center ${cls}`}
									>
										<div className="n text-[0.65rem] font-bold max-w-[60px] truncate whitespace-nowrap overflow-hidden">
											{shortName(nombre)}
										</div>
										<div className="v text-[0.72rem] font-black cinzel">
											{v}✕
										</div>
									</div>
								);
							})}
						</div>

						<div className="frontera flex flex-wrap gap-2 items-center px-3 py-2 rounded-md bg-[rgba(201,168,76,0.04)] border border-[rgba(201,168,76,0.12)] mb3">
							{an.rep.length === 0 ? (
								<span className="fv ok bg-ok-bg border border-ok-bd text-ok-tx text-[0.58rem] px-2 py-0.5 rounded-full cinzel">
									✓ Sin repetidores
								</span>
							) : (
								<span className="fv warn bg-err-bg border border-err-bd text-err-tx text-[0.58rem] px-2 py-0.5 rounded-full cinzel">
									⚠ {an.rep.map((i) => pillName(t, i)).join(", ")}
								</span>
							)}
							<span className="fl text-[0.55rem] text-oro-o tracking-wider cinzel uppercase ml-1">
								CONSEC.:
							</span>
							{an.cons === 0 ? (
								<span className="fv ok bg-ok-bg border border-ok-bd text-ok-tx text-[0.58rem] px-2 py-0.5 rounded-full cinzel">
									✓ Sin consec.
								</span>
							) : (
								<span className="fv warn bg-err-bg border border-err-bd text-err-tx text-[0.58rem] px-2 py-0.5 rounded-full cinzel">
									⚠ {an.cons} consec.
								</span>
							)}
						</div>

						<div className="rot-wrap overflow-x-auto mt-2">
							<table className="w-full text-[0.82rem] border-collapse">
								<thead>
									<tr>
										<th className="thl text-left cinzel text-[0.57rem] tracking-wider uppercase text-oro bg-neg-m px-1.5 py-1.5 border border-[rgba(201,168,76,0.12)]">
											Tramo
										</th>
										<th className="cinzel text-[0.57rem] tracking-wider uppercase text-oro bg-neg-m px-1.5 py-1.5 border border-[rgba(201,168,76,0.12)] text-center">
											Dentro
										</th>
										<th className="cinzel text-[0.57rem] tracking-wider uppercase text-oro bg-neg-m px-1.5 py-1.5 border border-[rgba(201,168,76,0.12)] text-center">
											Fuera
										</th>
									</tr>
								</thead>
								<tbody>
									{t.tramos.map((nombre, ti) => {
										const r = t.plan![ti] || { dentro: [], fuera: [] };
										const esPri = ti === 0;
										const esUlt = ti === nAct - 1;
										return (
											<tr
												key={ti}
												className="odd:bg-transparent even:bg-[rgba(201,168,76,0.02)]"
											>
												<td
													className={`td-n px-1.5 py-1 whitespace-nowrap border border-[rgba(201,168,76,0.07)] text-left ${esPri ? "text-ok-tx" : esUlt ? "text-err-tx" : "text-cre-o"}`}
												>
													{ti + 1}. {nombre}
													{esPri ? " 🟢" : esUlt ? " 🔴" : ""}
												</td>
												<td className="px-1.5 py-1 border border-[rgba(201,168,76,0.07)]">
													<div className="cell-pills flex flex-wrap gap-1 justify-center">
														{r.dentro.map((i) => (
															<span
																key={i}
																className="cp d bg-[rgba(26,92,42,0.5)] border border-[rgba(39,174,96,0.5)] text-ok-tx px-2 py-0.5 rounded text-[0.72rem] font-bold max-w-[90px] truncate"
															>
																{pillName(t, i)}
															</span>
														))}
													</div>
												</td>
												<td className="px-1.5 py-1 border border-[rgba(201,168,76,0.07)]">
													<div className="cell-pills flex flex-wrap gap-1 justify-center">
														{r.fuera.map((i) => {
															const isRep = esUlt && an.primer.includes(i);
															return (
																<span
																	key={i}
																	className={`cp f px-2 py-0.5 rounded text-[0.72rem] font-bold max-w-[90px] truncate ${isRep ? "rep bg-[rgba(139,26,26,0.85)] border border-[rgba(255,80,80,0.7)] text-[#ff9090] shadow-[0_0_4px_rgba(255,80,80,0.3)]" : "bg-[rgba(139,26,26,0.4)] border border-[rgba(192,57,43,0.45)] text-err-tx"}`}
																>
																	{pillName(t, i)}
																</span>
															);
														})}
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
