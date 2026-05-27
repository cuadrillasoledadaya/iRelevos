"use client";

import { useMemo, memo } from "react";
import { uiStore, projectStore, trabajaderaStore } from "@/stores";
import type { ActiveSheet } from "@/lib/types";
import { rolesDisponibles, getRol } from "@/lib/roles";
import type { Trabajadera } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";

const getRolColor = (rol: string) => {
	const base = rol.includes("_") ? rol.split("_")[0] : rol;
	if (base === "PAT" || base === "COS") return "rgba(184, 151, 62, 0.25)"; // Oro suave
	if (base === "FIJ") return "rgba(34, 197, 94, 0.25)"; // Verde suave
	if (base === "COR") return "rgba(107, 114, 128, 0.25)"; // Gris suave
	return "transparent";
};

export default function EquipoPage() {
	const S = projectStore((s) => s.S);
	const censusHeights = projectStore((s) => s.censusHeights);
	const openEqs = uiStore((s) => s.openEqs);
	const toggleEq = uiStore.getState().toggleEq;
	const openSheet = uiStore.getState().openSheet;
	const setCensusTarget = uiStore.getState().setCensusTarget;
	const addTrab = trabajaderaStore.getState().addTrab;
	const setNombre = trabajaderaStore.getState().setNombre;
	const delCost = trabajaderaStore.getState().delCost;
	const addCost = trabajaderaStore.getState().addCost;
	const toggleBaja = trabajaderaStore.getState().toggleBaja;
	const setRolPri = trabajaderaStore.getState().setRolPri;
	const setRolSec = trabajaderaStore.getState().setRolSec;
	const toggleRegla5 = trabajaderaStore.getState().toggleRegla5;
	const setPuntuacion = trabajaderaStore.getState().setPuntuacion;
	const addCostUltimo = trabajaderaStore.getState().addCostUltimo;
	const { profile } = useAuth();
	const esMando =
		profile?.role === "superadmin" ||
		profile?.role === "capataz" ||
		profile?.role === "auxiliar";

	const handlers = useMemo(
		() => ({
			setNombre,
			delCost,
			addCost,
			toggleBaja,
			setRolPri,
			setRolSec,
			toggleRegla5,
			setPuntuacion,
			addCostUltimo,
			setCensusTarget,
			openSheet,
		}),
		[
			setNombre,
			delCost,
			addCost,
			toggleBaja,
			setRolPri,
			setRolSec,
			toggleRegla5,
			setPuntuacion,
			addCostUltimo,
			setCensusTarget,
			openSheet,
		],
	);

	return (
		<>
			<div className="sec">Gestión de Equipo</div>

			{S.trabajaderas.map((t: Trabajadera) => (
				<TrabajaderaCard
					key={t.id}
					t={t}
					isOpen={openEqs.has(t.id)}
					onToggle={() => toggleEq(t.id)}
					handlers={handlers}
					esMando={esMando}
					censusHeights={censusHeights}
				/>
			))}

			{esMando && (
				<button className="btn btn-out w100 mt4" onClick={addTrab}>
					+ Añadir Trabajadera (Extra)
				</button>
			)}
		</>
	);
}

const TrabajaderaCard = memo(function TrabajaderaCard({
	t,
	isOpen,
	onToggle,
	handlers,
	esMando,
	censusHeights,
}: {
	t: Trabajadera;
	isOpen: boolean;
	onToggle: () => void;
	handlers: {
		setNombre: (tid: number, i: number, v: string) => void;
		delCost: (tid: number, i: number) => void;
		addCost: (tid: number) => void;
		toggleBaja: (tid: number, i: number) => boolean;
		setRolPri: (tid: number, i: number, r: string) => void;
		setRolSec: (tid: number, i: number, r: string) => void;
		toggleRegla5: (tid: number) => void;
		setPuntuacion: (tid: number, n: string, p: number) => void;
		addCostUltimo: (tid: number, n: string, rs: string[]) => void;
		setCensusTarget: (target: { tid: number; ci: number } | null) => void;
		openSheet: (s: ActiveSheet) => void;
	};
	esMando: boolean;
	censusHeights: Record<string, number>;
}) {
	const isBaja = (i: number) => t.bajas?.includes(i);
	const total = t.nombres.length;
	const nBajas = t.bajas?.length ?? 0;
	const disp = rolesDisponibles(t.id);

	// 📐 Solo semáforo de nivelación en el badge (análisis completo en Carga)
	const alturas = t.nombres
		.map((n: string, idx: number) =>
			isBaja(idx) ? null : censusHeights[n.trim()] || null,
		)
		.filter((h: number | null) => h !== null) as number[];

	const maxDiff =
		alturas.length > 1 ? Math.max(...alturas) - Math.min(...alturas) : 0;

	let statusColor = "transparent";
	let statusText = "";
	if (alturas.length > 1) {
		if (maxDiff <= 1.5) {
			statusColor = "#22c55e";
			statusText = "Nivelación Óptima";
		} else if (maxDiff <= 2.5) {
			statusColor = "#eab308";
			statusText = "Nivelación Aceptable";
		} else {
			statusColor = "#ef4444";
			statusText = "Desviación Crítica";
		}
	}

	return (
		<div className={`card ${isOpen ? "open" : ""}`}>
			<div className="trab-hdr" onClick={onToggle}>
				<div className="t-badge" style={{ position: "relative" }}>
					{t.id}
					{alturas.length > 1 && (
						<div
							style={{
								position: "absolute",
								top: "-2px",
								right: "-2px",
								width: "10px",
								height: "10px",
								borderRadius: "50%",
								backgroundColor: statusColor,
								border: "2px solid var(--card)",
								boxShadow: `0 0 8px ${statusColor}`,
							}}
							title={`${statusText} (Dif: ${maxDiff.toFixed(1)}cm)`}
						/>
					)}
				</div>
				<div className="t-info">
					<div className="t-name">Trabajadera {t.id}</div>
					<div className="t-meta">
						{total} inscritos {nBajas > 0 ? `· ${nBajas} baja(s)` : ""}
					</div>
				</div>
				<div className="t-chev">▼</div>
			</div>

			<div className="trab-body">
				{esMando && total === 5 && (
					<div
						className="mb3 flex aic g2 border p2 rounded"
						style={{
							borderColor: "rgba(201,168,76,.3)",
							borderStyle: "solid",
							borderWidth: "1px",
						}}
					>
						<input
							type="checkbox"
							checked={t.regla5costaleros}
							onChange={() => handlers.toggleRegla5(t.id)}
							id={`r5-${t.id}`}
						/>
						<label htmlFor={`r5-${t.id}`} className="sm tcre-o cursor-pointer">
							Tienen 5 costaleros (trabajan 4, descansa 1 por tramo)
						</label>
					</div>
				)}

				<div className="fc g2">
					{t.nombres.map((nombre: string, i: number) => {
						const baja = isBaja(i);
						const r = getRol(t, i);
						return (
							<div key={i} className={`cost-row ${baja ? "baja" : ""}`}>
								<div className="cost-n">{i + 1}</div>
								{esMando ? (
									<div className="f1 flex aic g2">
										<input
											className="inp f1"
											value={nombre}
											onChange={(e) =>
												handlers.setNombre(t.id, i, e.target.value)
											}
											placeholder={`Costalero ${i + 1}`}
										/>
										<button
											className="btn btn-ghost btn-sm btn-icon"
											onClick={() => {
												handlers.setCensusTarget({ tid: t.id, ci: i });
												handlers.openSheet("censo");
											}}
											title="Seleccionar del censo"
										>
											📋
										</button>
									</div>
								) : (
									<div className="f1 flex aic px2 text-[var(--cre)] font-bold">
										{nombre}
									</div>
								)}

								{/* Puntuación (Mando) */}
								{esMando && (
									<button
										className="btn btn-ghost btn-sm btn-icon"
										style={{
											minWidth: "42px",
											color:
												(t.puntuaciones?.[nombre] || 0) > 0
													? "var(--oro)"
													: "var(--cre-o)",
										}}
										onClick={() => {
											const actual = t.puntuaciones?.[nombre] || 0;
											const val = prompt(
												`Valoración para ${nombre} (0-10):`,
												actual.toString(),
											);
											if (val !== null) {
												const num = parseFloat(val);
												if (!isNaN(num))
													handlers.setPuntuacion(t.id, nombre, num);
											}
										}}
									>
										<span className="text-[0.65rem] font-bold mr-1">
											{t.puntuaciones?.[nombre] || 0}
										</span>
										🏆
									</button>
								)}

								{/* Roles (Mando, solo si no es baja) */}
								{esMando && !baja && (
									<div className="fc g2" style={{ flexShrink: 0 }}>
										<div className="flex g2">
											<select
												className="inp sm font-bold"
												style={{
													height: "32px",
													width: "80px",
													padding: "0 8px",
													backgroundColor: getRolColor(r.pri),
													color: "#1a1a1a",
												}}
												value={r.pri}
												onChange={(e) =>
													handlers.setRolPri(t.id, i, e.target.value)
												}
											>
												{disp.map((rol) => (
													<option
														key={rol}
														value={rol}
														style={{
															backgroundColor: "white",
															color: "#1a1a1a",
														}}
													>
														{rol} (P)
													</option>
												))}
											</select>
											<select
												className="inp sm font-bold"
												style={{
													height: "32px",
													width: "80px",
													padding: "0 8px",
													backgroundColor: getRolColor(r.sec),
													color: "#1a1a1a",
												}}
												value={r.sec}
												onChange={(e) =>
													handlers.setRolSec(t.id, i, e.target.value)
												}
											>
												{disp.map((rol) => (
													<option
														key={rol}
														value={rol}
														style={{
															backgroundColor: "white",
															color: "#1a1a1a",
														}}
													>
														{rol} (S)
													</option>
												))}
											</select>
										</div>
									</div>
								)}

								{/* Solo ver rol para costalero */}
								{!esMando && !baja && (
									<div className="flex g1 text-[0.6rem] font-black uppercase">
										<span
											className="px-1.5 py-0.5 rounded"
											style={{
												backgroundColor: getRolColor(r.pri),
												color: "var(--oro)",
											}}
										>
											{r.pri}
										</span>
										<span className="flex items-center opacity-30">·</span>
										<span
											className="px-1.5 py-0.5 rounded"
											style={{
												backgroundColor: getRolColor(r.sec),
												color: "var(--oro)",
											}}
										>
											{r.sec}
										</span>
									</div>
								)}

								{esMando && (
									<>
										<button
											className={`btn-baja ${baja ? "activa" : ""}`}
											onClick={() => handlers.toggleBaja(t.id, i)}
											title={baja ? "Quitar baja" : "Dar de baja"}
										>
											🚑
										</button>
										<button
											className="btn-baja"
											style={{
												color: "var(--err-tx)",
												borderColor: "var(--err-bd)",
											}}
											onClick={() =>
												confirm("¿Eliminar costalero?") &&
												handlers.delCost(t.id, i)
											}
											title="Eliminar"
										>
											✕
										</button>
									</>
								)}
							</div>
						);
					})}
				</div>

				{esMando && (
					<div className="flex gap-2 mt3">
						<button
							className="btn btn-ghost flex-1"
							onClick={() => handlers.addCost(t.id)}
						>
							+ Añadir Costalero
						</button>
						{t.plan && (
							<button
								className="btn btn-out flex-1"
								style={{ color: "var(--oro)", borderColor: "var(--oro)" }}
								onClick={() => {
									const nombre = prompt(
										"Nombre del costalero de ÚLTIMO MOMENTO:",
									);
									if (!nombre) return;
									const roles = prompt(
										"Roles (ej: PAT FIJ o COS FIJ):",
										t.id === 1 || t.id === 7 ? "PAT FIJ" : "COS FIJ",
									);
									if (!roles) return;
									handlers.addCostUltimo(t.id, nombre, roles.split(" "));
								}}
							>
								⚡ Último Momento
							</button>
						)}
					</div>
				)}
			</div>
		</div>
	);
});
