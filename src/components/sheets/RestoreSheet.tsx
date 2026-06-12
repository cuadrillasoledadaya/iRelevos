"use client";

import { uiStore, historyStore } from "@/stores";

export default function RestoreSheet() {
  const activeSheet = uiStore((s) => s.activeSheet);
  const closeSheet = uiStore.getState().closeSheet;
  const restorePreview = historyStore((s) => s.restorePreview);
  const isLoading = historyStore((s) => s.isLoading);
  const error = historyStore((s) => s.error);
  const currentSnapshot = historyStore((s) => s.currentSnapshot);

  const isOpen = activeSheet === "restore";

  if (!restorePreview && !isLoading) {
    return (
      <>
        <div className={`bso${isOpen ? " open" : ""}`} onClick={closeSheet} />
        <div className={`bss${isOpen ? " open" : ""}`}>
          <div className="bs-handle" />
          <div className="bs-hdr">
            <span className="bs-title">Restaurar Instantánea</span>
            <button className="btn btn-ghost btn-sm" onClick={closeSheet}>
              ✕
            </button>
          </div>
          <div className="bs-body">
            <div className="p4 text-center text-muted">
              No hay previsualización disponible.
            </div>
          </div>
        </div>
      </>
    );
  }

  const { snapshotData } = restorePreview!;
  const snapshotName = currentSnapshot?.nombre ?? "Instantánea";
  const snapshotTrabajaderaId = currentSnapshot?.trabajadera_id;
  const nCostaleros = snapshotData.nombres.length;
  const nTramos = snapshotData.tramos.length;
  const nBajas = snapshotData.bajas?.length ?? 0;
  const nActivos = nCostaleros - nBajas;

  return (
    <>
      <div className={`bso${isOpen ? " open" : ""}`} onClick={closeSheet} />
      <div className={`bss${isOpen ? " open" : ""}`} style={{ maxHeight: "80vh" }}>
        <div className="bs-handle" />
        <div className="bs-hdr">
          <span className="bs-title">Restaurar: {snapshotName}</span>
          <button className="btn btn-ghost btn-sm" onClick={closeSheet}>
            ✕
          </button>
        </div>
        <div className="bs-body">
          {error && (
            <div className="alert warn mb3">{error}</div>
          )}

          {/* Snapshot Summary */}
          <div className="restore-summary mb4 p3">
            <h4 className="mb2">Resumen de la instantánea</h4>
            <div className="summary-grid grid grid-cols-2 gap-2 text-sm">
              <div className="summary-item">
                <span className="summary-label">Trabajadera:</span>
                <span className="summary-value">T{snapshotTrabajaderaId}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Costaleros activos:</span>
                <span className="summary-value">{nActivos}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Tramos:</span>
                <span className="summary-value">{nTramos}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Bajas:</span>
                <span className="summary-value">{nBajas}</span>
              </div>
            </div>
          </div>

          {/* Costaleros list */}
          {snapshotData.nombres.length > 0 && (
            <div className="restore-section mb3">
              <h5 className="text-sm font-bold mb2">
                Costaleros en la instantánea
              </h5>
              <ul className="list-none p0 m0 text-sm">
                {snapshotData.nombres.map((name, i) => {
                  const isBaja = snapshotData.bajas?.includes(i);
                  return (
                    <li key={i} className={`py1 border-b border-muted ${isBaja ? "text-muted line-through" : ""}`}>
                      {isBaja && <span className="text-err mr1">✕</span>}
                      {name}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Plan preview */}
          {snapshotData.plan && snapshotData.plan.length > 0 && (
            <div className="restore-section mb3">
              <h5 className="text-sm font-bold mb2">
                Plan ({snapshotData.plan.length} tramos)
              </h5>
              <div className="plan-scroll">
                <table className="plan-table">
                  <thead>
                    <tr>
                      <th className="col-name">Costalero</th>
                      {snapshotData.tramos.map((tramoName, ti) => (
                        <th key={ti} className="col-tramo">
                          <span title={tramoName}>
                            {tramoName || `T${ti + 1}`}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {snapshotData.nombres.map((name, ci) => {
                      if (snapshotData.bajas?.includes(ci)) return null;
                      return (
                        <tr key={ci}>
                          <td className="td-name">
                            <span className="truncate">{shortName(name)}</span>
                          </td>
                          {snapshotData.tramos.map((_, ti) => {
                            const slot = snapshotData.plan![ti];
                            const isDentro = slot?.dentro.includes(ci) ?? false;
                            const isFuera = slot?.fuera.includes(ci) ?? false;
                            const label = isDentro ? "D" : isFuera ? "F" : "·";
                            const cls = isDentro ? "D" : isFuera ? "F" : "L";

                            return (
                              <td key={ti}>
                                <div className={`pcell ${cls} readonly`}>
                                  {label}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt4">
            <button
              className="btn btn-oro f1"
              onClick={handleApply}
              disabled={isLoading}
            >
              {isLoading ? "Aplicando..." : "Aplicar restauración"}
            </button>
            <button
              className="btn btn-ghost f1"
              onClick={closeSheet}
            >
              Cancelar
            </button>
          </div>

          <p className="text-xs text-muted mt2 text-center">
            Esto reemplazará el plan de la Trabajadera {snapshotTrabajaderaId}. Los pins se perderán.
          </p>
        </div>
      </div>
    </>
  );

  async function handleApply() {
    if (!restorePreview) return;
    const result = await historyStore.getState().applyRestore(restorePreview.snapshotId);
    if (result.ok) {
      closeSheet();
    } else if (result.error?.includes("ha cambiado")) {
      historyStore.setState({ error: result.error });
    } else {
      historyStore.setState({ error: result.error ?? "Error al aplicar" });
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 2) return full;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}
