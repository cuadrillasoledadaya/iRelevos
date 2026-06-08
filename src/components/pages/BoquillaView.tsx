"use client";

import { memo, useMemo } from "react";
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
 * Siempre visible (no colapsable).
 */
const BoquillaView = memo(function BoquillaView({
	trabajaderas,
	censusBoquilla,
}: {
	trabajaderas: Trabajadera[];
	censusBoquilla: Record<string, boolean>;
}) {
	const openSheet = uiStore.getState().openSheet;
	const setCellTarget = uiStore.getState().setCellTarget;
	const calcularTodo = planStore.getState().calcularTodo;

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

	if (boquilleros.length === 0) return null;

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

	// 5. Para cada boquillero, extraer su estado REAL en cada tramo (por nombre)
	type BoqCell = {
		tramoNombre: string;
		tramoNum: number;
		isDentro: boolean;
		isFuera: boolean;
		planSlot: TramoSlot | null;
		v: "L" | "D" | "F" | "LF";
		cls: string;
		exists: boolean; // true si este tramo existe en la trabajadera del boquilla
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

		const celdas: BoqCell[] = tramosOrdenados.map((tramoNombre) => {
			const tramoNum = extractTramoNum(tramoNombre);
			const ti = nombreToIdx.get(tramoNombre);

			// Si este tramo no existe en la trabajadera del boquilla
			if (ti === undefined) {
				return {
					tramoNombre,
					tramoNum,
					isDentro: false,
					isFuera: false,
					planSlot: null,
					v: "L" as const,
					cls: "empty",
					exists: false,
				};
			}

			// Estado real del boquilla en este tramo de su trabajadera
			const planSlot = t.plan?.[ti] ?? null;
			const v = pinned[ti]?.[bq.ci] ?? "L";

			let isAutoD = false;
			let isAutoF = false;
			if (planSlot) {
				isAutoD = v === "L" && planSlot.dentro.includes(bq.ci);
				isAutoF = (v === "L" || v === "LF") && planSlot.fuera.includes(bq.ci);
			}

			const isDentro = v === "D" || (v === "L" && isAutoD);
			const isFuera = v === "F" || (v === "L" && isAutoF);

			const clsMap: Record<string, string> = {
				L: isAutoD ? "d" : isAutoF ? "f" : "L",
				D: "D",
				F: "F",
				LF: isAutoF ? "f" : "LF",
			};

			return {
				tramoNombre,
				tramoNum,
				isDentro,
				isFuera,
				planSlot,
				v,
				cls: clsMap[v],
				exists: true,
			};
		});

		return { name: bq.name, tid: bq.tid, ci: bq.ci, celdas };
	});

	// 6. Detectar coincidencias: para cada tramo, qué boquilleros están dentro
	const coincidencias = useMemo(() => {
		const result: { tramoNombre: string; tramoNum: number; indices: number[] }[] = [];
		for (let ti = 0; ti < tramosOrdenados.length; ti++) {
			const dentro = rows
				.map((r, ri) => (r.celdas[ti]?.exists && r.celdas[ti]?.isDentro ? ri : -1))
				.filter((ri) => ri !== -1);
			if (dentro.length > 0) {
				result.push({
					tramoNombre: tramosOrdenados[ti],
					tramoNum: extractTramoNum(tramosOrdenados[ti]),
					indices: dentro,
				});
			}
		}
		return result;
	}, [rows, tramosOrdenados]);

	const maxCoincidentes = Math.max(...coincidencias.map((c) => c.indices.length), 0);
	const hasAnyPlan = trabConBoquilla.some((t) => t.plan !== null);

	return (
		<div className="card boquilla-view open">
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
						{boquilleros.length} boquilla(s) · {tramosOrdenados.length} tramos
						{maxCoincidentes > 1 && (
							<span className="text-red-400 ml-2">
								 Hasta {maxCoincidentes} boquillas dentro al mismo tiempo
							</span>
						)}
						{!hasAnyPlan && (
							<span className="text-yellow-400 ml-2">
								· Calculá el plan para ver los datos
							</span>
						)}
					</div>
				</div>
				<button
					className="btn btn-oro btn-sm ml-auto"
					onClick={calcularTodo}
					title="Recalcular todas las trabajaderas"
				>
					 Calcular Todo
				</button>
			</div>

			<div className="trab-body" style={{ display: "block" }}>
				{/* Tabla: filas = boquilleros, columnas = tramos ordenados por número */}
				<div className="plan-scroll">
					<table className="plan-table">
						<thead>
							<tr>
								<th className="col-name">Boquilla</th>
								{tramosOrdenados.map((nombre, ti) => (
									<th key={ti} className="col-tramo">
										<span
											className="truncate max-w-[60px]"
											title={nombre}
										>
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
										if (!cell.exists) {
											return (
												<td key={ti}>
													<div className="pcell empty">—</div>
												</td>
											);
										}

										let cls = cell.cls;
										if (cell.isDentro) cls += " boq-D";
										if (cell.isFuera) cls += " boq-F";

										// Coincidencia: más de un boquillero dentro en el mismo tramo
										const coinc = coincidencias.find((c) => c.tramoNum === cell.tramoNum);
										if (coinc && coinc.indices.length > 1 && cell.isDentro) {
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
														// Encontrar el índice real en la trabajadera original
														const t = trabajaderas.find((x) => x.id === row.tid)!;
														const realTi = t.tramos.indexOf(cell.tramoNombre);
														if (realTi >= 0) {
															setCellTarget({ tid: row.tid, ti: realTi, ci: row.ci });
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

				{/* Detalle por tramo: quiénes están dentro/fuera en cada tramo */}
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
								const tramoNum = extractTramoNum(nombre);
								const boqsEnTramo = rows
									.map((r, ri) => ({ row: r, ri, cell: r.celdas[ti] }))
									.filter((x) => x.cell?.exists);

								const dentro = boqsEnTramo.filter((x) => x.cell!.isDentro);
								const fuera = boqsEnTramo.filter((x) => x.cell!.isFuera);

								return (
									<div
										key={ti}
										className="flex items-start gap-3 px-3 py-2 rounded border border-white/5 bg-black/10"
									>
										<span className="text-[0.65rem] font-bold text-oro min-w-[40px]">
											{nombre}
										</span>
										<div className="flex flex-col gap-1 f1">
											{dentro.length > 0 && (
												<div className="text-[0.65rem]">
													<span className="text-blue-400 font-bold">DENTRO:</span>{" "}
													{dentro.map((x) => (
														<span key={x.ri} className="text-blue-300 ml-1">
															{x.row.name}
														</span>
													))}
												</div>
											)}
											{fuera.length > 0 && (
												<div className="text-[0.65rem]">
													<span className="text-orange-400 font-bold">FUERA:</span>{" "}
													{fuera.map((x) => (
														<span key={x.ri} className="text-orange-300 ml-1">
															{x.row.name}
														</span>
													))}
												</div>
											)}
											{dentro.length === 0 && fuera.length === 0 && (
												<div className="text-[0.65rem] text-[var(--border)]">
													Sin boquilleros en este tramo
												</div>
											)}
											{dentro.length > 1 && (
												<div className="text-[0.65rem] text-red-400 font-bold">
													⚠ COINCIDENCIA: {dentro.length} boquillas dentro
												</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}

				{/* Alerta de coincidencias */}
				{maxCoincidentes > 1 && (
					<div className="mt-3 p-3 bg-[rgba(139,26,26,0.15)] border border-red-800/30 rounded-xl">
						<div className="text-[0.7rem] text-red-300">
							<strong> Coincidencias detectadas:</strong> más de un boquillero está{" "}
							<strong>dentro</strong> al mismo tiempo en estos tramos:
						</div>
						{coincidencias
							.filter((c) => c.indices.length > 1)
							.map((c) => (
								<div key={c.tramoNum} className="text-[0.65rem] text-red-300 mt-1 ml-2">
									<strong>{c.tramoNombre}:</strong>{" "}
									{c.indices.map((ri) => rows[ri].name).join(", ")}
								</div>
							))}
					</div>
				)}
			</div>
		</div>
	);
});

export default BoquillaView;
