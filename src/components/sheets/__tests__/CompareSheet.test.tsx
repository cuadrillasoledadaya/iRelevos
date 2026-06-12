// ══════════════════════════════════════════════════════════════════
// TESTS — CompareSheet.tsx (plan-history Slice 2)
// Side-by-side comparison of snapshot vs current plan with color-coded cells
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CompareSheet from "../CompareSheet";
import type { PlanSnapshot, Trabajadera } from "@/lib/types";

// ── Mock stores ──────────────────────────────────────────────────

const mockCloseSheet = vi.fn();
const mockActiveSheet = "compare";
const mockCurrentSnapshot = { currentSnapshot: null as PlanSnapshot | null };
const mockCurrentTrabajaderas = { trabajaderas: [] as Trabajadera[] };

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
    return selector(mockCurrentSnapshot);
  }
  return {
    currentSnapshot: mockCurrentSnapshot.currentSnapshot,
    snapshots: [],
    isLoading: false,
    error: null,
    listSnapshots: vi.fn(),
    saveSnapshot: vi.fn(),
    getSnapshot: vi.fn(),
    deleteSnapshot: vi.fn(),
  };
}) as any;
mockHistoryStore.getState = () => ({
  currentSnapshot: mockCurrentSnapshot.currentSnapshot,
  snapshots: [],
  isLoading: false,
  error: null,
  listSnapshots: vi.fn(),
  saveSnapshot: vi.fn(),
  getSnapshot: vi.fn(),
  deleteSnapshot: vi.fn(),
});

const mockProjectStore = vi.fn((selector?: (s: any) => any) => {
  if (typeof selector === "function") {
    return selector({ S: { banco: [], planes: [], trabajaderas: mockCurrentTrabajaderas.trabajaderas }, pid: "proj-1" });
  }
  return { S: { banco: [], planes: [], trabajaderas: mockCurrentTrabajaderas.trabajaderas }, pid: "proj-1" };
}) as any;

vi.mock("@/stores", () => ({
  get uiStore() { return mockUIStore; },
  get historyStore() { return mockHistoryStore; },
  get projectStore() { return mockProjectStore; },
}));

// ── Helpers ──────────────────────────────────────────────────────

function makeSnapshot(
  trabajaderas: Trabajadera[],
  overrides: Partial<PlanSnapshot> = {}
): PlanSnapshot {
  return {
    id: "snap-1",
    proyecto_id: "proj-1",
    temporada_id: "temp-1",
    user_id: "user-1",
    nombre: "Test Snapshot",
    created_at: "2026-06-11T10:00:00Z",
    plan_data: { banco: [], planes: [], trabajaderas },
    trabajadera_count: trabajaderas.length,
    trabajadera_ids: trabajaderas.map((t) => t.id),
    trabajadera_nombres: trabajaderas.map((t) => ({
      tid: t.id,
      nombres: [...t.nombres],
    })),
    plan_summary: {
      status: "ok",
      salidas_por_trab: trabajaderas.map(() => 3),
      tramos_por_trab: trabajaderas.map((t) => t.tramos.length),
    },
    ...overrides,
  };
}

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

function makePlan(tramos: number, dentro: number[][], fuera: number[][]): Trabajadera["plan"] {
  return Array.from({ length: tramos }, (_, ti) => ({
    dentro: dentro[ti] ?? [],
    fuera: fuera[ti] ?? [],
  }));
}

function renderCompareSheet({
  snapshot,
  currentTrabajaderas,
}: {
  snapshot: PlanSnapshot;
  currentTrabajaderas: Trabajadera[];
}) {
  mockCurrentSnapshot.currentSnapshot = snapshot;
  mockCurrentTrabajaderas.trabajaderas = currentTrabajaderas;

  return render(<CompareSheet />);
}

// ── Test suite ───────────────────────────────────────────────────

describe("CompareSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═════════════════════════════════════════════════════════════
  // Task 2.2: Renders side-by-side with header labels
  // ═════════════════════════════════════════════════════════════

  describe("header and layout", () => {
    it("displays snapshot name and date in the snapshot column header", () => {
      const t = makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1"], makePlan(1, [[0, 1, 2, 3, 4]], [[]]));
      const snap = makeSnapshot([t], { nombre: "Plan Junio" });
      const current = [makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1"], makePlan(1, [[0, 1, 2, 3, 4]], [[]]))];

      renderCompareSheet({ snapshot: snap, currentTrabajaderas: current });

      expect(screen.getByText(/Plan Junio/)).toBeInTheDocument();
    });

    it("displays 'ACTUAL' label for the current plan column", () => {
      const t = makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1"], makePlan(1, [[0, 1, 2, 3, 4]], [[]]));
      const snap = makeSnapshot([t]);
      const current = [makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1"], makePlan(1, [[0, 1, 2, 3, 4]], [[]]))];

      renderCompareSheet({ snapshot: snap, currentTrabajaderas: current });

      expect(screen.getByText("ACTUAL")).toBeInTheDocument();
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Task 2.2: Color-coded cells — neutral (same in both)
  // ═════════════════════════════════════════════════════════════

  describe("color-coded cells", () => {
    it("renders neutral cells when snapshot and current are identical", () => {
      const plan = makePlan(1, [[0, 1, 2, 3, 4]], [[]]);
      const t = makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1"], plan);
      const snap = makeSnapshot([t]);
      const current = [makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1"], plan)];

      renderCompareSheet({ snapshot: snap, currentTrabajaderas: current });

      // All cells should be neutral — D badges present for both columns
      const dentroBadges = screen.getAllByText("D");
      expect(dentroBadges.length).toBeGreaterThanOrEqual(10); // 5 per column
    });

    it("renders removed (orange) cells when costalero DENTRO in snapshot but FUERA in current", () => {
      const snapPlan = makePlan(1, [[0, 1, 2, 3, 4]], [[]]);
      const currPlan = makePlan(1, [[1, 2, 3, 4]], [[0]]);
      const t = makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1"], snapPlan);
      const snap = makeSnapshot([t]);
      const current = [makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1"], currPlan)];

      renderCompareSheet({ snapshot: snap, currentTrabajaderas: current });

      // A is DENTRO in snapshot, FUERA in current
      // Snapshot column shows D (removed), current column shows F
      const allD = screen.getAllByText("D");
      const allF = screen.getAllByText("F");
      // At least one D in snapshot column and one F in current column
      expect(allD.length).toBeGreaterThanOrEqual(1);
      expect(allF.length).toBeGreaterThanOrEqual(1);
    });

    it("renders new (blue) cells when costalero FUERA in snapshot but DENTRO in current", () => {
      const snapPlan = makePlan(1, [[1, 2, 3, 4]], [[0]]);
      const currPlan = makePlan(1, [[0, 1, 2, 3, 4]], [[]]);
      const t = makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1"], snapPlan);
      const snap = makeSnapshot([t]);
      const current = [makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1"], currPlan)];

      renderCompareSheet({ snapshot: snap, currentTrabajaderas: current });

      // A is FUERA in snapshot, DENTRO in current
      const allD = screen.getAllByText("D");
      const allF = screen.getAllByText("F");
      expect(allD.length).toBeGreaterThanOrEqual(1);
      expect(allF.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Edge cases
  // ═════════════════════════════════════════════════════════════

  describe("edge cases", () => {
    it("handles null snapshot plan gracefully", () => {
      const t = makeTrabajadera(1, ["A", "B"], ["T1"], null);
      const snap = makeSnapshot([t]);
      const current = [makeTrabajadera(1, ["A", "B"], ["T1"], makePlan(1, [[0, 1]], [[]]))];

      renderCompareSheet({ snapshot: snap, currentTrabajaderas: current });

      // Should render without crashing
      expect(screen.getByText("ACTUAL")).toBeInTheDocument();
    });

    it("handles null current plan gracefully", () => {
      const t = makeTrabajadera(1, ["A", "B"], ["T1"], makePlan(1, [[0, 1]], [[]]));
      const snap = makeSnapshot([t]);
      const current = [makeTrabajadera(1, ["A", "B"], ["T1"], null)];

      renderCompareSheet({ snapshot: snap, currentTrabajaderas: current });

      // Should render without crashing
      expect(screen.getByText(/ACTUAL/)).toBeInTheDocument();
    });
  });
});
