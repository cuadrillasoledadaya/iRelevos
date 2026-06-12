// ══════════════════════════════════════════════════════════════════
// TESTS — RestoreSheet.tsx (plan-history — single trabajadera)
// Restore snapshot with preview
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import RestoreSheet from "../RestoreSheet";
import type { PlanSnapshot, Trabajadera } from "@/lib/types";

// ── Mock stores ──────────────────────────────────────────────────

const mockCloseSheet = vi.fn();
const mockActiveSheet = "restore";
const mockCurrentSnapshot = { currentSnapshot: null as PlanSnapshot | null };
const mockRestorePreview = {
  restorePreview: null as {
    snapshotData: Trabajadera;
    snapshotId: string;
    currentHash: string;
  } | null,
  isLoading: false,
  error: null as string | null,
};

const mockUIStore = vi.fn((selector?: (s: any) => any) => {
  if (typeof selector === "function") {
    return selector({ activeSheet: mockActiveSheet });
  }
  return { closeSheet: mockCloseSheet, openSheet: vi.fn(), activeSheet: mockActiveSheet };
}) as any;
mockUIStore.getState = () => ({
  closeSheet: mockCloseSheet,
  openSheet: vi.fn(),
  activeSheet: mockActiveSheet,
});

const mockHistoryStore = vi.fn((selector?: (s: any) => any) => {
  if (typeof selector === "function") {
    return selector({ ...mockRestorePreview, currentSnapshot: mockCurrentSnapshot.currentSnapshot });
  }
  return { ...mockRestorePreview, currentSnapshot: mockCurrentSnapshot.currentSnapshot };
}) as any;
mockHistoryStore.getState = () => ({
  ...mockRestorePreview,
  currentSnapshot: mockCurrentSnapshot.currentSnapshot,
  applyRestore: vi.fn(),
});

vi.mock("@/stores", () => ({
  get uiStore() { return mockUIStore; },
  get historyStore() { return mockHistoryStore; },
}));

// ─ Helpers ──────────────────────────────────────────────────────

function makeTrabajadera(
  id: number,
  nombres: string[],
  tramos: string[],
  plan: Trabajadera["plan"]
): Trabajadera {
  return {
    id,
    nombres,
    roles: nombres.map(() => ({ pri: "COS_I" as const, sec: "FIJ_I" as const })),
    salidas: 2,
    tramos,
    bajas: [],
    regla5costaleros: false,
    plan,
    obj: Object.fromEntries(nombres.map((_, i) => [i, 2])),
    analisis: null,
    pinned: null,
    puntuaciones: {},
    tramosClaves: [],
  };
}

function makeSnapshot(overrides: Partial<PlanSnapshot> = {}): PlanSnapshot {
  return {
    id: "snap-1",
    proyecto_id: "proj-1",
    temporada_id: "temp-1",
    user_id: "user-1",
    trabajadera_id: 1,
    nombre: "Test Snapshot",
    created_at: "2026-06-11T10:00:00Z",
    plan_data: makeTrabajadera(1, ["A", "B", "C"], ["T1", "T2"], null),
    plan_summary: { status: "ok", salidas: 3, tramos: 2 },
    ...overrides,
  };
}

function renderRestoreSheet({
  snapshot,
  snapshotData,
}: {
  snapshot: PlanSnapshot;
  snapshotData: Trabajadera;
}) {
  mockCurrentSnapshot.currentSnapshot = snapshot;
  mockRestorePreview.restorePreview = {
    snapshotData,
    snapshotId: snapshot.id,
    currentHash: "hash-1",
  };
  mockRestorePreview.isLoading = false;
  mockRestorePreview.error = null;

  return render(<RestoreSheet />);
}

// ── Test suite ───────────────────────────────────────────────────

describe("RestoreSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows no preview message when restorePreview is null", () => {
    mockCurrentSnapshot.currentSnapshot = null;
    mockRestorePreview.restorePreview = null;
    mockRestorePreview.isLoading = false;

    render(<RestoreSheet />);

    expect(screen.getByText(/No hay previsualización disponible/)).toBeInTheDocument();
  });

  it("displays snapshot name in header", () => {
    const snap = makeSnapshot({ nombre: "Plan Junio 2026" });
    const trab = makeTrabajadera(1, ["A", "B", "C"], ["T1", "T2"], null);
    renderRestoreSheet({ snapshot: snap, snapshotData: trab });

    expect(screen.getByText(/Restaurar: Plan Junio 2026/)).toBeInTheDocument();
  });

  it("shows snapshot summary with trabajadera info", () => {
    const snap = makeSnapshot();
    const trab = makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1", "T2", "T3"], null);
    renderRestoreSheet({ snapshot: snap, snapshotData: trab });

    expect(screen.getByText(/Resumen de la instantánea/)).toBeInTheDocument();
    expect(screen.getByText(/Trabajadera:/)).toBeInTheDocument();
    expect(screen.getByText(/Costaleros activos:/)).toBeInTheDocument();
    expect(screen.getByText(/Tramos:/)).toBeInTheDocument();
  });

  it("lists costaleros in the snapshot", () => {
    const snap = makeSnapshot();
    const trab = makeTrabajadera(1, ["Pepe", "Ana", "Juan"], ["T1"], null);
    renderRestoreSheet({ snapshot: snap, snapshotData: trab });

    expect(screen.getByText(/Pepe/)).toBeInTheDocument();
    expect(screen.getByText(/Ana/)).toBeInTheDocument();
    expect(screen.getByText(/Juan/)).toBeInTheDocument();
  });

  it("shows apply and cancel buttons", () => {
    const snap = makeSnapshot();
    const trab = makeTrabajadera(1, ["A", "B"], ["T1"], null);
    renderRestoreSheet({ snapshot: snap, snapshotData: trab });

    expect(screen.getByText("Aplicar restauración")).toBeInTheDocument();
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
  });
});
