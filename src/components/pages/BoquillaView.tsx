"use client";

import { memo, useMemo, useState } from "react";
import { uiStore, planStore } from "@/stores";
import { getPinned } from "@/lib/algoritmos";
import { shortName } from "@/lib/nombres";
import type { Trabajadera, TramoSlot } from "@/lib/types";

/**
 * Extrae el número de un nombre de tramo como "T14" → 14, "Tramo 3" → 3
 */
function extractTramoNum(nombre: string): number {
	const match = nombre.match(/(\d+)/);
	return match ? parseInt(match[1], 10) : 0;
}

/**
 * BoquillaView — Muestra el plan de rotación real de cada boquillero,
 * alineados por NÚMERO de tramo para detectar coincidencias.
 * Incluye inferencia de estado para tramos intermedios.
 */
const BoquillaView = memo(function BoquillaView({
	trabajaderas,
	censusBoquilla,
	onOpenConflicts,
}: {
	trabajaderas: Trabajadera[];
	censusBoquilla: Record<string, boolean>;
	onOpenConflicts?: () => void;
}) {
	const openSheet = uiStore.getState().openSheet;
	const setCellTarget = uiStore.getState().setCellTarget;
	const calcularTodo = planStore.getState().calcularTodo;

	const [isOpen, setIsOpen] = useState(false);

	type Boquillero = {
		name: string;
		tid: number;
		ci: number;
	};

	// 1. Recopilar boquilleros de todas las trabajaderas
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

	// 2. Solo considerar trabajaderas que tienen boquilleros
	const boquillaTids = new Set(boquilleros.map((b) => b.tid));
	const trabConBoquilla = trabajaderas.filter((t) => boquillaTids.has(t.id));

	// 3. Recopilar TODOS los nombres de tramos únicos de las trabajaderas con boquilleros
	const allTramoNames = new Set<string>();
	for (const t of trabConBoquilla) {
		for (const nombre of t.tramos) {
			allTramoNames.add(nombre);
		}
	}

	// 4. Ordenar por número extraído del nombre
	const tramosOrdenados = Array.from(allTramoNames).sort(
		(a, b) => extractTramoNum(a) - extractTramoNum(b),
	);

	// 5. Para cada boquillero, extraer su estado REAL + inferido
	type BoqCell = {
		tramoNombre: string;
		tramoNum: number;
		isDentro: boolean;
		isFuera: boolean;
		planSlot: TramoSlot | null;
		v: "L" | "D" | "F" | "LF" | "LS";
		cls: string;
		exists: boolean; // true si este tramo existe en la trabajadera del boquilla
		inferred: boolean; // true si el estado fue inferido por continuidad
	};

	type BoqRow = {
		name: string;
		tid: number;
		ci: number;
		celdas: BoqCell[];
	};

	const rows: BoqRow[] = boquilleros.map((bq) => {
		const t = trabajaderas.find((x) => x.id === bq.tid)!;
		const pinned = getPinned(t);

		// Crear mapa nombre → índice para búsqueda rápida
		const nombreToIdx = new Map<string, number>();
		t.tramos.forEach((nombre, idx) => nombreToIdx.set(nombre, idx));

		// Estado inferido: se mantiene el último estado conocido (D o F)
		let lastState: "D" | "F" | null = null;

		const celdas: BoqCell[] = tramosOrdenados.map((tramoNombre) => {
			const tramoNum = extractTramoNum(tramoNombre);
			const ti = nombreToIdx.get(tramoNombre);

			// Si este tramo existe en la trabajadera del boquilla
			if (ti !== undefined) {
				const planSlot = t.plan?.[ti] ?? null;
				const v = pinned[ti]?.[bq.ci] ?? "L";

				let isAutoD = false;
				let isAutoF = false;
				if (planSlot) {
					isAutoD = v === "L" && planSlot.dentro.includes(bq.ci);
					isAutoF = (v === "L" || v === "LF") && planSlot.fuera.includes(bq.ci);
				}

				const isDentro = v === "D" || v === "LS" || (v === "L" && isAutoD);
				const isFuera = v === "F" || (v === "L" && isAutoF);

				const clsMap: Record<string, string> = {
					L: isAutoD ? "d" : isAutoF ? "f" : "L",
					D: "D",
					F: "F",
					LF: isAutoF ? "f" : "LF",
					LS: "LS",
				};

				// Actualizar lastState con el estado real
				lastState = isDentro ? "D" : "F";

				return {
					tramoNombre,
					tramoNum,
					isDentro,
					isFuera,
					planSlot,
					v,
					cls: clsMap[v],
					exists: true,
					inferred: false,
				};
			}

			// Tramo no existe en esta trabajadera → inferir estado
			if (lastState === "D") {
				// Si estaba dentro, sigue dentro hasta que aparezca fuera
				return {
					tramoNombre,
					tramoNum,
					isDentro: true,
					isFuera: false,
					planSlot: null,
					v: "L" as const,
					cls: "d boq-D inferred",
					exists: false,
					inferred: true,
				};
			} else if (lastState === "F") {
				// Si estaba fuera, sigue fuera hasta que aparezca dentro
				return {
					tramoNombre,
					tramoNum,
					isDentro: false,
					isFuera: true,
					planSlot: null,
					v: "L" as const,
					cls: "f boq-F inferred",
					exists: false,
					inferred: true,
				};
			}

			// Sin estado previo conocido
			return {
				tramoNombre,
				tramoNum,
				isDentro: false,
				isFuera: false,
				planSlot: null,
				v: "L" as const,
				cls: "empty",
				exists: false,
				inferred: false,
			};
		});

		return { name: bq.name, tid: bq.tid, ci: bq.ci, celdas };
	});

	// 6. Detectar coincidencias: para cada tramo, qué boquilleros están dentro/fuera
	const coincidencias = useMemo(() => {
		const result: {
			tramoNombre: string;
			tramoNum: number;
			dentro: number[];
			fuera: number[];
		}[] = [];
		for (let ti = 0; ti < tramosOrdenados.length; ti++) {
			const dentro = rows
				.map((r, ri) => (r.celdas[ti]?.isDentro ? ri : -1))
				.filter((ri) => ri !== -1);
			const fuera = rows
				.map((r, ri) => (r.celdas[ti]?.isFuera ? ri : -1))
				.filter((ri) => ri !== -1);
			if (dentro.length > 0 || fuera.length > 0) {
				result.push({
					tramoNombre: tramosOrdenados[ti],
					tramoNum: extractTramoNum(tramosOrdenados[ti]),
					dentro,
					fuera,
				});
			}
		}
		return result;
	}, [rows, tramosOrdenados]);

	const maxFuera = Math.max(...coincidencias.map((c) => c.fuera.length), 0);
	const hasAnyPlan = trabConBoquilla.some((t) => t.plan !== null);

	// Count real plan conflicts: same nombreIdx in both dentro and fuera
	const conflictCount = useMemo(() => {
		let count = 0;
		for (const t of trabajaderas) {
			if (!t.plan) continue;
			for (let ti = 0; ti < t.tramos.length; ti++) {
				const slot = t.plan[ti];
				if (!slot) continue;
				const dentroSet = new Set(slot.dentro);
				for (const fIdx of slot.fuera) {
					if (dentroSet.has(fIdx)) count++;
				}
			}
		}
		return count;
	}, [trabajaderas]);

	if (boquilleros.length === 0) return null;

	return (
		<div className={`card boquilla-view ${isOpen ? "open" : ""}`}>
			<div className="trab-hdr" onClick={() => setIsOpen(!isOpen)}>
				<div
					className="t-badge"
					style={{ backgroundColor: "var(--oro)", color: "#000" }}
				>
					B
				</div>
				<div className="t-info">
					<div className="t-name">Vista Boquilla</div>
					<div className="t-meta">
						{boquilleros.length} boquilla(s) · {tramosOrdenados.length} tramos
						{maxFuera > 1 && (
							<span className="text-red-500 ml-2 font-bold">
								 {maxFuera} boquillas FUERA al mismo tiempo
							</span>
						)}
						{!hasAnyPlan && (
							<span className="text-[#8B6914] ml-2">
								· Calculá el plan para ver los datos
							</span>
						)}
					</div>
				</div>
				{conflictCount > 0 && onOpenConflicts && (
					<button
						className="btn btn-sm ml-2"
						style={{
							backgroundColor: "var(--err-bg)",
							borderColor: "var(--err-bd)",
							color: "var(--err-tx)",
						}}
						onClick={(e) => {
							e.stopPropagation();
							onOpenConflicts();
						}}
						title="Resolver conflictos de boquilla"
					>
						⚠ Resolver ({conflictCount})
					</button>
				)}
				<button
					className="btn btn-oro btn-sm ml-auto"
					onClick={(e) => {
						e.stopPropagation();
						calcularTodo();
					}}
					title="Recalcular todas las trabajaderas"
				>
					 Calcular Todo
				</button>
				<div className="t-chev">▼</div>
			</div>

			<div className="trab-body" style={{ display: isOpen ? "block" : "none" }}>
				{/* Tabla: filas = boquilleros, columnas = tramos ordenados por número */}
				<div className="plan-scroll">
					<table className="plan-table">
						<thead>
							<tr>
								<th className="col-name">Boquilla</th>
								{tramosOrdenados.map((nombre, ti) => (
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
										if (!cell.exists && !cell.inferred) {
											return (
												<td key={ti}>
													<div className="pcell empty">—</div>
												</td>
											);
										}

										let cls = "";

										// Coincidencia FUERA → rojo
										const coinc = coincidencias.find((c) => c.tramoNum === cell.tramoNum);
										if (coinc && coinc.fuera.length > 1 && cell.isFuera) {
											cls = "boq-coincidence-fuera";
										}
										// Normal: D=verde, F=amarillo
										else if (cell.isDentro) {
											cls = "boq-D";
										} else if (cell.isFuera) {
											cls = "boq-F";
										}

										if (cell.inferred) cls += " inferred";

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
														if (cell.exists) {
															setCellTarget({ tid: row.tid, ti: ti, ci: row.ci });
															openSheet("celda");
														}
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

				{/* Detalle por tramo */}
				{hasAnyPlan && (
					<div className="mt-4">
						<div
							className="xs toro-o cinzel uppercase mb2"
							style={{ letterSpacing: ".06em" }}
						>
							Detalle por tramo
						</div>
						<div className="fc gap-2">
							{tramosOrdenados.map((nombre, ti) => {
								const boqsEnTramo = rows
									.map((r, ri) => ({ row: r, ri, cell: r.celdas[ti] }))
									.filter((x) => x.cell?.isDentro || x.cell?.isFuera);

								const dentro = boqsEnTramo.filter((x) => x.cell!.isDentro);
								const fuera = boqsEnTramo.filter((x) => x.cell!.isFuera);

								return (
									<div
										key={ti}
										className="flex items-start gap-3 px-3 py-2 rounded border border-white/5 bg-black/10"
									>
										<span className="text-[0.65rem] font-bold text-[#1a1a1a] min-w-[40px]">
											{nombre}
										</span>
										<div className="flex flex-col gap-1 f1">
											{dentro.length > 0 && (
												<div className="text-[0.65rem]">
													<span className="text-[#1a1a1a] font-bold">DENTRO:</span>{" "}
													{dentro.map((x) => (
														<span
															key={x.ri}
															className={`ml-1 ${x.cell!.inferred ? "text-[#1a1a1a]/50 italic" : "text-[#1a1a1a]"}`}
														>
															{x.row.name}
															{x.cell!.inferred && " (inf)"}
														</span>
													))}
												</div>
											)}
											{fuera.length > 0 && (
												<div className="text-[0.65rem]">
													<span className="text-[#1a1a1a] font-bold">FUERA:</span>{" "}
													{fuera.map((x) => (
														<span
															key={x.ri}
															className={`ml-1 ${x.cell!.inferred ? "text-[#1a1a1a]/50 italic" : "text-[#1a1a1a]"}`}
														>
															{x.row.name}
															{x.cell!.inferred && " (inf)"}
														</span>
													))}
												</div>
											)}
											{dentro.length === 0 && fuera.length === 0 && (
												<div className="text-[0.65rem] text-[#1a1a1a]/60">
													Sin boquilleros en este tramo
												</div>
											)}
											{fuera.length > 1 && (
												<div className="text-[0.65rem] text-[#8B1A1A] font-bold">
													 ⚠ COINCIDENCIA FUERA: {fuera.length} boquillas
												</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}

				{/* Alerta de coincidencias FUERA */}
				{maxFuera > 1 && (
					<div className="mt-3 p-3 bg-[rgba(139,26,26,0.1)] border border-[#8B1A1A]/30 rounded-xl">
						<div className="text-[0.7rem] text-[#1a1a1a]">
							<strong>⚠ Coincidencias FUERA detectadas:</strong> más de un boquillero está{" "}
							<strong>fuera</strong> al mismo tiempo en estos tramos:
						</div>
						{coincidencias
							.filter((c) => c.fuera.length > 1)
							.map((c) => (
								<div key={c.tramoNum} className="text-[0.65rem] text-[#1a1a1a] mt-1 ml-2">
									<strong>{c.tramoNombre}:</strong>{" "}
									<span className="text-[#8B1A1A] font-bold">
										FUERA: {c.fuera.map((ri) => rows[ri].name).join(", ")}
									</span>
								</div>
							))}
					</div>
				)}
			</div>
		</div>
	);
});

export default BoquillaView;
