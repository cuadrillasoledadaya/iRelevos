"use client";

import { useMemo, useState } from "react";
import type { DatosPerfil, TramoSlot } from "@/lib/types";
import { mutar } from "@/stores";

// ── Types ─────────────────────────────────────────────────────────

/** A single boquilla conflict: same costalero in D and F for one tramo. */
export interface BoquillaConflict {
	trabajaderaId: number;
	trabajaderaName: string;
	ti: number;
	tramoName: string;
	nombreIdx: number;
	nombre: string;
	posDentro: number; // position index within dentro array
	posFuera: number;  // position index within fuera array
}

export type ConflictAction = "keep_dentro" | "keep_fuera" | "remove_both";

export interface ConflictResolution {
	trabajaderaId: number;
	ti: number;
	nombreIdx: number;
	action: ConflictAction;
}

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Scan all trabajaderas and find every (tid, ti, nombreIdx) where
 * the same costalero appears in BOTH plan[ti].dentro and plan[ti].fuera.
 */
export function computeConflicts(content: DatosPerfil): BoquillaConflict[] {
	const result: BoquillaConflict[] = [];

	for (const t of content.trabajaderas) {
		if (!t.plan) continue;
		for (let ti = 0; ti < t.tramos.length; ti++) {
			const slot = t.plan[ti];
			if (!slot) continue;
			const dentroSet = new Set(slot.dentro);
			for (let fi = 0; fi < slot.fuera.length; fi++) {
				const fIdx = slot.fuera[fi];
				if (dentroSet.has(fIdx)) {
					const di = slot.dentro.indexOf(fIdx);
					result.push({
						trabajaderaId: t.id,
						trabajaderaName: `Trabajadera ${t.id}`,
						ti,
						tramoName: t.tramos[ti] || `T${ti + 1}`,
						nombreIdx: fIdx,
						nombre: t.nombres[fIdx] || `Costalero ${fIdx + 1}`,
						posDentro: di,
						posFuera: fi,
					});
				}
			}
		}
	}

	return result;
}

/**
 * Apply a single conflict resolution to a TramoSlot in-place.
 */
export function applyResolution(
	slot: TramoSlot,
	nombreIdx: number,
	action: ConflictAction,
): void {
	switch (action) {
		case "keep_dentro":
			slot.fuera = slot.fuera.filter((i) => i !== nombreIdx);
			break;
		case "keep_fuera":
			slot.dentro = slot.dentro.filter((i) => i !== nombreIdx);
			break;
		case "remove_both":
			slot.dentro = slot.dentro.filter((i) => i !== nombreIdx);
			slot.fuera = slot.fuera.filter((i) => i !== nombreIdx);
			break;
	}
}

// ── Component ─────────────────────────────────────────────────────

interface ConflictResolverSheetProps {
	open: boolean;
	onClose: () => void;
	content: DatosPerfil;
}

export default function ConflictResolverSheet({
	open,
	onClose,
	content,
}: ConflictResolverSheetProps) {
	const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

	const conflicts = useMemo(() => {
		const all = computeConflicts(content);
		// Filter out already-resolved conflicts
		return all.filter(
			(c) => !resolvedIds.has(`${c.trabajaderaId}-${c.ti}-${c.nombreIdx}`),
		);
	}, [content, resolvedIds]);

	function handleResolve(conflict: BoquillaConflict, action: ConflictAction) {
		const key = `${conflict.trabajaderaId}-${conflict.ti}-${conflict.nombreIdx}`;

		mutar((draft) => {
			const t = draft.trabajaderas.find(
				(x) => x.id === conflict.trabajaderaId,
			);
			if (!t || !t.plan || !t.plan[conflict.ti]) return;
			applyResolution(t.plan[conflict.ti], conflict.nombreIdx, action);
		});

		setResolvedIds((prev) => {
			const next = new Set(prev);
			next.add(key);
			return next;
		});

		// If all conflicts are resolved, close the sheet
		if (conflicts.length <= 1) {
			onClose();
			setResolvedIds(new Set());
		}
	}

	function handleResolveAll(action: ConflictAction) {
		mutar((draft) => {
			for (const c of conflicts) {
				const t = draft.trabajaderas.find((x) => x.id === c.trabajaderaId);
				if (!t || !t.plan || !t.plan[c.ti]) continue;
				applyResolution(t.plan[c.ti], c.nombreIdx, action);
			}
		});

		setResolvedIds(new Set());
		onClose();
	}

	if (!open) return null;

	return (
		<>
			<div className="bso open" onClick={onClose} />
			<div className="bss open" style={{ maxHeight: "85vh" }}>
				<div className="bs-handle" />
				<div className="bs-hdr">
					<div>
						<span className="bs-title">Resolver Conflictos de Boquilla</span>
						{conflicts.length > 0 && (
							<div className="text-[0.6rem] text-[var(--cre-o)] mt-0.5">
								{conflicts.length} conflicto{conflicts.length !== 1 ? "s" : ""} pendiente{conflicts.length !== 1 ? "s" : ""}
							</div>
						)}
					</div>
					<button className="btn btn-ghost btn-sm" onClick={onClose}>
						✕
					</button>
				</div>

				<div className="bs-body" style={{ maxHeight: "65vh", overflowY: "auto" }}>
					{conflicts.length === 0 ? (
						<div className="p-6 text-center">
							<div className="text-2xl mb-2">✅</div>
							<div className="text-[var(--cre)] font-bold">
								No hay conflictos
							</div>
							<div className="text-[0.65rem] text-[var(--cre-o)] mt-1">
								Todos los boquilleros están asignados correctamente.
							</div>
						</div>
					) : (
						<div className="flex flex-col gap-2 p-4">
							{/* Bulk actions */}
							<div className="flex gap-2 mb-2">
								<button
									className="btn btn-sm f1"
									style={{
										backgroundColor: "var(--ok-bg)",
										borderColor: "var(--ok-bd)",
										color: "var(--ok-tx)",
									}}
									onClick={() => handleResolveAll("keep_dentro")}
									title="Mantener todos en DENTRO"
								>
									✓ Todos D
								</button>
								<button
									className="btn btn-sm f1"
									style={{
										backgroundColor: "var(--warn-bg)",
										borderColor: "var(--warn-bd)",
										color: "var(--warn-oro)",
									}}
									onClick={() => handleResolveAll("keep_fuera")}
									title="Mantener todos en FUERA"
								>
									✓ Todos F
								</button>
								<button
									className="btn btn-sm f1"
									style={{
										backgroundColor: "var(--err-bg)",
										borderColor: "var(--err-bd)",
										color: "var(--err-tx)",
									}}
									onClick={() => handleResolveAll("remove_both")}
									title="Quitar todos de ambos"
								>
									✕ Quitar todos
								</button>
							</div>

							{conflicts.map((c, i) => (
								<div
									key={i}
									className="rounded-lg border border-[var(--err-bd)]/30 bg-[var(--err-bg)]/20 p-3"
								>
									<div className="flex items-start gap-2 mb-2">
										<span className="text-lg">👤</span>
										<div className="flex-1 min-w-0">
											<div className="font-bold text-[var(--cre)] text-sm truncate">
												{c.nombre}
											</div>
											<div className="text-[0.6rem] text-[var(--cre-o)]">
												{c.trabajaderaName} · {c.tramoName}
											</div>
										</div>
									</div>

									<div className="text-[0.65rem] text-[var(--err-tx)] mb-2 font-bold">
										En D (posición {c.posDentro + 1}) y F (posición {c.posFuera + 1}) — imposible
									</div>

									<div className="flex gap-1.5">
										<button
											className="btn btn-sm f1"
											style={{
												backgroundColor: "var(--ok-bg)",
												borderColor: "var(--ok-bd)",
												color: "var(--ok-tx)",
											}}
											onClick={() => handleResolve(c, "keep_dentro")}
											title={`Mantener a ${c.nombre} en DENTRO, quitar de FUERA`}
										>
											Mantener D
										</button>
										<button
											className="btn btn-sm f1"
											style={{
												backgroundColor: "var(--warn-bg)",
												borderColor: "var(--warn-bd)",
												color: "var(--warn-oro)",
											}}
											onClick={() => handleResolve(c, "keep_fuera")}
											title={`Mantener a ${c.nombre} en FUERA, quitar de DENTRO`}
										>
											Mantener F
										</button>
										<button
											className="btn btn-sm f1"
											style={{
												backgroundColor: "var(--err-bg)",
												borderColor: "var(--err-bd)",
												color: "var(--err-tx)",
											}}
											onClick={() => handleResolve(c, "remove_both")}
											title={`Quitar a ${c.nombre} de ambos`}
										>
											Quitar ambos
										</button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</>
	);
}
