"use client";

import { useMemo, useState } from "react";
import { projectStore, planStore } from "@/stores";
import type { BulkCorreccionesPreview } from "@/lib/algoritmos";
import type { Trabajadera } from "@/lib/types";

type State =
	| "loading"
	| "preview-with-corrections"
	| "preview-empty"
	| "applying"
	| "error";

interface Props {
	tid: number;
	open: boolean;
	onClose: () => void;
}

export default function PreviewCorreccionesSheet({
	tid,
	open,
	onClose,
}: Props) {
	const S = projectStore((s) => s.S);
	const previsualizar = planStore.getState().previsualizarCorreccionesBulk;
	const confirmar = planStore.getState().confirmarCorreccionesBulk;

	const t: Trabajadera | undefined = useMemo(
		() => S.trabajaderas.find((x: Trabajadera) => x.id === tid),
		[S.trabajaderas, tid],
	);

	const preview = useMemo<BulkCorreccionesPreview | null>(
		() => (t ? previsualizar(t.id) : null),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[t?.id, t?.plan, t?.analisis, open, previsualizar, t],
	);

	const [applying, setApplying] = useState(false);

	const state: State = !t
		? "error"
		: applying
			? "applying"
			: preview === null
				? "preview-empty"
				: preview.correcciones.length === 0
					? "preview-empty"
					: "preview-with-corrections";

	function handleClose() {
		setApplying(false);
		onClose();
	}

	function handleAplicar() {
		if (!t || state !== "preview-with-corrections") return;
		setApplying(true);
		confirmar(t.id);
		handleClose();
	}

	if (!open) {
		return (
			<>
				<div className="bso" />
				<div className="bss" />
			</>
		);
	}

	return (
		<>
			<div className="bso open" onClick={handleClose} />
			<div className="bss open">
				<div className="bs-handle" />
				<div className="bs-hdr">
					<span className="bs-title">👁 Vista previa de correcciones</span>
					<button className="btn btn-ghost btn-sm" onClick={handleClose}>
						✕
					</button>
				</div>

				<div className="bs-body">
					{state === "preview-empty" && (
						<div className="alert warn" data-testid="preview-empty">
							No hay correcciones para aplicar — el plan está al día
						</div>
					)}

					{state === "preview-with-corrections" && preview && (
						<>
							<div className="sug-info" data-testid="preview-summary">
								{preview.correcciones.length} corrección(es) ·{" "}
								{Object.entries(preview.summary)
									.map(([k, v]) => `${k}: ${v}`)
									.join(" · ")}
							</div>
							<div className="flex flex-col gap-2 mt-2">
								{preview.correcciones.map((c, i) => (
									<div
										key={i}
										className="preview-row"
										data-testid="preview-row"
									>
										<span className="preview-bar" />
										<div className="flex flex-col">
											<span className="font-bold">
												{c.costaleroA.nombre} ↔ {c.costaleroB.nombre}
											</span>
											<span className="text-[0.7rem] tcre-o">
												T{c.tramoOrigen + 1} → T{c.tramoDestino + 1}
												{" · "}
												{c.impacto}
											</span>
										</div>
									</div>
								))}
							</div>
						</>
					)}

					{state === "error" && (
						<div className="alert warn">
							No se pudo cargar la trabajadera.
						</div>
					)}
				</div>

				{/* Footer is conditional on state (REQ-CORR-V3-6 + D8) */}
				{state === "preview-empty" ? (
					<div className="bs-ftr" style={{ display: "flex", gap: "0.5rem" }}>
						<button
							className="btn btn-oro f1"
							onClick={handleClose}
							data-testid="preview-cerrar"
						>
							Cerrar
						</button>
					</div>
				) : state === "preview-with-corrections" ? (
					<div className="bs-ftr" style={{ display: "flex", gap: "0.5rem" }}>
						<button
							className="btn btn-out f1"
							onClick={handleClose}
							data-testid="preview-cancelar"
						>
							Cancelar
						</button>
						<button
							className="btn btn-oro f1"
							onClick={handleAplicar}
							data-testid="preview-aplicar"
						>
							✓ Aplicar
						</button>
					</div>
				) : null}
			</div>
		</>
	);
}
