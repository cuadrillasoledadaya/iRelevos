"use client";

import { useEffect, useState, useCallback } from "react";
import { temporadaStore } from "@/stores";
import { useAdminData } from "@/hooks/useAdminData";
import { useAdminMutations } from "@/hooks/useAdminMutations";
import { useAuth } from "@/hooks/useAuth";

import UsuariosTab from "@/components/admin/UsuariosTab";
import CensoTab from "@/components/admin/CensoTab";
import PasosTab from "@/components/admin/PasosTab";
import TemporadasTab from "@/components/admin/TemporadasTab";

type AdminTab = "usuarios" | "censo" | "pasos" | "temporadas";

export default function AdminPage() {
	const activeTemporadaId = temporadaStore((s) => s.activeTemporadaId);
	const temporadas = temporadaStore((s) => s.temporadas);
	const setActiveTemporadaId = temporadaStore.getState().setActiveTemporadaId;
	const [activeTab, setActiveTab] = useState<AdminTab>("usuarios");
	const [filterPid, setFilterPid] = useState("all");

	// ── Data fetching ────────────────────────────────────────────────

	const {
		usuarios,
		setUsuarios,
		census,
		setCensus,
		pasos,
		setPasos,
		loading,
		fetchUsuarios,
		fetchCensus,
		fetchPasos,
	} = useAdminData(activeTemporadaId);

	// ── Mutaciones ───────────────────────────────────────────────────

	const m = useAdminMutations(
		activeTemporadaId,
		pasos,
		setCensus,
		setUsuarios,
		setPasos,
		(f = "all") => fetchCensus(f),
		fetchPasos,
	);

	// ── Cargar datos según tab activa ────────────────────────────────

	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => {
		if (activeTab === "usuarios") fetchUsuarios();
		if (activeTab === "censo") fetchCensus(filterPid);
		if (activeTab === "pasos") fetchPasos();
	}, [activeTab, filterPid, fetchUsuarios, fetchCensus, fetchPasos]);

	// Sincronizar pid con formulario de censo
	useEffect(() => {
		const pid = pasos[0]?.id ?? "";
		if (pid && !m.newEntry.proyecto_id) {
			m.setNewEntry((prev) => ({ ...prev, proyecto_id: pid }));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pasos, m.newEntry.proyecto_id]);

	// Sincronizar sourceTempId con temporada activa
	useEffect(() => {
		m.setNewTemp((prev) => ({
			...prev,
			sourceTempId: activeTemporadaId || "",
		}));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeTemporadaId]);

	// ── Handlers passthrough ─────────────────────────────────────────

	const handleFetchFromICuadrilla = useCallback(() => {
		m.fetchFromICuadrilla(pasos[0]?.id ?? "");
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [m, pasos]);

	const handleToggleSelected = useCallback(
		(idx: number) => {
			if (!m.importPreview) return;
			const next = [...m.importPreview];
			next[idx].selected = !next[idx].selected;
			m.setImportPreview(next);
			// eslint-disable-next-line react-hooks/exhaustive-deps
		},
		[m.importPreview, m.setImportPreview],
	);

	const handleToggleAllSelected = useCallback(() => {
		if (!m.importPreview) return;
		const allSelected = m.importPreview.every((c) => c.selected);
		m.setImportPreview(
			m.importPreview.map((c) => ({ ...c, selected: !allSelected })),
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [m.importPreview, m.setImportPreview]);

	const handleStartEdit = useCallback(
		(entry: import("@/components/admin/types").CensusEntry) => {
			m.setEditingId(entry.id);
			m.setEditForm({
				email: entry.email,
				nombre: entry.nombre,
				apellidos: entry.apellidos,
				apodo: entry.apodo,
				telefono: entry.telefono,
				trabajadera: entry.trabajadera,
				altura: entry.altura,
			});
		},
		[m],
	);

	const handleEliminarTemporada = useCallback(
		(id: string) => {
			m.eliminarTemporada(id, () => {
				if (id === activeTemporadaId) setActiveTemporadaId("");
				window.location.reload();
			});
		},
		[m, activeTemporadaId, setActiveTemporadaId],
	);

	const handleCrearTemporada = useCallback(() => {
		m.crearTemporada(m.newTemp, () => window.location.reload());
	}, [m]);

	// ── Verificación de permisos ─────────────────────────────────────
	const { profile } = useAuth();
	const esAdmin =
		profile?.role === "superadmin" ||
		profile?.role === "capataz" ||
		profile?.role === "auxiliar";

	if (!esAdmin) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-[var(--bg)] p-4">
				<div className="text-center">
					<h2 className="text-2xl font-black cinzel text-red-500 uppercase tracking-widest mb-2">
						Acceso Denegado
					</h2>
					<p className="text-[var(--crema)] text-sm">
						No tenés permisos para acceder al panel de administración.
					</p>
				</div>
			</div>
		);
	}

	// ═════════════════════════════════════════════════════════════════
	// RENDER
	// ═════════════════════════════════════════════════════════════════

	return (
		<div className="p-4 flex flex-col gap-6 pb-20">
			{/* Header */}
			<div className="text-center max-w-md mx-auto w-full">
				<h2 className="text-2xl font-black cinzel text-[var(--oro)] uppercase tracking-widest mb-2">
					Panel de Control
				</h2>
				<p className="text-[var(--cre-o)] text-[0.6rem] uppercase font-bold tracking-[0.2em] mb-6">
					Temporada:{" "}
					<span className="text-[var(--oro)]">
						{temporadas.find((t) => t.id === activeTemporadaId)?.nombre ||
							"Cargando..."}
					</span>
				</p>
				<div className="flex bg-black/30 p-1.5 rounded-2xl mb-8 border border-[var(--oro)]/10 shadow-inner">
					{(["usuarios", "censo", "pasos", "temporadas"] as AdminTab[]).map(
						(tab) => (
							<button
								key={tab}
								className={`tab-btn ${activeTab === tab ? "active" : ""}`}
								onClick={() => setActiveTab(tab)}
							>
								{tab.toUpperCase()}
							</button>
						),
					)}
				</div>
			</div>

			{/* Tabs */}
			{activeTab === "usuarios" && (
				<UsuariosTab
					usuarios={usuarios}
					loading={loading}
					onEliminar={m.eliminarUsuario}
					onCambiarRol={m.cambiarRol}
					onEditar={(uid) => m.editarPerfil(uid, usuarios)}
				/>
			)}

			{activeTab === "censo" && (
				<CensoTab
					census={census}
					pasos={pasos}
					loading={loading}
					saving={m.saving}
					importLoading={m.importLoading}
					filterPid={filterPid}
					onFilterPidChange={setFilterPid}
					newEntry={m.newEntry}
					onNewEntryChange={m.setNewEntry}
					onAddToCensus={m.addToCensus}
					editingId={m.editingId}
					editForm={m.editForm}
					onEditFormChange={m.setEditForm}
					onStartEdit={handleStartEdit}
					onSaveEdit={m.saveEdit}
					onCancelEdit={() => {
						m.setEditingId(null);
					}}
					onDeleteFromCensus={m.deleteFromCensus}
					onReconstruirCenso={m.reconstruirCensoCompleto}
					onSincronizacionTotal={m.sincronizacionTotal}
					onFetchFromICuadrilla={handleFetchFromICuadrilla}
					importPreview={m.importPreview}
					importPid={m.importPid}
					onImportPidChange={m.setImportPid}
					onToggleSelected={handleToggleSelected}
					onToggleAllSelected={handleToggleAllSelected}
					onCloseImport={() => m.setImportPreview(null)}
					onEjecutarImportacion={m.ejecutarImportacion}
				/>
			)}

			{activeTab === "pasos" && (
				<PasosTab
					pasos={pasos}
					loading={loading}
					saving={m.saving}
					newPaso={m.newPaso}
					onNewPasoChange={m.setNewPaso}
					onAddPaso={m.addPaso}
					onEliminarPaso={m.eliminarPaso}
					onSyncTodoCenso={m.syncTodoCenso}
					onSyncCensoDesdeProyecto={m.syncCensoDesdeProyecto}
				/>
			)}

			{activeTab === "temporadas" && (
				<TemporadasTab
					temporadas={temporadas}
					activeTemporadaId={activeTemporadaId}
					saving={m.saving}
					newTemp={m.newTemp}
					onNewTempChange={m.setNewTemp}
					onSelectTemporada={setActiveTemporadaId}
					onEliminarTemporada={handleEliminarTemporada}
					onCrearTemporada={handleCrearTemporada}
				/>
			)}
		</div>
	);
}
