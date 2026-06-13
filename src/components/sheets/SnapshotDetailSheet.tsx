"use client";

import { uiStore, historyStore } from "@/stores";
import type { Trabajadera, PlanSnapshot } from "@/lib/types";

export default function SnapshotDetailSheet() {
  const activeSheet = uiStore((s) => s.activeSheet);
  const closeSheet = uiStore.getState().closeSheet;
  const currentSnapshot = historyStore((s: { currentSnapshot: PlanSnapshot | null }) => s.currentSnapshot);
  const isOpen = activeSheet === "detail";

  if (!currentSnapshot) {
    return (
      <>
        <div className={`bso${isOpen ? " open" : ""}`} onClick={closeSheet} />
        <div className={`bss${isOpen ? " open" : ""}`}>
          <div className="bs-handle" />
          <div className="bs-hdr">
            <span className="bs-title">Detalle</span>
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm" onClick={() => uiStore.getState().openSheet("history")}>
                ← Volver
              </button>
              <button className="btn btn-ghost btn-sm" onClick={closeSheet}>
                ✕
              </button>
            </div>
          </div>
          <div className="bs-body">
            <div className="p4 text-center text-muted">
              No se pudo cargar la instantánea.
            </div>
          </div>
        </div>
      </>
    );
  }

  const { nombre, created_at, plan_data, trabajadera_id } = currentSnapshot;

  return (
    <>
      <div className={`bso${isOpen ? " open" : ""}`} onClick={closeSheet} />
      <div className={`bss${isOpen ? " open" : ""}`} style={{ maxHeight: "80vh" }}>
        <div className="bs-handle" />
        <div className="bs-hdr">
          <span className="bs-title">{nombre}</span>
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => uiStore.getState().openSheet("history")}>
              ← Volver
            </button>
            <span className="text-muted text-xs">{formatDate(created_at)}</span>
            <button className="btn btn-ghost btn-sm" onClick={closeSheet}>
              ✕
            </button>
          </div>
        </div>
        <div className="bs-body">
          <SnapshotTrabajadera t={plan_data} snapshotTrabajaderaId={trabajadera_id} />
        </div>
      </div>
    </>
  );
}

// ── Read-only Trabajadera view ───────────────────────────────────

function SnapshotTrabajadera({ t, snapshotTrabajaderaId }: { t: Trabajadera; snapshotTrabajaderaId: number }) {
  const plan = t.plan;
  const nBajas = t.bajas?.length ?? 0;
  const nActivos = t.nombres.length - nBajas;

  return (
    <div className="snapshot-trab">
      <div className="snapshot-trab-header">
        <div className="t-badge">{snapshotTrabajaderaId}</div>
        <div className="t-info">
          <div className="t-name">Trabajadera {snapshotTrabajaderaId}</div>
          <div className="t-meta">
            {nActivos} act. · {t.tramos.length} tramos
          </div>
        </div>
      </div>

      {plan && plan.length > 0 && (
        <div className="plan-scroll">
          <table className="plan-table">
            <thead>
              <tr>
                <th className="col-name">Costalero</th>
                {t.tramos.map((tramoName, ti) => (
                  <th key={ti} className="col-tramo">
                    <span title={tramoName}>
                      {tramoName || `T${ti + 1}`}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.nombres.map((name, ci) => {
                if (t.bajas?.includes(ci)) return null;
                return (
                  <tr key={ci}>
                    <td className="td-name">
                      <span className="truncate">{shortName(name)}</span>
                    </td>
                    {t.tramos.map((_, ti) => {
                      const slot = plan[ti];
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
      )}

      {!plan && (
        <div className="p3 text-center text-muted">
          Sin plan calculado en esta instantánea.
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 2) return full;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}
