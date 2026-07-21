"use client";

import { useState, useMemo, memo } from "react";
import { uiStore, projectStore, trabajaderaStore, planStore } from "@/stores";
import {
	getPinned,
	countPinned,
	getFueraPorTramo,
	generarSugerenciasCorreccion,
} from "@/lib/algoritmos";
import { nameAt, shortName } from "@/lib/nombres";
import { getDentroFisico, estructuraPaso, rolLabel, rolBase } from "@/lib/roles";
import type { Trabajadera, RolCode } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import BoquillaView from "./BoquillaView";
import ConfirmarAsignacionBanner from "../feedback/ConfirmarAsignacionBanner";
import ViolationsBanner from "../feedback/ViolationsBanner";
import PreviewCorreccionesSheet from "../sheets/PreviewCorreccionesSheet";
import ConflictResolverSheet from "../sheets/ConflictResolverSheet";
import DistributionEditor from "./DistributionEditor";

export default function PlanPage() {
	const S = projectStore((s) => s.S);
	const censusBoquilla = projectStore((s) => s.censusBoquilla);
	const calcularTodo = planStore.getState().calcularTodo;
	const { profile } = useAuth();
	const esMando =
		profile?.role === "superadmin" ||
		profile?.role === "capataz" ||
		profile?.role === "auxiliar";
	const [showBoquilla, setShowBoquilla] = useState(false);
	const [conflictSheetOpen, setConflictSheetOpen] = useState(false);

	// Count boquilleros
	const boquillaCount = useMemo(() => {
		let count = 0;
		for (const t of S.trabajaderas) {
			for (const name of t.nombres) {
				if (censusBoquilla[name]) count++;
			}
		}
		return count;
	}, [S.trabajaderas, censusBoquilla]);

	// Si es costalero, mostrar vista personal
	if (!esMando) {
		return <MiPlanPersonal S={S} profile={profile} />;
	}

	return (
		<>
			<div className="sec flex jb aic">
				<span>Plan de Rotaciones</span>
				<div className="flex gap-2">
					{boquillaCount > 0 && (
						<button
							className={`btn btn-sm ${showBoquilla ? "btn-oro" : "btn-ghost"}`}
							onClick={() => setShowBoquilla(!showBoquilla)}
							title="Ver todos los boquilleros juntos"
						>
							🔶 Boquillas ({boquillaCount})
						</button>
					)}
					{esMando && (
						<button
							className="btn btn-ghost btn-sm"
							onClick={() => uiStore.getState().openSheet("history")}
							title="Ver historial de instantáneas"
						>
							📋 Historial
						</button>
					)}
					<button className="btn btn-oro btn-sm" onClick={calcularTodo}>
						⚙ Calcular Todos
					</button>
				</div>
			</div>

			{S.trabajaderas.map((t: Trabajadera) => (
				<PlanTrabajadera key={t.id} t={t} censusBoquilla={censusBoquilla} />
			))}

		{showBoquilla && boquillaCount > 0 && (
			<BoquillaView
				trabajaderas={S.trabajaderas}
				censusBoquilla={censusBoquilla}
				onOpenConflicts={() => setConflictSheetOpen(true)}
			/>
		)}

		<ConflictResolverSheet
			open={conflictSheetOpen}
			onClose={() => setConflictSheetOpen(false)}
			content={S}
		/>
		</>
	);
}

// ── Vista Personal para Costaleros ────────────────────────────────

import type { DatosPerfil } from "@/lib/types";
import type { Profile } from "@/hooks/useAuth";

function MiPlanPersonal({
	S,
	profile,
}: {
	S: DatosPerfil;
	profile: Profile | null;
}) {
	// 1. Buscar trabajadera por profile.trabajadera (campo explícito)
	// 2. Fallback: fuzzy match nombre+apellidos en todas las trabajaderas
	const myName = `${profile?.nombre ?? ""} ${profile?.apellidos ?? ""}`
		.toLowerCase()
		.trim();
	const myApodo = profile?.apodo?.toLowerCase().trim() ?? "";

	type Match = { t: Trabajadera; ci: number };
	let match: Match | null = null;

	if (profile?.trabajadera) {
		const t = S.trabajaderas.find((x) => x.id === profile.trabajadera);
		if (t) {
			const ci = t.nombres.findIndex((n, i) => {
				if (t.bajas?.includes(i)) return false;
				const ns = n.toLowerCase();
				return (
					ns.includes(myName) ||
					myName.includes(ns) ||
					(myApodo && ns.includes(myApodo))
				);
			});
			if (ci !== -1) match = { t, ci };
			else match = { t, ci: -1 }; // tiene trabajadera asignada pero no se encontró el nombre
		}
	}

	if (!match) {
		for (const t of S.trabajaderas) {
			const ci = t.nombres.findIndex((n, i) => {
				if (t.bajas?.includes(i)) return false;
				const ns = n.toLowerCase();
				return (
					ns.includes(myName) ||
					myName.includes(ns) ||
					(myApodo && ns.includes(myApodo))
				);
			});
			if (ci !== -1) {
				match = { t, ci };
				break;
			}
		}
	}

	// Expanded tramo for tap-to-show formation (must be before early return)
	const [expandedTramo, setExpandedTramo] = useState<number | null>(null);

	if (!match || !match.t.plan) {
		return (
			<div className="flex flex-col gap-4 p-4">
				<div className="sec">Mi Plan Personal</div>
				<div className="alert warn">
					{!match
						? `⚠ No se encontró tu nombre en ninguna trabajadera. Contactá con el administrador para que te asigne.`
						: `⚠ El plan de tu trabajadera aún no ha sido calculado. Consultá con el capataz.`}
				</div>
			</div>
		);
	}

	const { t, ci } = match;
	const plan = t.plan!;
	const salidas = t.analisis?.conteo[ci] ?? 0;
	const objetivo = t.obj?.[ci] ?? 0;
	const primerTramo = plan.findIndex((r) => r.dentro.includes(ci));
	const ultimoTramo = [...plan]
		.reverse()
		.findIndex((r) => r.dentro.includes(ci));
	const ultimoReal = ultimoTramo !== -1 ? plan.length - 1 - ultimoTramo : -1;

	return (
		<div className="flex flex-col gap-4 p-1 animate-in fade-in duration-500">
			{/* Cabecera */}
			<div className="flex flex-col gap-0.5">
				<h1 className="text-2xl font-black cinzel text-[var(--oro)]">
					¡Hola, {profile?.nombre}!
				</h1>
				<p className="text-[0.65rem] uppercase tracking-widest text-[var(--cre-o)] font-bold">
					Trabajadera {t.id} · {t.tramos.length} tramos
				</p>
			</div>

			{/* Stats rápidos */}
			<div className="grid grid-cols-3 gap-2">
				<div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-center">
					<div className="text-2xl font-black cinzel text-[var(--oro)]">
						{salidas}
					</div>
					<div className="text-[0.55rem] uppercase tracking-wider text-[var(--cre-o)] font-bold mt-0.5">
						Salidas
					</div>
				</div>
				{(() => {
					const firstTramoObj = t.tramos[primerTramo];
					return (
						<div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-center">
							<div
								className="text-2xl font-black cinzel text-[var(--oro)] truncate px-1"
								title={firstTramoObj}
							>
								{primerTramo !== -1
									? firstTramoObj || `T${primerTramo + 1}`
									: "—"}
							</div>
							<div className="text-[0.55rem] uppercase tracking-wider text-[var(--cre-o)] font-bold mt-0.5">
								Primera
							</div>
						</div>
					);
				})()}
				{(() => {
					const lastTramoObj = t.tramos[ultimoReal];
					return (
						<div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-center">
							<div
								className="text-2xl font-black cinzel text-[var(--oro)] truncate px-1"
								title={lastTramoObj}
							>
								{ultimoReal !== -1 ? lastTramoObj || `T${ultimoReal + 1}` : "—"}
							</div>
							<div className="text-[0.55rem] uppercase tracking-wider text-[var(--cre-o)] font-bold mt-0.5">
								Última
							</div>
						</div>
					);
				})()}
			</div>

			{/* Cuadrícula de tramos */}
			<div className="flex flex-col gap-2">
				<h2 className="text-[0.65rem] uppercase tracking-[0.2em] text-[var(--oro)] font-black">
					Tu relevo
				</h2>
				<div className="flex flex-col gap-1.5">
					{t.tramos.map((nombreTramo, ti) => {
						const r = plan[ti];
						const esDentro = r.dentro.includes(ci);
						const esFuera = r.fuera.includes(ci);
						const esClave = t.tramosClaves?.includes(ti);

						// Position lookup for DENTRO costaleros
						const dentroFisico = esDentro
							? getDentroFisico(t, r)
							: [];
						const posIdx = esDentro ? dentroFisico.indexOf(ci) : -1;
						const rol: RolCode | null =
							posIdx !== -1 ? estructuraPaso(t.id)[posIdx] ?? null : null;
						const label = rol ? rolLabel(rol, t.id) : null;

						return (
							<div key={ti}>
								<div
									className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-all ${
										esDentro
											? "bg-[var(--oro)] border-[var(--oro)] shadow-lg"
											: esFuera
												? "bg-[var(--card)] border-[var(--border)]"
												: "bg-[var(--card)] border-[var(--border)] opacity-40"
									}`}
									onClick={
										esDentro
											? () =>
													setExpandedTramo(
														expandedTramo === ti ? null : ti,
													)
											: undefined
									}
									style={esDentro ? { cursor: "pointer" } : undefined}
								>
									<div
										className={`text-[10px] font-black cinzel w-12 shrink-0 ${esDentro ? "text-black" : "text-[var(--oro)]"}`}
									>
										{t.tramos[ti] || `T${ti + 1}`}
									</div>
								<div
									className={`flex-1 text-xs font-bold truncate ${esDentro ? "text-black" : "text-[var(--cre)]"}`}
								>
									{nombreTramo}
									{esClave && (
										<span className="ml-1 text-[0.55rem]">★</span>
									)}
								</div>

								{/* 5-Dot Strip — only for DENTRO with valid position */}
								{esDentro && posIdx !== -1 && (
									<div className="dot-strip" data-testid="dot-strip">
										{Array.from({ length: 5 }, (_, pi) => {
											const mateIdx = dentroFisico[pi];
											const isEmpty = mateIdx === null || mateIdx === undefined;
											const isActive = pi === posIdx;
											return (
												<span
													key={pi}
													className={`dot ${isActive ? "dot-active" : isEmpty ? "dot-empty" : ""}`}
												/>
											);
										})}
									</div>
								)}

								<div
										className={`text-xs font-black uppercase tracking-wider shrink-0 ${
											esDentro
												? "text-black"
												: esFuera
													? "text-[var(--cre-o)]"
													: "text-[var(--border)]"
										}`}
									>
										{esDentro ? (
											posIdx !== -1 ? (
												<>
													<span
														className="pos-chip"
														data-testid="pos-chip"
													>
														{posIdx + 1}
													</span>
													<span
														className="role-label"
														data-testid="role-label"
													>
														{label}
													</span>
												</>
											) : (
												<span data-status="dentro">⬇ DENTRO</span>
											)
										) : esFuera ? (
											<span data-status="fuera">FUERA</span>
										) : (
											"—"
										)}
									</div>
								</div>

								{/* Expanded formation row */}
								{esDentro && expandedTramo === ti && (
									<div className="paso-row ml-4 mt-1">
										{dentroFisico.map((mateIdx, pi) => {
											const mateRol = estructuraPaso(t.id)[pi];
											const isMine = mateIdx === ci;
											const rolClass = mateRol
												? rolBase(mateRol)
												: "";
											return (
												<div
													key={pi}
													className="paso-slot"
												>
													{mateIdx !== null ? (
														<div
															className={`paso-pill ${rolClass} ${isMine ? "sel-mia" : ""}`}
														>
															<span className="paso-pill-name">
																{isMine
																	? "Vos"
																	: shortName(
																			nameAt(t, mateIdx),
																		)}
															</span>
														</div>
													) : (
														<div className="paso-pill vacio">
															Hueco
														</div>
													)}
												</div>
											);
										})}
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>

			{/* Progreso */}
			<div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
				<div className="flex justify-between items-center mb-2">
					<span className="text-[0.65rem] uppercase tracking-wider text-[var(--cre-o)] font-bold">
						Objetivo de salidas
					</span>
					<span className="text-sm font-black cinzel text-[var(--oro)]">
						{salidas}/{objetivo}
					</span>
				</div>
				<div className="h-2 bg-[var(--bg)] rounded-full overflow-hidden">
					<div
						className="h-full bg-[var(--oro)] rounded-full transition-all"
						style={{
							width:
								objetivo > 0
									? `${Math.min(100, (salidas / objetivo) * 100)}%`
									: "0%",
						}}
					/>
				</div>
			</div>
		</div>
	);
}

const PlanTrabajadera = memo(function PlanTrabajadera({
	t,
	censusBoquilla,
}: {
	t: Trabajadera;
	censusBoquilla: Record<string, boolean>;
}) {
	const openSheet = uiStore.getState().openSheet;
	const setCellTarget = uiStore.getState().setCellTarget;
	const setBancoTarget = uiStore.getState().setBancoTarget;
	const addTramo = trabajaderaStore.getState().addTramo;
	const delTramo = trabajaderaStore.getState().delTramo;
	const setSalidas = trabajaderaStore.getState().setSalidas;
	const calcularTrab = planStore.getState().calcularTrab;
	const completarPlan = planStore.getState().completarPlan;
	const limpiarPlan = planStore.getState().limpiarPlan;
	const getErroresPinned = planStore.getState().getErroresPinned;
	const quitarBloqueos = planStore.getState().quitarBloqueos;
  const aplicarSugerencia = planStore.getState().aplicarSugerencia;
  const toggleCuadrillaDoblada = trabajaderaStore.getState().toggleCuadrillaDoblada;
  const ultimoResultadoBulk = planStore((s) => s.ultimoResultadoBulk);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showPinToast, setShowPinToast] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const bannerResult = bannerDismissed ? null : ultimoResultadoBulk;
	const setBancoTargetLocal = uiStore.getState().setBancoTarget;
	const openSheetLocal = uiStore.getState().openSheet;
	const { profile } = useAuth();
	const esMando =
		profile?.role === "superadmin" ||
		profile?.role === "capataz" ||
		profile?.role === "auxiliar";

	// Lógica de filtrado para costaleros
	const myName = `${profile?.nombre} ${profile?.apellidos}`
		.toLowerCase()
		.trim();
	const myApodo = profile?.apodo?.toLowerCase().trim();

	const [isOpen, setIsOpen] = useState(false);
	const [hoverSugerencia, setHoverSugerencia] = useState<number | null>(null);
	const pinStatus = countPinned(t);
	const hasPins = pinStatus.total > 0;
	const nBajas = t.bajas?.length ?? 0;
	const nActivos = t.nombres.length - nBajas;
	const F = getFueraPorTramo(t);

	const erroresPinned = getErroresPinned(t.id);
	const pinned = getPinned(t);

	// Memoizado: 1× por trabajadera, reusado en celdas y sección inferior
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const sugerencias = useMemo(
		() => t.cuadrillaDoblada
			? { correcciones: [] as ReturnType<typeof generarSugerenciasCorreccion>["correcciones"] }
			: generarSugerenciasCorreccion(t),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[t.plan, t.analisis, t.nombres, t.tramos, t.bajas, t.obj, t.puntuaciones, t.tramosClaves, t.cuadrillaDoblada],
	);

	function openBanco(ti: number) {
		setBancoTarget({ tid: t.id, ti });
		openSheet("banco");
	}

	function handleCell(ti: number, ci: number) {
		setCellTarget({ tid: t.id, ti, ci });
		openSheet("celda");
	}

	const an = t.analisis;
	const statusOk =
		an?.okObj && an?.dentro5 && an?.rep.length === 0 && an?.cons === 0;

	return (
		<div
			className={`card ${statusOk ? "ok" : an ? "err" : ""} ${isOpen ? "open" : ""} plan-trab`}
		>
			<div className="trab-hdr" onClick={() => setIsOpen(!isOpen)}>
				<div className="t-badge">{t.id}</div>
				<div className="t-info">
					<div className="t-name">Trabajadera {t.id}</div>
					<div className="t-meta">
						{nActivos} act. · {t.tramos.length} tramos · Salen {F}
					</div>
				</div>
				{t.cuadrillaDoblada && (
					<span
						className="badge"
						style={{
							backgroundColor: "var(--cd-bg)",
							borderColor: "var(--cd-bd)",
							color: "var(--cd-tx)",
						}}
					>
						⚒ Cuadrilla Doblada
					</span>
				)}
				{/* Cuadrilla Doblada toggle — always visible in the header */}
				<button
					type="button"
					className="cd-toggle"
					aria-label="Alternar Cuadrilla Doblada"
					aria-pressed={t.cuadrillaDoblada}
					title={
						t.cuadrillaDoblada
							? "Desactivar Cuadrilla Doblada"
							: "Activar Cuadrilla Doblada (recomendado para 10+ costaleros)"
					}
					onClick={(e) => {
						e.stopPropagation();
						const res = toggleCuadrillaDoblada(t.id);
						if (res.pinsInvalidated) {
							setShowPinToast(true);
							setTimeout(() => setShowPinToast(false), 4000);
						}
						if (res.nuevo && !t.plan) {
							setShowEditor(true);
						} else {
							setShowEditor(false);
						}
					}}
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
				<div className="t-chev">▼</div>
			</div>

			<div className="trab-body">
				{/* Controles de Tramos y Salidas (Solo Mandos) */}
				{esMando && (
					<div className="mbox">
						<div className="mrow mb3">
							<span className="ml">Total tramos:</span>
							<div className="ctr">
								<button
									className="ctr-btn"
									onClick={() => delTramo(t.id, t.tramos.length - 1)}
									disabled={t.tramos.length <= 1}
								>
									−
								</button>
								<span className="ctr-val">{t.tramos.length}</span>
								<button className="ctr-btn" onClick={() => addTramo(t.id)}>
									+
								</button>
							</div>
							<button
								className="btn btn-ghost btn-sm ml-auto"
								onClick={() => {
									setBancoTarget({ tid: t.id, ti: -1 });
									openSheet("sugerencia");
								}}
							>
								Sugerir óptimo
							</button>
						</div>
						<div className="mrow">
							<span className="ml">Salidas obj:</span>
							<div className="ctr">
								<button
									className="ctr-btn"
									onClick={() => setSalidas(t.id, (t.salidas ?? 2) - 1)}
									disabled={(t.salidas ?? 2) <= 1}
								>
									−
								</button>
								<span className="ctr-val">{t.salidas ?? 2}</span>
								<button
									className="ctr-btn"
									onClick={() => setSalidas(t.id, (t.salidas ?? 2) + 1)}
								>
									+
								</button>
							</div>
						</div>
					</div>
				)}

				{/* El Plan Híbrido */}
				<div className="plan-head">
					<div className="plan-head-info">
						Relevos <br />
						{hasPins && (
							<span className="locked-count">
								({pinStatus.d} fijos D, {pinStatus.ls} sugeridos ★, {pinStatus.f} fijos F)
							</span>
						)}
					</div>
					<div className="plan-legend">
						<div className="leg-item">
							<div className="leg-dot D"></div> D
						</div>
						<div className="leg-item">
							<div className="leg-dot F"></div> F
						</div>
						<div className="leg-item">
							<div className="leg-dot LS"></div> ★ Sugerido
						</div>
						<div className="leg-item">
							<div className="leg-dot L"></div> Auto
						</div>
					</div>

					{/* Pin invalidation toast */}
					{showPinToast && (
						<div
							className="mt-3 p-2 rounded-md text-[0.7rem]"
							style={{
								backgroundColor: "var(--warn-bg)",
								border: "1px solid var(--warn-bd)",
								color: "var(--oro-c)",
							}}
							onClick={() => setShowPinToast(false)}
						>
							Se invalidaron los pines existentes
						</div>
					)}

					{/* Distribution Editor */}
					{t.cuadrillaDoblada &&
						t.distribucionCuadrillas &&
						!t.plan &&
						showEditor && (
						<DistributionEditor
							tid={t.id}
							nombres={t.nombres}
							distribucion={t.distribucionCuadrillas}
							onConfirm={() => setShowEditor(false)}
							onCancel={() => setShowEditor(false)}
						/>
					)}
				</div>

				{erroresPinned.length > 0 && (
					<div className="plan-err mb3">
						<strong>❌ Reglas de fijación rotas:</strong>
						<ul style={{ paddingLeft: "1.2rem", marginTop: ".3rem" }}>
							{erroresPinned.map((err: string, i: number) => (
								<li key={i}>{err}</li>
							))}
						</ul>
					</div>
				)}

				<div className="plan-scroll">
					<table className="plan-table">
						<thead>
							<tr>
								<th className="col-name">Costalero</th>
								{t.tramos.map((_, ti) => {
									const esClave = t.tramosClaves?.includes(ti);
									return (
										<th
											key={ti}
											className={`col-tramo ${ti === 0 ? "es-pri" : ""} ${ti === t.tramos.length - 1 ? "es-ult" : ""}`}
											style={
												esClave
													? {
															backgroundColor: "rgba(201,168,76,0.1)",
															borderTop: "2px solid var(--oro)",
														}
													: {}
											}
										>
											<div
												className="flex fc aic g2 cursor-pointer"
												onClick={() => openBanco(ti)}
											>
												<span className="flex aic g1">
													{esClave ? (
														<span
															className="flex aic jcc text-[10px]"
															style={{
																width: "16px",
																height: "16px",
																backgroundColor: "var(--oro)",
																color: "#000",
																borderRadius: "50%",
																boxShadow: "0 0 5px rgba(201,168,76,0.5)",
															}}
														>
															★
														</span>
													) : null}
													<span
														style={
															esClave
																? { color: "var(--oro)", fontWeight: "bold" }
																: {}
														}
														className="truncate max-w-[60px]"
														title={t.tramos[ti] || `T${ti + 1}`}
													>
														{t.tramos[ti] || `T${ti + 1}`}
													</span>
												</span>
												<span
													className="xs toro-o"
													style={{ textTransform: "none", fontWeight: 400 }}
												>
													✎
												</span>
											</div>
										</th>
									);
								})}
							</tr>
						</thead>
						<tbody>
							{t.nombres.map((name, ci) => {
								if (t.bajas?.includes(ci)) return null;

								// Si es costalero, solo ver su propia fila
								if (!esMando) {
									const nameStr = name.toLowerCase().trim();
									const isMatch =
										nameStr.includes(myName) ||
										myName.includes(nameStr) ||
										(myApodo && nameStr.includes(myApodo));
									if (!isMatch) return null;
								}

								return (
									<tr key={ci}>
										<td className="td-name">
											<div className="flex aic jb gap-1">
												<span className="truncate">
													{shortName(nameAt(t, ci))}
												</span>
												{an && an.conteo[ci] !== undefined && (
													<span
														className={`text-[0.65rem] cinzel px-1 rounded-sm whitespace-nowrap font-bold opacity-80 ${
															an.conteo[ci] === t.obj?.[ci]
																? "text-[var(--oro)]"
																: "text-err-tx"
														}`}
													>
														x{an.conteo[ci]}
													</span>
												)}
											</div>
										</td>
										{t.tramos.map((_, ti) => {
											const v = pinned?.[ti]?.[ci] ?? "L";
											const r = t.plan?.[ti];
											let isAutoD = false;
											let isAutoF = false;
											let hasWarn = false;
											let hasCons = false;

											// Preview visual: resaltar celdas afectadas por sugerencia hover
											const hoveredCorr =
												hoverSugerencia !== null
													? sugerencias.correcciones[hoverSugerencia]
													: null;
											const isHighlighted =
												hoveredCorr &&
												hoveredCorr.tramoOrigen >= 0 &&
												((ti === hoveredCorr.tramoOrigen &&
													(ci === hoveredCorr.costaleroA.idx ||
														ci === hoveredCorr.costaleroB.idx)) ||
													(ti === hoveredCorr.tramoDestino &&
														(ci === hoveredCorr.costaleroA.idx ||
															ci === hoveredCorr.costaleroB.idx)));

											if (r) {
												isAutoD = v === "L" && r.dentro.includes(ci);
												isAutoF =
													(v === "L" || v === "LF") && r.fuera.includes(ci);
												if (r.fuera.includes(ci)) {
													if (
														an?.rep.includes(ci) &&
														ti === t.tramos.length - 1
													)
														hasWarn = true;
													if (ti > 0 && t.plan?.[ti - 1]?.fuera.includes(ci))
														hasCons = true;
												}
											}

											const clsMap: Record<string, string> = {
												L: isAutoD ? "d" : isAutoF ? "f" : "L",
												D: "D",
												F: "F",
												LF: isAutoF ? "f" : "LF",
												LS: "LS", // Latent Sugerido — estilo especial
											};
											let cls = clsMap[v] ?? "L";
											if (hasWarn) cls += " warn-v";
											if (hasCons && !hasWarn) cls += " cons-v";
											if (isHighlighted) cls += " highlight-sug";

											// Boquilla: costaleros marcados con boquilla=true en el censo
											const esBoquilla = censusBoquilla[name] ?? false;
											if (esBoquilla) {
												if (v === "D" || (v === "L" && isAutoD) || v === "LS") cls += " boq-D";
												if (v === "F" || (v === "L" && isAutoF)) cls += " boq-F";
											}

											const lbl =
												v === "L"
													? isAutoD
														? "D"
														: isAutoF
															? "F"
															: "·"
													: v === "D"
														? "D"
														: v === "F"
															? "F"
															: v === "LS"
																? "★"
																: isAutoF
																	? "F"
																	: "⚡";

											return (
												<td key={ti}>
													<div
														className={`pcell ${cls}`}
														onClick={() => esMando && handleCell(ti, ci)}
													>
														{lbl}
													</div>
												</td>
											);
										})}
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>

				{/* Acciones (Solo Mandos) */}
				{esMando && (
					<div className="plan-actions flex gap-2">
						<button
							className="btn btn-oro f1"
							onClick={() =>
								hasPins ? completarPlan(t.id) : calcularTrab(t.id)
							}
							disabled={erroresPinned.length > 0}
							style={{ opacity: erroresPinned.length ? 0.5 : 1 }}
						>
							{hasPins ? "🪄 Completar" : "⚙ Calcular Auto"}
						</button>

						<button
							className="btn btn-out f1"
							style={{ borderColor: "var(--oro)", color: "var(--oro)" }}
							onClick={() => {
								setBancoTargetLocal({ tid: t.id, ti: -1 });
								openSheetLocal("sugerencia-asig");
							}}
							title="Sugerir asignación basada en puntuaciones y tramos clave"
						>
							💡 Sugerir Asig.
						</button>

						{t.plan && (
							<button
								className="btn btn-icon"
								style={{ border: "1px solid var(--border)", flexShrink: 0 }}
								onClick={() => limpiarPlan(t.id)}
								title="Limpiar plan actual"
							>
								🧹
							</button>
						)}

						{hasPins && (
							<button
								className="btn btn-icon"
								style={{
									border: "1px solid var(--err-bd)",
									color: "var(--err-tx)",
									flexShrink: 0,
								}}
								onClick={() => quitarBloqueos(t.id)}
								title="Quitar fijados"
							>
								×
							</button>
						)}
					</div>
				)}

				{/* Sugerencias de corrección */}
				{an && !statusOk && (
					<div className="mt-3 p-3 bg-[rgba(201,168,76,0.1)] border border-[var(--oro)] rounded-xl">
						<div className="text-[0.65rem] uppercase tracking-wider text-[var(--oro)] font-bold mb-2">
							Sugerencias de Corrección
						</div>
						{(() => {
							if (sugerencias.correcciones.length === 0) {
								return (
									<div className="text-[0.75rem] text-[var(--cre-o)]">
										No hay sugerencias automáticas disponibles. Edita
										manualmente en la vista Capataz.
									</div>
								);
							}
							return (
								<>
									{sugerencias.correcciones.map((corr, i) => (
										<div
											key={i}
											className="text-[0.7rem] mb-2 last:mb-0 flex items-center gap-2 cursor-pointer"
											onMouseEnter={() => setHoverSugerencia(i)}
											onMouseLeave={() => setHoverSugerencia(null)}
										>
											<span className="text-[var(--oro)] font-bold shrink-0">
												{corr.tipo === "saldo"
													? "📊"
													: corr.tipo === "repetido"
														? "🔄"
														: "↪"}
											</span>
											<span className="flex-1">
												<strong>{corr.costaleroA.nombre}</strong>{" "}
												{corr.costaleroA.problema} ↔{" "}
												<strong>{corr.costaleroB.nombre}</strong>{" "}
												{corr.costaleroB.solucion}
											</span>
											{corr.tramoOrigen >= 0 && corr.tramoDestino >= 0 && (
												<>
													<span className="text-[0.65rem] text-[var(--cre-o)]">
														T{corr.tramoOrigen + 1} ↔ T{corr.tramoDestino + 1}
													</span>
													<button
														className="btn btn-sm ml-1"
														style={{
															padding: "2px 6px",
															fontSize: "0.7rem",
															backgroundColor: "var(--oro)",
															color: "#000",
														}}
														onClick={() => {
															aplicarSugerencia(
																t.id,
																corr.tramoOrigen,
																corr.tramoDestino,
																corr.costaleroA.idx,
																corr.costaleroB.idx,
															);
														}}
														title={`Aplicar intercambio: ${corr.costaleroA.nombre} ↔ ${corr.costaleroB.nombre}`}
													>
														✓
													</button>
												</>
											)}
										</div>
									))}
									{/* Botón Confirmar asignación - aplica todas y fija */}
									{sugerencias.correcciones.length > 0 &&
										!t.cuadrillaDoblada && (
										<div className="mt-3 flex justify-end">
											<button
												className="btn btn-sm"
												style={{
													padding: "4px 14px",
													fontSize: "0.75rem",
													backgroundColor: "var(--oro)",
													color: "#000",
													fontWeight: 600,
												}}
												onClick={() => {
													setPreviewOpen(true);
													setBannerDismissed(false);
												}}
												title="Aplica todas las sugerencias y fija la asignación actual"
											>
												✅ Confirmar asignación
											</button>
										</div>
									)}
									{/* Banner feedback after Confirmar */}
									{bannerResult && (
										<ConfirmarAsignacionBanner
											result={bannerResult}
											onDismiss={() => setBannerDismissed(true)}
										/>
									)}
									{bannerResult && bannerResult.violations.length > 0 && (
										<ViolationsBanner violations={bannerResult.violations} />
									)}
									<PreviewCorreccionesSheet
										tid={t.id}
										open={previewOpen}
										onClose={() => setPreviewOpen(false)}
									/>
								</>
							);
						})()}
						{/* Correcciones skip banner for cuadrilla doblada */}
						{t.cuadrillaDoblada && t.plan && (
							<div
								className="mt-3 p-3 rounded-md text-[0.75rem]"
								style={{
									backgroundColor: "var(--warn-bg)",
									borderLeft: "3px solid var(--warn)",
									color: "var(--oro-c)",
								}}
							>
								En modo Cuadrilla Doblada las sugerencias de corrección están deshabilitadas.
							</div>
						)}
					</div>
				)}

				{/* Resultados */}
				{an && (
					<div className={`mt3 ${statusOk ? "plan-ok" : "plan-err"}`}>
						<div style={{ fontWeight: 700, marginBottom: ".3rem" }}>
							{statusOk ? "✓ Plan Correcto" : "⚠ Hay problemas en el plan"}
						</div>
						{!an.okObj && <div>• Desequilibrio en las salidas.</div>}
						{!an.dentro5 && (
							<div>• Algún tramo no tiene 5 costaleros dentro.</div>
						)}
						{an.rep.length > 0 && (
							<div>
								• {an.rep.length} costalero(s) repiten primero y último.
							</div>
						)}
						{an.cons > 0 && <div>• Hay salidas consecutivas.</div>}
					</div>
				)}

				{/* Botón generar relevos - solo visible cuando el plan está correcto */}
				{an && statusOk && (
					<div className="mt-4">
						<button
							className="btn btn-sm"
							style={{
								padding: "6px 12px",
								fontSize: "0.8rem",
								backgroundColor: "var(--verde)",
								color: "#000",
							}}
							onClick={() => openSheet("relevos")}
							title="Generar y descargar relevos en PDF"
						>
							📄 Generar relevos
						</button>
					</div>
				)}
			</div>
		</div>
	);
});
