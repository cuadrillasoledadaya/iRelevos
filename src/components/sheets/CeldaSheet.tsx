"use client";

import { uiStore, projectStore, planStore } from "@/stores";
import { nameAt } from "@/lib/nombres";
import { getPinned } from "@/lib/algoritmos";
import type { PinState, Trabajadera } from "@/lib/types";

const OPCIONES: { v: PinState; icon: string; label: string; desc: string }[] = [
	{
		v: "L",
		icon: "🔓",
		label: "Libre",
		desc: "El algoritmo decide libremente",
	},
	{ v: "D", icon: "✅", label: "Dentro", desc: "Siempre dentro en este tramo" },
	{ v: "F", icon: "❌", label: "Fuera", desc: "Siempre fuera en este tramo" },
	{
		v: "LF",
		icon: "⚡",
		label: "Pref. Fuera",
		desc: "Prefiere salir, pero flexible",
	},
];

export default function CeldaSheet() {
	const S = projectStore((s) => s.S);
	const activeSheet = uiStore((s) => s.activeSheet);
	const closeSheet = uiStore.getState().closeSheet;
	const cellTarget = uiStore((s) => s.cellTarget);
	const setCellTarget = uiStore.getState().setCellTarget;
	const setPinned = planStore.getState().setPinned;
	const isOpen = activeSheet === "celda";

	if (!cellTarget)
		return (
			<>
				<div className={`bso${isOpen ? " open" : ""}`} onClick={closeSheet} />
				<div className={`bss${isOpen ? " open" : ""}`} />
			</>
		);

	const { tid, ti, ci } = cellTarget;
	const t = S.trabajaderas.find((x: Trabajadera) => x.id === tid)!;
	const p = getPinned(t);
	const actual = p[ti]?.[ci] ?? "L";
	const nombre = nameAt(t, ci);
	const tramoNombre = t.tramos[ti] ?? `Tramo ${ti + 1}`;

	function seleccionar(v: PinState) {
		setPinned(tid, ti, ci, v);
		setCellTarget(null);
		closeSheet();
	}

	return (
		<>
			<div className={`bso${isOpen ? " open" : ""}`} onClick={closeSheet} />
			<div className={`bss${isOpen ? " open" : ""}`}>
				<div className="bs-handle" />
				<div className="bs-hdr">
					<span className="bs-title">🔒 Fijar celda</span>
					<button className="btn btn-ghost btn-sm" onClick={closeSheet}>
						✕
					</button>
				</div>
				<div className="cell-sheet-header">
					<div className="cell-sheet-who">{nombre}</div>
					<div className="cell-sheet-tramo">
						T{tid} · {tramoNombre}
					</div>
				</div>
				<div className="bs-body">
					{OPCIONES.map((op: (typeof OPCIONES)[number]) => (
						<div
							key={op.v}
							className={`cell-opt${actual === op.v ? " active-opt" : ""}`}
							onClick={() => seleccionar(op.v)}
						>
							<div className={`cell-opt-icon ${op.v}`}>{op.icon}</div>
							<div className="cell-opt-info">
								<div className="cell-opt-title">{op.label}</div>
								<div className="cell-opt-desc">{op.desc}</div>
							</div>
							{actual === op.v && (
								<span style={{ color: "var(--oro)", fontSize: ".8rem" }}>
									✓
								</span>
							)}
						</div>
					))}
				</div>
			</div>
		</>
	);
}
