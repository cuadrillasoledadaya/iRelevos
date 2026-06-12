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

  const { diff } = restorePreview!;
  const totalPreserved = diff.mapped.length;
  const totalRemoved = diff.removed.length;
  const totalNew = diff.new.length;
  const totalUnmapped = diff.unmapped.length;

  return (
    <>
      <div className={`bso${isOpen ? " open" : ""}`} onClick={closeSheet} />
      <div className={`bss${isOpen ? " open" : ""}`} style={{ maxHeight: "80vh" }}>
        <div className="bs-handle" />
        <div className="bs-hdr">
          <span className="bs-title">Restaurar: {currentSnapshot?.nombre}</span>
          <button className="btn btn-ghost btn-sm" onClick={closeSheet}>
            ✕
          </button>
        </div>
        <div className="bs-body">
          {error && (
            <div className="alert warn mb3">{error}</div>
          )}

          {/* Diff Summary */}
          <div className="restore-summary mb4 p3">
            <h4 className="mb2">Resumen de reconciliación</h4>
            <div className="summary-grid grid grid-cols-2 gap-2 text-sm">
              <div className="summary-item">
                <span className="summary-label">Preservados:</span>
                <span className="summary-value text-ok">{totalPreserved}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Quitados → FUERA:</span>
                <span className="summary-value text-err">{totalRemoved}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Nuevos → FUERA:</span>
                <span className="summary-value text-primary">{totalNew}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Ambiguos:</span>
                <span className="summary-value text-warn">{totalUnmapped}</span>
              </div>
            </div>
          </div>

          {/* Removed list */}
          {diff.removed.length > 0 && (
            <div className="restore-section mb3">
              <h5 className="text-sm font-bold text-err mb2">
                Quitados de la plantilla actual (irán a FUERA)
              </h5>
              <ul className="list-none p0 m0 text-sm">
                {diff.removed.map((r, i) => (
                  <li key={i} className="py1 border-b border-muted">
                    <span className="text-err">✕</span> {r.nombre}
                    <span className="text-muted ml2">
                      ({r.tramos_affected} tramo{r.tramos_affected !== 1 ? "s" : ""} afectado{r.tramos_affected !== 1 ? "s" : ""})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* New list */}
          {diff.new.length > 0 && (
            <div className="restore-section mb3">
              <h5 className="text-sm font-bold text-primary mb2">
                Nuevos en la plantilla actual (irán a FUERA)
              </h5>
              <ul className="list-none p0 m0 text-sm">
                {diff.new.map((n, i) => (
                  <li key={i} className="py1 border-b border-muted">
                    <span className="text-primary">+</span> {n.nombre}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Unmapped list */}
          {diff.unmapped.length > 0 && (
            <div className="restore-section mb3">
              <h5 className="text-sm font-bold text-warn mb2">
                Nombres ambiguos (no se pueden mapear)
              </h5>
              <ul className="list-none p0 m0 text-sm">
                {diff.unmapped.map((u, i) => (
                  <li key={i} className="py1 border-b border-muted">
                    <span className="text-warn">⚠</span> {u.nombre}
                    <span className="text-muted ml2">({u.reason})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Mapped list */}
          {diff.mapped.length > 0 && (
            <div className="restore-section mb3">
              <h5 className="text-sm font-bold mb2">
                Mapeados ({diff.mapped.length})
              </h5>
              <ul className="list-none p0 m0 text-sm">
                {diff.mapped.map((m, i) => (
                  <li key={i} className="py1 border-b border-muted">
                    {m.old_nombre}
                    {m.old_nombre !== m.new_nombre && (
                      <span className="text-muted"> → {m.new_nombre}</span>
                    )}
                  </li>
                ))}
              </ul>
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
            Esto reemplazará la planificación actual. Los pins se perderán.
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
