// ══════════════════════════════════════════════════════════════════
// TESTS — SnapshotDetailSheet.tsx (plan-history Slice 2 — single trabajadera)
// Read-only view of a snapshot's plan (tramo-by-tramo, dentro/fuera badges)
// ═════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import SnapshotDetailSheet from "../SnapshotDetailSheet";
import type { PlanSnapshot, Trabajadera } from "@/lib/types";

// ── Mock stores ──────────────────────────────────────────────────

const mockCloseSheet = vi.fn();
const mockActiveSheet = "detail";
const mockCurrentSnapshot = { currentSnapshot: null as PlanSnapshot | null };

const mockUIStore = vi.fn((selector?: (s: any) => any) => {
  if (typeof selector === "function") {
    return selector({ activeSheet: mockActiveSheet });
  }
  return {
    closeSheet: mockCloseSheet,
    openSheet: vi.fn(),
    activeSheet: mockActiveSheet,
  };
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

vi.mock("@/stores", () => ({
  get uiStore() {
    return mockUIStore;
  },
  get historyStore() {
    return mockHistoryStore;
  },
}));

// ── Helpers ──────────────────────────────────────────────────────

function makeSnapshot(
  trabajadera: Trabajadera,
  overrides: Partial<PlanSnapshot> = {}
): PlanSnapshot {
  return {
    id: "snap-1",
    proyecto_id: "proj-1",
    temporada_id: "temp-1",
    user_id: "user-1",
    trabajadera_id: trabajadera.id,
    nombre: "Test Snapshot",
    created_at: "2026-06-11T10:00:00Z",
    plan_data: trabajadera,
    plan_summary: {
      status: "ok",
      salidas: 3,
      tramos: trabajadera.tramos.length,
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

function renderSnapshotDetail(snapshot: PlanSnapshot) {
  mockCurrentSnapshot.currentSnapshot = snapshot;

  return render(<SnapshotDetailSheet />);
}

// ─ Test suite ───────────────────────────────────────────────────

describe("SnapshotDetailSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═════════════════════════════════════════════════════════════
  // Task 2.1: Renders read-only plan view with snapshot name
  // ═════════════════════════════════════════════════════════════

  describe("header and metadata", () => {
    it("displays snapshot name in the header", () => {
      const t = makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1"], makePlan(1, [[0, 1, 2, 3, 4]], [[]]));
      const snap = makeSnapshot(t, { nombre: "Mi Plan Especial" });

      renderSnapshotDetail(snap);

      expect(screen.getByText("Mi Plan Especial")).toBeInTheDocument();
    });

    it("displays snapshot date", () => {
      const t = makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1"], makePlan(1, [[0, 1, 2, 3, 4]], [[]]));
      const snap = makeSnapshot(t);

      renderSnapshotDetail(snap);

      // Date should be formatted (11/06/2026)
      expect(screen.getByText(/11\/06\/2026/)).toBeInTheDocument();
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Task 2.3: Renders plan table with dentro/fuera badges
  // ═════════════════════════════════════════════════════════════

  describe("plan table rendering", () => {
    it("renders tramo names as column headers", () => {
      const t = makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["Primer Tramo", "Segundo Tramo"], makePlan(2, [[0, 1, 2, 3, 4], [0, 1, 2, 3, 4]], [[], []]));
      const snap = makeSnapshot(t);

      renderSnapshotDetail(snap);

      expect(screen.getByText("Primer Tramo")).toBeInTheDocument();
      expect(screen.getByText("Segundo Tramo")).toBeInTheDocument();
    });

    it("renders costalero names in the first column", () => {
      const t = makeTrabajadera(1, ["Alice", "Bob", "Charlie", "Dana", "Eve"], ["T1"], makePlan(1, [[0, 1, 2, 3, 4]], [[]]));
      const snap = makeSnapshot(t);

      renderSnapshotDetail(snap);

      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText("Charlie")).toBeInTheDocument();
    });

    it("shows DENTRO badge for costaleros inside a tramo", () => {
      const t = makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1"], makePlan(1, [[0, 1, 2, 3, 4]], [[]]));
      const snap = makeSnapshot(t);

      renderSnapshotDetail(snap);

      // All costaleros are DENTRO in T1
      const dentroBadges = screen.getAllByText("D");
      expect(dentroBadges.length).toBeGreaterThanOrEqual(5);
    });

    it("shows FUERA badge for costaleros outside a tramo", () => {
      const t = makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1"], makePlan(1, [[0, 1, 2, 3]], [[4]]));
      const snap = makeSnapshot(t);

      renderSnapshotDetail(snap);

      // E (ci=4) is FUERA
      const fueraBadges = screen.getAllByText("F");
      expect(fueraBadges.length).toBeGreaterThanOrEqual(1);
    });

    it("shows working summary for single trabajadera", () => {
      const t = makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1", "T2"], makePlan(2, [[0, 1, 2, 3, 4], [0, 1, 2, 3, 4]], [[], []]));
      const snap = makeSnapshot(t);

      renderSnapshotDetail(snap);

      expect(screen.getByText(/5 act/)).toBeInTheDocument();
      expect(screen.getByText(/2 tramos/)).toBeInTheDocument();
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Read-only: no action buttons or editable elements
  // ═════════════════════════════════════════════════════════════

  describe("read-only behavior", () => {
    it("does not render any edit or calculate buttons", () => {
      const t = makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1"], makePlan(1, [[0, 1, 2, 3, 4]], [[]]));
      const snap = makeSnapshot(t);

      renderSnapshotDetail(snap);

      // No "Calcular" or edit buttons should exist
      expect(screen.queryByText(/Calcular/)).not.toBeInTheDocument();
    });

    it("does not render tramo add/remove controls", () => {
      const t = makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1"], makePlan(1, [[0, 1, 2, 3, 4]], [[]]));
      const snap = makeSnapshot(t);

      renderSnapshotDetail(snap);

      // No "+"/"-" buttons for tramo count
      const totalTramosLabel = screen.queryByText(/Total tramos/);
      expect(totalTramosLabel).not.toBeInTheDocument();
    });
  });
});
