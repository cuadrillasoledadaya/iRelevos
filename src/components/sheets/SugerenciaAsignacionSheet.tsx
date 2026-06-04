"use client";

import { useMemo } from "react";
import { uiStore, projectStore, trabajaderaStore } from "@/stores";
import type { Trabajadera } from "@/lib/types";
import type { SugerenciaRes } from "@/lib/algoritmos";

export default function SugerenciaAsignacionSheet() {
	const activeSheet = uiStore((s) => s.activeSheet);
	const closeSheet = uiStore.getState().closeSheet;
	const S = projectStore((s) => s.S);
	const previsualizar = trabajaderaStore.getState().previsualizarSugerencia;
	const confirmar = trabajaderaStore.getState().confirmarSugerencia;
	const setBancoTarget = uiStore.getState().setBancoTarget;

	const isOpen = activeSheet === "sugerencia-asig";
	const bancoTarget = uiStore((s) => s.bancoTarget);
	const tid = bancoTarget?.tid;

	const t = useMemo(
		() => (tid !== undefined ? S.trabajaderas.find((x: Trabajadera) => x.id === tid) : undefined),
		[S, tid],
	);

	const res: SugerenciaRes | null = useMemo(
		() => (t ? previsualizar(t.id) : null),
		[t, previsualizar],
	);

	if (!isOpen) {
		return (
			<>
				<div className="bso" />
				<div className="bss" />
			</>
		);
	}

	function handleClose() {
		setBancoTarget(null);
		closeSheet();
	}

	function handleAplicar() {
		if (!t) return;
		const ok = confirmar(t.id);
		if (ok) handleClose();
	}

	if (!t || !res) {
		return (
			<>
				<div className="bso open" onClick={handleClose} />
				<div className="bss open">
					<div className="bs-handle" />
					<div className="bs-hdr">
						<span className="bs-title">💡 Sugerir Asignación</span>
						<button className="btn btn-ghost btn-sm" onClick={handleClose}>
							✕
						</button>
					</div>
					<div className="bs-body">
						<div className="alert warn">
							No se pudo cargar la trabajadera.
						</div>
					</div>
				</div>
			</>
		);
	}

	const sinPuntuaciones = res.preview.length === 0;
	const tramosLabel = res.tramosObjetivo
		.map((ti) => (t.tramos[ti] || `T${ti + 1}`) + (ti === res.ultimoIdx ? " (último)" : " ★"))
		.join(" · ");

	return (
		<>
			<div className="bso open" onClick={handleClose} />
			<div className="bss open">
				<div className="bs-handle" />
				<div className="bs-hdr">
					<span className="bs-title">💡 Sugerir Asignación</span>
					<button className="btn btn-ghost btn-sm" onClick={handleClose}>
						✕
					</button>
				</div>

				<div className="bs-body">
					<div className="sug-info">
						T{t.id} · {res.preview.length} costalero{res.preview.length === 1 ? "" : "s"} sugerido{res.preview.length === 1 ? "" : "s"}
					</div>

					{res.warnings.length > 0 && (
						<div className="alert warn" style={{ marginBottom: "0.75rem" }}>
							{res.warnings.map((w, i) => (
								<div key={i}>⚠ {w}</div>
							))}
						</div>
					)}

					{sinPuntuaciones ? (
						<div className="alert warn">
							<div style={{ marginBottom: "0.5rem" }}>
								No hay ningún costalero con puntuación asignada. Asigná
								puntuaciones en la página <strong>Equipo</strong> para que el
								sistema pueda sugerir una asignación.
							</div>
						</div>
					) : (
						<>
							<div className="text-[0.65rem] uppercase tracking-wider text-[var(--cre-o)] font-bold mb-1">
								Tramos objetivo
							</div>
							<div className="text-[0.8rem] mb-3" style={{ color: "var(--cre)" }}>
								{tramosLabel || "—"}
							</div>

							<div className="text-[0.65rem] uppercase tracking-wider text-[var(--cre-o)] font-bold mb-2">
								Asignación propuesta
							</div>
							<div className="flex flex-col gap-2">
								{res.preview.map((a) => (
									<div
										key={a.ci}
										className="rounded-lg p-2 border"
										style={{
											backgroundColor: "var(--card)",
											borderColor: "var(--border)",
										}}
									>
										<div className="flex items-center justify-between mb-1">
											<span className="font-bold text-[0.9rem]">
												{a.nombre}
											</span>
											<span
												className="text-[0.7rem] font-bold"
												style={{ color: "var(--oro)" }}
											>
												★ {a.puntuacion}
											</span>
										</div>
										<div className="flex flex-wrap gap-1">
											{a.tramosAplicar.map((ti) => (
												<span
													key={ti}
													className="text-[0.65rem] px-2 py-0.5 rounded font-bold"
													style={{
														backgroundColor: "var(--oro)",
														color: "#000",
													}}
												>
													→ D en {t.tramos[ti] || `T${ti + 1}`}
												</span>
											))}
											{a.tramosRespetados.map((ti) => {
												const v = t.pinned?.[ti]?.[a.ci];
												return (
													<span
														key={`r-${ti}`}
														className="text-[0.65rem] px-2 py-0.5 rounded font-bold"
														style={{
															backgroundColor: "var(--bg)",
															color: "var(--cre-o)",
															border: "1px solid var(--border)",
														}}
														title="Pin manual preexistente — se respeta"
													>
														{v} en {t.tramos[ti] || `T${ti + 1}`} 🔒
													</span>
												);
											})}
										</div>
									</div>
								))}
							</div>
						</>
					)}
				</div>

				{!sinPuntuaciones && (
					<div className="bs-ftr" style={{ display: "flex", gap: "0.5rem" }}>
						<button className="btn btn-out f1" onClick={handleClose}>
							Cancelar
						</button>
						<button
							className="btn btn-oro f1"
							onClick={handleAplicar}
							title="Aplicar pins y calcular plan completo"
						>
							✓ Aplicar y calcular
						</button>
					</div>
				)}
			</div>
		</>
	);
}
