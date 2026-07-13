"use client";

import { useState, useEffect } from "react";
import { uiStore, projectStore, historyStore, temporadaStore } from "@/stores";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime, formatDateShort } from "@/lib/format/date";
import type { PlanSnapshotSummary, DatosPerfil } from "@/lib/types";

export default function HistorySheet() {
  const activeSheet = uiStore((s) => s.activeSheet);
  const closeSheet = uiStore.getState().closeSheet;
  const openSheet = uiStore.getState().openSheet;
  const listSnapshots = historyStore.getState().listSnapshots;
  const getSnapshot = historyStore.getState().getSnapshot;
  const saveSnapshot = historyStore.getState().saveSnapshot;
  const previewRestore = historyStore.getState().previewRestore;
  const snapshots = historyStore((s: { snapshots: PlanSnapshotSummary[] }) => s.snapshots);
  const isLoading = historyStore((s: { isLoading: boolean }) => s.isLoading);
  const error = historyStore((s: { error: string | null }) => s.error);
  const S = projectStore((s: { S: DatosPerfil }) => s.S);
  const pid = projectStore((s) => s.pid);
  const activeTemporadaId = temporadaStore((s) => s.activeTemporadaId);
  const { profile } = useAuth();

  const esMando =
    profile?.role === "superadmin" ||
    profile?.role === "capataz" ||
    profile?.role === "auxiliar";

  const isOpen = activeSheet === "history";
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [snapshotName, setSnapshotName] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const storeSelectedId = historyStore((s: { selectedTrabajaderaId: number | null }) => s.selectedTrabajaderaId);
  const setSelectedTrabajaderaId = historyStore.getState().setSelectedTrabajaderaId;
  const selectedTrabajaderaId = storeSelectedId ?? S.trabajaderas[0]?.id ?? 1;

  // Update selected trabajadera when S changes
  useEffect(() => {
    if (S.trabajaderas.length > 0 && !S.trabajaderas.find((t) => t.id === selectedTrabajaderaId)) {
      setSelectedTrabajaderaId(S.trabajaderas[0].id);
    }
  }, [S.trabajaderas, selectedTrabajaderaId, setSelectedTrabajaderaId]);

  // Load snapshots when sheet opens or trabajadera changes
  useEffect(() => {
    if (isOpen && S.trabajaderas.length > 0) {
      void listSnapshots(selectedTrabajaderaId);
    }
  }, [isOpen, selectedTrabajaderaId, listSnapshots, S.trabajaderas.length]);

  const selectedTrab = S.trabajaderas.find((t) => t.id === selectedTrabajaderaId);
  const defaultName = selectedTrab
    ? `Trabajadera ${selectedTrab.id} — ${formatDateShort(new Date().toISOString())}`
    : "";

  function handleOpenSave() {
    setSnapshotName(defaultName);
    setSaveError(null);
    setShowSaveDialog(true);
  }

  function handleCloseSaveDialog() {
    if (isSaving) return;
    setShowSaveDialog(false);
    setSaveError(null);
  }

  async function handleSave() {
    if (!pid || !snapshotName.trim() || !selectedTrabajaderaId) return;
    setIsSaving(true);
    setSaveError(null);
    historyStore.setState({ error: null });
    const result = await saveSnapshot(pid, selectedTrabajaderaId, snapshotName.trim());
    setIsSaving(false);
    if (result.ok) {
      setShowSaveDialog(false);
    } else {
      setSaveError(result.error);
    }
  }

  async function handleView(id: string) {
    const snap = await getSnapshot(id);
    if (snap) {
      openSheet("detail");
    }
  }

  async function handleCompare(id: string) {
    const snap = await getSnapshot(id);
    if (snap) {
      openSheet("compare");
    }
  }

  async function handleRestore(id: string) {
    const snap = await getSnapshot(id);
    if (snap) {
      await previewRestore(id);
      openSheet("restore");
    }
  }

  if (!esMando) {
    return (
      <>
        <div className={`bso${isOpen ? " open" : ""}`} onClick={closeSheet} />
        <div className={`bss${isOpen ? " open" : ""}`}>
          <div className="bs-handle" />
          <div className="bs-hdr">
            <span className="bs-title">Historial</span>
            <button className="btn btn-ghost btn-sm" onClick={closeSheet}>
              ✕
            </button>
          </div>
          <div className="bs-body">
            <div className="p4 text-center text-muted">
              Solo los mandos pueden ver el historial de instantáneas.
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={`bso${isOpen ? " open" : ""}`} onClick={closeSheet} />
      <div className={`bss${isOpen ? " open" : ""}`}>
        <div className="bs-handle" />
        <div className="bs-hdr">
          <span className="bs-title">Historial de Instantáneas</span>
          <div className="flex gap-2">
            <button
              className="btn btn-oro btn-sm"
              onClick={handleOpenSave}
              disabled={!selectedTrab?.analisis?.okObj || !pid || !activeTemporadaId}
              title={
                !activeTemporadaId
                  ? "Selecciona una temporada activa antes de guardar"
                  : !pid
                    ? "No hay proyecto activo"
                    : "Guardar plan de esta trabajadera como instantánea"
              }
            >
              + Guardar
            </button>
            <button className="btn btn-ghost btn-sm" onClick={closeSheet}>
              ✕
            </button>
          </div>
        </div>
        <div className="bs-body">
          {/* Trabajadera selector */}
          {S.trabajaderas.length > 1 && (
            <div className="mb3">
              <label className="form-label text-xs">Trabajadera</label>
              <select
                className="form-input"
                value={selectedTrabajaderaId}
                onChange={(e) => setSelectedTrabajaderaId(Number(e.target.value))}
              >
                {S.trabajaderas.map((t) => (
                  <option key={t.id} value={t.id}>
                    Trabajadera {t.id}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="alert warn mb3">{error}</div>
          )}

          {isLoading && snapshots.length === 0 && (
            <div className="p4 text-center text-muted">Cargando...</div>
          )}

          {!isLoading && snapshots.length === 0 && (
            <div className="p4 text-center">
              <p className="text-muted mb3">
                Aún no tienes instantáneas guardadas para esta trabajadera.
                Guarda tu planificación para poder compararla o restaurarla más adelante.
              </p>
              <button className="btn btn-oro" onClick={handleOpenSave}>
                + Guardar plan actual
              </button>
            </div>
          )}

          {snapshots.map((snap: PlanSnapshotSummary) => (
            <div key={snap.id} className="snapshot-item">
              <div className="snapshot-item-info">
                <div className="snapshot-item-name">{snap.nombre}</div>
                <div className="snapshot-item-meta">
                  {formatDateTime(snap.created_at)}
                  {snap.proyecto_nombre && ` · ${snap.proyecto_nombre}`}
                  {snap.temporada_nombre && ` · ${snap.temporada_nombre}`}
                  {snap.plan_summary.status === "ok" && (
                    <span className="badge-ok">✓ OK</span>
                  )}
                  {snap.plan_summary.status === "incomplete" && (
                    <span className="badge-warn"> Incompleto</span>
                  )}
                </div>
              </div>
              <div className="snapshot-actions">
                <button
                  className="btn btn-sm btn-ghost"
                  title="Ver detalle"
                  onClick={() => handleView(snap.id)}
                >
                  Ver
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  title="Comparar con actual"
                  onClick={() => handleCompare(snap.id)}
                >
                  Comparar
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  title="Restaurar esta instantánea"
                  onClick={() => handleRestore(snap.id)}
                >
                  Restaurar
                </button>
                <button
                  className="btn btn-sm btn-ghost text-err"
                  title="Borrar instantánea"
                  onClick={() => handleDelete(snap.id)}
                >
                  Borrar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="bso open" style={{ zIndex: 300 }} onClick={handleCloseSaveDialog}>
          <div
            className="bss open"
            style={{ maxHeight: "50vh", zIndex: 301 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bs-handle" />
            <div className="bs-hdr">
              <span className="bs-title">Guardar Instantánea</span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleCloseSaveDialog}
              >
                ✕
              </button>
            </div>
            <div className="bs-body">
              <label className="form-label" htmlFor="snapshot-name">Nombre</label>
              <input
                id="snapshot-name"
                className="form-input"
                type="text"
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                placeholder="Trabajadera X — DD/MM/YYYY"
              />
              {saveError && (
                <div className="alert warn mt3" role="alert">{saveError}</div>
              )}
              <div className="flex gap-2 mt3">
                <button
                  className="btn btn-oro f1"
                  onClick={handleSave}
                  disabled={!snapshotName.trim() || isSaving}
                >
                  {isSaving ? "Guardando..." : "Guardar"}
                </button>
                <button
                  className="btn btn-ghost f1"
                  onClick={handleCloseSaveDialog}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  async function handleDelete(id: string) {
    if (!confirm("¿Borrar esta instantánea? Esta acción no se puede deshacer."))
      return;
    await historyStore.getState().deleteSnapshot(id);
  }
}
