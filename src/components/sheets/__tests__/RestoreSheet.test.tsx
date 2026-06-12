// ══════════════════════════════════════════════════════════════════
// TESTS — RestoreSheet.tsx (plan-history)
// Restore snapshot with reconciliation preview
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import RestoreSheet from "../RestoreSheet";
import type { PlanSnapshot, ReconcileDiff, Trabajadera } from "@/lib/types";

// ── Mock stores ──────────────────────────────────────────────────

const mockCloseSheet = vi.fn();
const mockActiveSheet = "restore";
const mockCurrentSnapshot = { currentSnapshot: null as PlanSnapshot | null };
const mockRestorePreview = {
  restorePreview: null as {
    mapped: Trabajadera[];
    diff: ReconcileDiff;
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

const mockProjectStore = vi.fn((selector?: (s: any) => any) => {
  if (typeof selector === "function") {
    return selector({ S: { trabajaderas: [] } });
  }
  return { S: { trabajaderas: [] } };
}) as any;

vi.mock("@/stores", () => ({
  get uiStore() { return mockUIStore; },
  get historyStore() { return mockHistoryStore; },
  get projectStore() { return mockProjectStore; },
}));

// ── Helpers ──────────────────────────────────────────────────────

function makeSnapshot(overrides: Partial<PlanSnapshot> = {}): PlanSnapshot {
  return {
    id: "snap-1",
    proyecto_id: "proj-1",
    temporada_id: "temp-1",
    user_id: "user-1",
    nombre: "Test Snapshot",
    created_at: "2026-06-11T10:00:00Z",
    plan_data: { banco: [], planes: [], trabajaderas: [] },
    trabajadera_count: 0,
    trabajadera_ids: [],
    trabajadera_nombres: [],
    plan_summary: { status: "ok", salidas_por_trab: [], tramos_por_trab: [] },
    ...overrides,
  };
}

function makeDiff(overrides: Partial<ReconcileDiff> = {}): ReconcileDiff {
  return {
    removed: [],
    new: [],
    mapped: [],
    unmapped: [],
    ...overrides,
  };
}

function renderRestoreSheet({
  snapshot,
  diff,
}: {
  snapshot: PlanSnapshot;
  diff: ReconcileDiff;
}) {
  mockCurrentSnapshot.currentSnapshot = snapshot;
  mockRestorePreview.restorePreview = {
    mapped: [],
    diff,
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
    const diff = makeDiff();
    renderRestoreSheet({ snapshot: snap, diff });

    expect(screen.getByText(/Restaurar: Plan Junio 2026/)).toBeInTheDocument();
  });

  it("shows reconciliation summary counts", () => {
    const snap = makeSnapshot();
    const diff = makeDiff({
      removed: [{ tid: 1, idx: 0, nombre: "Pepe", tramos_affected: 2 }],
      new: [{ tid: 1, idx: 3, nombre: "Maria" }],
      mapped: [{ tid: 1, old_nombre: "Juan", new_nombre: "Juan", old_idx: 0, new_idx: 1 }],
      unmapped: [{ tid: 1, idx: 2, nombre: "Duplicate", reason: "ambiguous" }],
    });
    renderRestoreSheet({ snapshot: snap, diff });

    // Summary section has the counts
    expect(screen.getByText(/Resumen de reconciliación/)).toBeInTheDocument();
    expect(screen.getByText(/Preservados:/)).toBeInTheDocument();
    expect(screen.getByText(/Quitados → FUERA:/)).toBeInTheDocument();
    expect(screen.getByText(/Nuevos → FUERA:/)).toBeInTheDocument();
    expect(screen.getByText(/Ambiguos:/)).toBeInTheDocument();
    // Check mapped count in the mapped section header
    expect(screen.getByText(/Mapeados \(1\)/)).toBeInTheDocument();
  });

  it("lists removed costaleros", () => {
    const snap = makeSnapshot();
    const diff = makeDiff({
      removed: [
        { tid: 1, idx: 0, nombre: "Pepe", tramos_affected: 3 },
        { tid: 1, idx: 1, nombre: "Ana", tramos_affected: 1 },
      ],
    });
    renderRestoreSheet({ snapshot: snap, diff });

    expect(screen.getByText(/Pepe/)).toBeInTheDocument();
    expect(screen.getByText(/Ana/)).toBeInTheDocument();
    expect(screen.getByText(/3 tramos afectados/)).toBeInTheDocument();
  });

  it("shows apply and cancel buttons", () => {
    const snap = makeSnapshot();
    const diff = makeDiff();
    renderRestoreSheet({ snapshot: snap, diff });

    expect(screen.getByText("Aplicar restauración")).toBeInTheDocument();
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
  });
});
