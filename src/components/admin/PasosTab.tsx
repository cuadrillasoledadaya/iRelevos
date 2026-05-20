"use client";

import type { PasoDB } from "@/lib/types";

interface PasosTabProps {
	pasos: PasoDB[];
	loading: boolean;
	saving: boolean;
	newPaso: {
		nombre_paso: string;
		nombre_cuadrilla: string;
		num_trabajaderas: number;
	};
	onNewPasoChange: (v: {
		nombre_paso: string;
		nombre_cuadrilla: string;
		num_trabajaderas: number;
	}) => void;
	onAddPaso: (e: React.FormEvent) => void;
	onEliminarPaso: (id: string) => void;
	onSyncTodoCenso: (proyectoId: string) => void;
	onSyncCensoDesdeProyecto: (proyectoId: string) => void;
}

export default function PasosTab({
	pasos,
	loading,
	saving,
	newPaso,
	onNewPasoChange,
	onAddPaso,
	onEliminarPaso,
	onSyncTodoCenso,
	onSyncCensoDesdeProyecto,
}: PasosTabProps) {
	return (
		<div className="flex flex-col gap-6">
			<form
				onSubmit={onAddPaso}
				className="bg-[var(--card)] border border-[var(--oro)]/30 p-4 rounded-lg flex flex-col gap-3"
			>
				<h3 className="cinzel text-[var(--oro)] text-sm font-bold">
					Crear Nuevo Paso
				</h3>
				<input
					className="inp"
					placeholder="Nombre del Paso (ej: Virgen de la Paz)"
					required
					value={newPaso.nombre_paso}
					onChange={(e) =>
						onNewPasoChange({ ...newPaso, nombre_paso: e.target.value })
					}
				/>
				<input
					className="inp"
					placeholder="Nombre de la Cuadrilla"
					required
					value={newPaso.nombre_cuadrilla}
					onChange={(e) =>
						onNewPasoChange({ ...newPaso, nombre_cuadrilla: e.target.value })
					}
				/>
				<div className="flex aic jb gap-2">
					<label className="text-[0.6rem] text-[var(--cre-o)] uppercase font-bold whitespace-nowrap">
						Nº Trabajaderas:
					</label>
					<input
						className="inp w-20"
						type="number"
						min="1"
						max="15"
						required
						value={newPaso.num_trabajaderas}
						onChange={(e) =>
							onNewPasoChange({
								...newPaso,
								num_trabajaderas: parseInt(e.target.value),
							})
						}
					/>
				</div>
				<button disabled={saving} className="btn btn-oro w-full mt-2">
					{saving ? "Inicializando..." : "CREAR E INICIALIZAR PASO"}
				</button>
			</form>

			<div className="flex flex-col gap-3">
				<h3 className="cinzel text-[var(--oro)] text-sm font-bold uppercase tracking-widest">
					Pasos Activos <span>({pasos.length})</span>
				</h3>
				{loading ? (
					<div className="p-8 text-center cinzel text-[var(--oro)] animate-pulse">
						Cargando pasos...
					</div>
				) : (
					pasos.map((p: PasoDB) => (
						<div
							key={p.id}
							className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-lg flex flex-col gap-2 relative"
						>
							<button
								onClick={() => onEliminarPaso(p.id)}
								className="absolute top-2 right-2 text-red-500 opacity-30 hover:opacity-100 p-2"
							>
								🗑️
							</button>
							<div>
								<h4 className="font-bold text-[var(--oro)]">{p.nombre_paso}</h4>
								<p className="text-[10px] text-[var(--cre-o)] uppercase font-bold tracking-widest">
									{p.nombre_cuadrilla}
								</p>
							</div>
							<div className="flex jb aic text-[10px] mt-2 opacity-70">
								<span className="bg-[var(--oro)] text-black px-2 py-0.5 rounded font-black uppercase">
									{p.num_trabajaderas} TRABAJADERAS
								</span>
								<span>{new Date(p.created_at).toLocaleDateString()}</span>
							</div>
							<div className="flex flex-col gap-1 mt-1">
								<button
									type="button"
									disabled={saving}
									onClick={(e) => {
										e.stopPropagation();
										onSyncTodoCenso(p.id);
									}}
									className="btn btn-out w-full text-[0.65rem]"
									style={{ borderColor: "var(--oro)", color: "var(--oro)" }}
								>
									{saving
										? "⏳ Sincronizando..."
										: "🔄 Sincronizar Cuadrilla desde Censo"}
								</button>
								<button
									type="button"
									disabled={saving}
									onClick={(e) => {
										e.stopPropagation();
										onSyncCensoDesdeProyecto(p.id);
									}}
									className="btn btn-ghost w-full text-[0.65rem] border border-blue-400/30 text-blue-400 hover:bg-blue-400/10"
								>
									{saving
										? "⏳ Generando..."
										: "➡️ Generar Censo desde Cuadrilla"}
								</button>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
