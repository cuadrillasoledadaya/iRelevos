"use client";

import { memo, useMemo, useState } from "react";
import { uiStore, projectStore, planStore } from "@/stores";
import { getPinned } from "@/lib/algoritmos";
import { shortName } from "@/lib/nombres";
import type { Trabajadera } from "@/lib/types";

/**
 * BoquillaView — "trabajadera virtual" que muestra solo los costaleros
 * marcados como boquilla en el censo, agrupados para detectar
 * coincidencias de "dentro" entre ellos.
 */
const BoquillaView = memo(function BoquillaView({
	trabajaderas,
	censusBoquilla,
}: {
	trabajaderas: Trabajadera[];
	censusBoquilla: Record<string, boolean>;
}) {
	const S = projectStore((s) => s.S);
	const openSheet = uiStore.getState().openSheet;
	const setCellTarget = uiStore.getState().setCellTarget;
	const calcularTodo = planStore.getState().calcularTodo;

	// Recopilar todos los boquilleros de todas las trabajaderas
	type Boquillero = {
		name: string;
		tid: number;
		ci: number;
	};

	const boquilleros = useMemo(() => {
		const result: Boquillero[] = [];
		for (const t of trabajaderas) {
			for (let ci = 0; ci < t.nombres.length; ci++) {
				if (t.bajas?.includes(ci)) continue;
				const name = t.nombres[ci];
				if (censusBoquilla[name]) {
					result.push({ name, tid: t.id, ci });
				}
			}
		}
		return result;
	}, [trabajaderas, censusBoquilla]);

	if (boquilleros.length === 0) return null;

	// Máximo número de tramos entre todas las trabajaderas
	const maxTramos = Math.max(...trabajaderas.map((t) => t.tramos.length));

	// Generar nombres de tramos globales
	const tramosGlobales = Array.from({ length: maxTramos }, (_, i) => `T${i + 1}`);

	// Para cada boquillero, extraer su estado en cada tramo global
	type BoqCell = {
		v: "L" | "D" | "F" | "LF";
		isAutoD: boolean;
		isAutoF: boolean;
		isDentro: boolean;
		isFuera: boolean;
	};

	type BoqRow = {
		name: string;
		tid: number;
		ci: number;
		celdas: (BoqCell | null)[];
	};

	const rows: BoqRow[] = boquilleros.map((bq) => {
		const t = trabajaderas.find((x) => x.id === bq.tid)!;
		const pinned = getPinned(t);
		const celdas: (BoqCell | null)[] = [];

		for (let ti = 0; ti < maxTramos; ti++) {
			const r = t.plan?.[ti];
			const v = pinned[ti]?.[bq.ci] ?? "L";

			if (ti >= t.tramos.length) {
				celdas.push(null);
				continue;
			}

			let isAutoD = false;
			let isAutoF = false;
			if (r) {
				isAutoD = v === "L" && r.dentro.includes(bq.ci);
				isAutoF = (v === "L" || v === "LF") && r.fuera.includes(bq.ci);
			}

			const isDentro = v === "D" || (v === "L" && isAutoD);
			const isFuera = v === "F" || (v === "L" && isAutoF);

			celdas.push({ v, isAutoD, isAutoF, isDentro, isFuera });
		}

		return { name: bq.name, tid: bq.tid, ci: bq.ci, celdas };
	});

	// Detectar coincidencias: para cada tramo, qué boquilleros están dentro
	const coincidencias = useMemo(() => {
		const result: number[][] = [];
		for (let ti = 0; ti < maxTramos; ti++) {
			const dentro = rows
				.map((r, ri) => (r.celdas[ti]?.isDentro ? ri : -1))
				.filter((ri) => ri !== -1);
			result.push(dentro);
		}
		return result;
	}, [rows, maxTramos]);

	// Contar coincidencias por tramo
	const maxCoincidentes = Math.max(...coincidencias.map((c) => c.length), 0);

	return (
		<div className="card boquilla-view">
			<div className="trab-hdr">
				<div
					className="t-badge"
					style={{ backgroundColor: "var(--oro)", color: "#000" }}
				>
					B
				</div>
				<div className="t-info">
					<div className="t-name">Vista Boquilla</div>
					<div className="t-meta">
						{boquilleros.length} boquilla(s) · {maxTramos} tramos
						{maxCoincidentes > 1 && (
							<span className="text-red-400 ml-2">
								⚠ Hasta {maxCoincidentes} boquillas dentro al mismo tiempo
							</span>
						)}
					</div>
				</div>
				<button
					className="btn btn-oro btn-sm ml-auto"
					onClick={calcularTodo}
					title="Recalcular todas las trabajaderas"
				>
					⚙ Recalcular
				</button>
			</div>

			<div className="trab-body">
				<div className="plan-scroll">
					<table className="plan-table">
						<thead>
							<tr>
								<th className="col-name">Boquilla</th>
								{tramosGlobales.map((nombre, ti) => (
									<th key={ti} className="col-tramo">
										<span className="truncate max-w-[60px]" title={nombre}>
											{nombre}
										</span>
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{rows.map((row) => (
								<tr key={`${row.tid}-${row.ci}`}>
									<td className="td-name">
										<div className="flex aic jb gap-1">
											<span className="truncate">{shortName(row.name)}</span>
											<span className="text-[0.55rem] text-[var(--cre-o)]">
												T{row.tid}
											</span>
										</div>
									</td>
									{row.celdas.map((cell, ti) => {
										if (!cell) {
											return (
												<td key={ti}>
													<div className="pcell empty">—</div>
												</td>
											);
										}

										const clsMap: Record<string, string> = {
											L: cell.isAutoD ? "d" : cell.isAutoF ? "f" : "L",
											D: "D",
											F: "F",
											LF: cell.isAutoF ? "f" : "LF",
										};
										let cls = clsMap[cell.v];

										// Boquilla colors
										if (cell.isDentro) cls += " boq-D";
										if (cell.isFuera) cls += " boq-F";

										// Coincidencia highlight
										if (coincidencias[ti].length > 1 && cell.isDentro) {
											cls += " boq-coincidence";
										}

										const lbl = cell.isDentro
											? "D"
											: cell.isFuera
											? "F"
											: "·";

										return (
											<td key={ti}>
												<div
													className={`pcell ${cls}`}
													onClick={() => {
														setCellTarget({ tid: row.tid, ti, ci: row.ci });
														openSheet("celda");
													}}
												>
													{lbl}
												</div>
											</td>
										);
									})}
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{/* Leyenda de coincidencias */}
				{maxCoincidentes > 1 && (
					<div className="mt-3 p-3 bg-[rgba(139,26,26,0.15)] border border-red-800/30 rounded-xl">
						<div className="text-[0.7rem] text-red-300">
							<strong>⚠ Coincidencias detectadas:</strong> las celdas resaltadas en
							rojo indican tramos donde más de un boquillero está{" "}
							<strong>dentro</strong> al mismo tiempo.
						</div>
						{coincidencias.map((coincs, ti) => {
							if (coincs.length < 2) return null;
							return (
								<div key={ti} className="text-[0.65rem] text-red-300 mt-1 ml-2">
									<strong>T{ti + 1}:</strong>{" "}
									{coincs.map((ri) => rows[ri].name).join(", ")}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
});

export default BoquillaView;
