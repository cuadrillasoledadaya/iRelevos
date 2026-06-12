"use client";

import { uiStore, historyStore, projectStore } from "@/stores";
import { comparePlans, type CellComparison } from "@/lib/comparePlans";
import type { Trabajadera, PlanSnapshot, DatosPerfil } from "@/lib/types";

export default function CompareSheet() {
  const activeSheet = uiStore((s) => s.activeSheet);
  const closeSheet = uiStore.getState().closeSheet;
  const currentSnapshot = historyStore((s: { currentSnapshot: PlanSnapshot | null }) => s.currentSnapshot);
  const S = projectStore((s: { S: DatosPerfil }) => s.S);
  const isOpen = activeSheet === "compare";

  if (!currentSnapshot) {
    return (
      <>
        <div className={`bso${isOpen ? " open" : ""}`} onClick={closeSheet} />
        <div className={`bss${isOpen ? " open" : ""}`}>
          <div className="bs-handle" />
          <div className="bs-hdr">
            <span className="bs-title">Comparar</span>
            <button className="btn btn-ghost btn-sm" onClick={closeSheet}>
              ✕
            </button>
          </div>
          <div className="bs-body">
            <div className="p4 text-center text-muted">
              No se pudo cargar la instantánea para comparar.
            </div>
          </div>
        </div>
      </>
    );
  }

  const { nombre, created_at, plan_data, trabajadera_id } = currentSnapshot;
  const snapshotTrabajadera = plan_data;
  const currentTrabajadera = S.trabajaderas.find((t) => t.id === trabajadera_id) ?? null;

  // Compare single trabajadera
  const comparisons = comparePlans(
    snapshotTrabajadera ? [snapshotTrabajadera] : [],
    currentTrabajadera ? [currentTrabajadera] : [],
  );

  return (
    <>
      <div className={`bso${isOpen ? " open" : ""}`} onClick={closeSheet} />
      <div className={`bss${isOpen ? " open" : ""}`} style={{ maxHeight: "85vh" }}>
        <div className="bs-handle" />
        <div className="bs-hdr">
          <span className="bs-title">Comparar Instantánea</span>
          <button className="btn btn-ghost btn-sm" onClick={closeSheet}>
            ✕
          </button>
        </div>
        <div className="bs-body">
          {/* Legend */}
          <div className="compare-legend flex gap-3 mb3 p2 text-xs">
            <span><span className="dot-legend neutral" /> Igual</span>
            <span><span className="dot-legend removed" /> Quitado</span>
            <span><span className="dot-legend added" /> Nuevo</span>
            <span><span className="dot-legend mapped" /> Mismo costalero, distinto tramo</span>
          </div>

          <CompareTrabajadera
            snapT={snapshotTrabajadera}
            currT={currentTrabajadera}
            comparison={comparisons[0] ?? []}
            snapshotName={nombre}
            snapshotDate={created_at}
            snapshotTrabajaderaId={trabajadera_id}
          />
        </div>
      </div>
    </>
  );
}

// ── Side-by-side Trabajadera comparison ──────────────────────────

function CompareTrabajadera({
  snapT,
  currT,
  comparison,
  snapshotName,
  snapshotDate,
  snapshotTrabajaderaId,
}: {
  snapT: Trabajadera | null;
  currT: Trabajadera | null;
  comparison: CellComparison[][];
  snapshotName: string;
  snapshotDate: string;
  snapshotTrabajaderaId: number;
}) {
  const allNames = [...new Set([
    ...(snapT?.nombres ?? []),
    ...(currT?.nombres ?? []),
  ])];

  const allTramos = [...new Set([
    ...(snapT?.tramos ?? []),
    ...(currT?.tramos ?? []),
  ])];

  return (
    <div className="compare-trab mb4">
      {/* Column headers */}
      <div className="compare-columns-header flex gap-2 mb2 text-xs font-bold uppercase tracking-wider">
        <div className="f1 text-center text-muted">
          SNAPSHOT (T{snapshotTrabajaderaId} — {snapshotName} — {formatDateShort(snapshotDate)})
        </div>
        <div className="f1 text-center text-primary">ACTUAL (T{currT?.id ?? "—"})</div>
      </div>

      <div className="plan-scroll">
        <table className="plan-table compare-table">
          <thead>
            <tr>
              <th className="col-name">Costalero</th>
              {/* Snapshot columns */}
              {allTramos.map((tramo, ti) => (
                <th key={`s-${ti}`} className="col-tramo compare-snap">
                  <span title={tramo}>{tramo || `T${ti + 1}`}</span>
                </th>
              ))}
              {/* Current columns */}
              {allTramos.map((tramo, ti) => (
                <th key={`c-${ti}`} className="col-tramo compare-curr">
                  <span title={tramo}>{tramo || `T${ti + 1}`}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allNames.map((name, ci) => {
              const snapCi = snapT?.nombres.indexOf(name) ?? -1;
              const currCi = currT?.nombres.indexOf(name) ?? -1;

              return (
                <tr key={ci}>
                  <td className="td-name">
                    <span className="truncate">{shortName(name)}</span>
                  </td>
                  {/* Snapshot cells */}
                  {allTramos.map((_, ti) => {
                    const snapSlot = snapT?.plan?.[ti];
                    const isDentro = snapCi >= 0 && (snapSlot?.dentro.includes(snapCi) ?? false);
                    const isFuera = snapCi >= 0 && (snapSlot?.fuera.includes(snapCi) ?? false);
                    const label = snapCi >= 0 ? (isDentro ? "D" : isFuera ? "F" : "·") : "—";
                    const cls = snapCi >= 0
                      ? (isDentro ? "D" : isFuera ? "F" : "L")
                      : "L";

                    return (
                      <td key={`s-${ti}`}>
                        <div className={`pcell ${cls} compare-cell compare-snap-cell compare-${comparison[ci]?.[ti] ?? "neutral"}`}>
                          {label}
                        </div>
                      </td>
                    );
                  })}
                  {/* Current cells */}
                  {allTramos.map((_, ti) => {
                    const currSlot = currT?.plan?.[ti];
                    const isDentro = currCi >= 0 && (currSlot?.dentro.includes(currCi) ?? false);
                    const isFuera = currCi >= 0 && (currSlot?.fuera.includes(currCi) ?? false);
                    const label = currCi >= 0 ? (isDentro ? "D" : isFuera ? "F" : "·") : "—";
                    const cls = currCi >= 0
                      ? (isDentro ? "D" : isFuera ? "F" : "L")
                      : "L";

                    return (
                      <td key={`c-${ti}`}>
                        <div className={`pcell ${cls} compare-cell compare-curr-cell compare-${comparison[ci]?.[ti] ?? "neutral"}`}>
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
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 2) return full;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
