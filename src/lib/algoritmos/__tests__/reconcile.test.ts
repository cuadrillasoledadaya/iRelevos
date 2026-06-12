// ══════════════════════════════════════════════════════════════════
// TESTS — reconcile algorithm (plan-history Slice 3)
// Pure function: maps snapshot names → current indices across temporadas
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { reconcile } from "../reconcile";
import type { Trabajadera, ReconcileDiff } from "@/lib/types";

// ── Helpers ──────────────────────────────────────────────────────

function makeTrabajadera(
  id: number,
  nombres: string[],
  tramos: string[],
  plan: Trabajadera["plan"],
  pinned: Trabajadera["pinned"] = null,
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
    pinned,
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

// ── Test suite ───────────────────────────────────────────────────

describe("reconcile", () => {
  // ═════════════════════════════════════════════════════════════
  // Task 3.1: Same temporada — identity mapping
  // ═════════════════════════════════════════════════════════════

  describe("same temporada (identity mapping)", () => {
    it("returns identity mapping when nombres are identical", () => {
      const plan = makePlan(2, [[0, 1, 2], [0, 1, 2]], [[3, 4], [3, 4]]);
      const snapshot: Trabajadera[] = [
        makeTrabajadera(1, ["Ana", "Beto", "Carlos", "Diana", "Elena"], ["T1", "T2"], plan),
      ];
      const current: Trabajadera[] = [
        makeTrabajadera(1, ["Ana", "Beto", "Carlos", "Diana", "Elena"], ["T1", "T2"], plan),
      ];

      const result = reconcile(snapshot, current);

      // All 5 costaleros mapped to same indices
      expect(result.mapped).toHaveLength(1);
      expect(result.mapped[0].plan).toBeDefined();
      const restoredT = result.mapped[0];
      expect(restoredT.nombres).toEqual(["Ana", "Beto", "Carlos", "Diana", "Elena"]);
      expect(restoredT.pinned).toBeNull();
      // Plan should be identical
      expect(restoredT.plan).toEqual(plan);
      // No removed, new, or unmapped
      expect(result.diff.removed).toHaveLength(0);
      expect(result.diff.new).toHaveLength(0);
      expect(result.diff.unmapped).toHaveLength(0);
    });

    it("resets pinned to null on restore", () => {
      const pinnedState: Trabajadera["pinned"] = [["L", "D"], ["F", "LS"]];
      const plan = makePlan(2, [[0, 1], [0, 1]], [[], []]);
      const snapshot: Trabajadera[] = [
        makeTrabajadera(1, ["Ana", "Beto"], ["T1", "T2"], plan, pinnedState),
      ];
      const current: Trabajadera[] = [
        makeTrabajadera(1, ["Ana", "Beto"], ["T1", "T2"], plan),
      ];

      const result = reconcile(snapshot, current);

      expect(result.mapped[0].pinned).toBeNull();
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Task 3.2: Cross-temporada — name remapping
  // ═════════════════════════════════════════════════════════════

  describe("cross-temporada (name remapping)", () => {
    it("remaps names when indices differ between snapshot and current", () => {
      // Snapshot: Ana=0, Beto=1, Carlos=2
      // Current:  Carlos=0, Ana=1, Beto=2
      const snapPlan = makePlan(1, [[0, 1, 2]], [[]]);
      const currPlan = makePlan(1, [[0, 1, 2]], [[]]);
      const snapshot: Trabajadera[] = [
        makeTrabajadera(1, ["Ana", "Beto", "Carlos"], ["T1"], snapPlan),
      ];
      const current: Trabajadera[] = [
        makeTrabajadera(1, ["Carlos", "Ana", "Beto"], ["T1"], currPlan),
      ];

      const result = reconcile(snapshot, current);

      // All 3 names should be mapped
      expect(result.mapped).toHaveLength(1);
      const restoredT = result.mapped[0];
      // The restored plan should use current indices
      // Ana was ci=0 in snapshot, now ci=1 in current
      // Beto was ci=1 in snapshot, now ci=2 in current
      // Carlos was ci=2 in snapshot, now ci=0 in current
      // In snapshot, all 3 were DENTRO in T1
      // So in restored plan, remapped indices should all be DENTRO
      // Ana(0→1), Beto(1→2), Carlos(2→0) → [1, 2, 0]
      expect(restoredT.plan![0].dentro).toEqual([1, 2, 0]);
      expect(restoredT.plan![0].fuera).toEqual([]);
      // Mapped entries track the remapping
      expect(result.diff.mapped).toHaveLength(3);
    });

    it("places removed costaleros in FUERA", () => {
      // Snapshot: Ana, Beto, Carlos (all DENTRO)
      // Current:  Ana, Beto (Carlos removed from roster)
      const snapPlan = makePlan(1, [[0, 1, 2]], [[]]);
      const currPlan = makePlan(1, [[0, 1]], [[], []]);
      const snapshot: Trabajadera[] = [
        makeTrabajadera(1, ["Ana", "Beto", "Carlos"], ["T1"], snapPlan),
      ];
      const current: Trabajadera[] = [
        makeTrabajadera(1, ["Ana", "Beto"], ["T1"], currPlan),
      ];

      const result = reconcile(snapshot, current);

      // Carlos should be in diff.removed
      expect(result.diff.removed).toHaveLength(1);
      expect(result.diff.removed[0].nombre).toBe("Carlos");
      // Carlos's index should map to FUERA in restored plan
      const restoredT = result.mapped[0];
      // Carlos was ci=2 in snapshot, but doesn't exist in current (only 2 names)
      // So ci=2 should be in fuera
      expect(restoredT.plan![0].fuera).toContain(2);
    });

    it("places new costaleros in FUERA", () => {
      // Snapshot: Ana, Beto (both DENTRO)
      // Current:  Ana, Beto, Carlos (Carlos is new)
      const snapPlan = makePlan(1, [[0, 1]], [[]]);
      const currPlan = makePlan(1, [[0, 1]], [[2], [2]]);
      const snapshot: Trabajadera[] = [
        makeTrabajadera(1, ["Ana", "Beto"], ["T1"], snapPlan),
      ];
      const current: Trabajadera[] = [
        makeTrabajadera(1, ["Ana", "Beto", "Carlos"], ["T1"], currPlan),
      ];

      const result = reconcile(snapshot, current);

      // Carlos should be in diff.new
      expect(result.diff.new).toHaveLength(1);
      expect(result.diff.new[0].nombre).toBe("Carlos");
      // Carlos (ci=2) should be in FUERA in restored plan
      const restoredT = result.mapped[0];
      expect(restoredT.plan![0].fuera).toContain(2);
    });

    it("handles NFD normalization (accented names)", () => {
      // Snapshot: "José" (with accent)
      // Current: "Jose" (without accent) — should match
      const snapPlan = makePlan(1, [[0]], [[]]);
      const currPlan = makePlan(1, [[0]], [[]]);
      const snapshot: Trabajadera[] = [
        makeTrabajadera(1, ["José"], ["T1"], snapPlan),
      ];
      const current: Trabajadera[] = [
        makeTrabajadera(1, ["Jose"], ["T1"], currPlan),
      ];

      const result = reconcile(snapshot, current);

      expect(result.diff.removed).toHaveLength(0);
      expect(result.diff.new).toHaveLength(0);
      expect(result.mapped).toHaveLength(1);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Task 3.3: Ambiguous names
  // ═════════════════════════════════════════════════════════════

  describe("ambiguous names", () => {
    it("marks duplicate normalized names as unmapped", () => {
      // Snapshot: "Pepe" appears twice at indices 0 and 2
      const snapPlan = makePlan(1, [[0, 1, 2]], [[3], [3]]);
      const currPlan = makePlan(1, [[0, 1]], [[2, 3], [2, 3]]);
      const snapshot: Trabajadera[] = [
        makeTrabajadera(1, ["Pepe", "Ana", "Pepe", "Beto"], ["T1"], snapPlan),
      ];
      const current: Trabajadera[] = [
        makeTrabajadera(1, ["Pepe", "Ana", "Carlos", "Diana"], ["T1"], currPlan),
      ];

      const result = reconcile(snapshot, current);

      // Both "Pepe" instances should be unmapped (ambiguous)
      expect(result.diff.unmapped).toHaveLength(2);
      expect(result.diff.unmapped.every((u) => u.reason === "ambiguous")).toBe(true);
      expect(result.diff.unmapped.map((u) => u.nombre)).toContain("Pepe");
      // Ana should still be mapped normally
      expect(result.diff.mapped.some((m) => m.old_nombre === "Ana")).toBe(true);
    });

    it("drops unmapped indices from the plan (maps to FUERA)", () => {
      const snapPlan = makePlan(1, [[0, 1]], [[2], [2]]);
      const currPlan = makePlan(1, [[0]], [[1, 2], [1, 2]]);
      const snapshot: Trabajadera[] = [
        makeTrabajadera(1, ["Pepe", "Pepe", "Ana"], ["T1"], snapPlan),
      ];
      const current: Trabajadera[] = [
        makeTrabajadera(1, ["Pepe", "Ana", "Beto"], ["T1"], currPlan),
      ];

      const result = reconcile(snapshot, current);

      // Both Pepe instances are ambiguous
      expect(result.diff.unmapped).toHaveLength(2);
      // In restored plan, indices 0 and 1 (the two Pepes) should be in FUERA
      const restoredT = result.mapped[0];
      expect(restoredT.plan![0].fuera).toContain(0);
      expect(restoredT.plan![0].fuera).toContain(1);
      // Ana (ci=2 in snapshot) maps to ci=1 in current, and was FUERA in snapshot
      // So she stays FUERA
      expect(restoredT.plan![0].fuera).toContain(1);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Edge cases
  // ═════════════════════════════════════════════════════════════

  describe("edge cases", () => {
    it("handles empty snapshot", () => {
      const snapshot: Trabajadera[] = [];
      const current: Trabajadera[] = [
        makeTrabajadera(1, ["Ana", "Beto"], ["T1"], makePlan(1, [[0, 1]], [[]])),
      ];

      const result = reconcile(snapshot, current);

      expect(result.mapped).toHaveLength(0);
    });

    it("handles empty current", () => {
      const snapshot: Trabajadera[] = [
        makeTrabajadera(1, ["Ana", "Beto"], ["T1"], makePlan(1, [[0, 1]], [[]])),
      ];
      const current: Trabajadera[] = [];

      const result = reconcile(snapshot, current);

      // All snapshot names should be removed
      expect(result.diff.removed).toHaveLength(2);
      expect(result.mapped).toHaveLength(1);
      // Restored plan has all in FUERA since no current names
      const restoredT = result.mapped[0];
      expect(restoredT.plan![0].fuera).toEqual([0, 1]);
      expect(restoredT.plan![0].dentro).toEqual([]);
    });

    it("handles multiple trabajaderas", () => {
      const plan1 = makePlan(1, [[0, 1]], [[2], [2]]);
      const plan2 = makePlan(1, [[0]], [[1], [1]]);
      const snapshot: Trabajadera[] = [
        makeTrabajadera(1, ["Ana", "Beto", "Carlos"], ["T1"], plan1),
        makeTrabajadera(2, ["Diana", "Elena"], ["T1"], plan2),
      ];
      const current: Trabajadera[] = [
        makeTrabajadera(1, ["Ana", "Beto", "Carlos"], ["T1"], plan1),
        makeTrabajadera(2, ["Diana", "Elena"], ["T1"], plan2),
      ];

      const result = reconcile(snapshot, current);

      expect(result.mapped).toHaveLength(2);
      expect(result.diff.removed).toHaveLength(0);
      expect(result.diff.new).toHaveLength(0);
      expect(result.diff.unmapped).toHaveLength(0);
    });

    it("handles null plan in snapshot", () => {
      const snapshot: Trabajadera[] = [
        makeTrabajadera(1, ["Ana", "Beto"], ["T1"], null),
      ];
      const current: Trabajadera[] = [
        makeTrabajadera(1, ["Ana", "Beto"], ["T1"], makePlan(1, [[0, 1]], [[]])),
      ];

      const result = reconcile(snapshot, current);

      expect(result.mapped).toHaveLength(1);
      // Null plan should produce empty slots matching current tramos
      expect(result.mapped[0].plan).toEqual([{ dentro: [], fuera: [] }]);
    });

    it("tracks tramos_affected for removed costaleros", () => {
      const snapPlan = makePlan(3, [[0], [0], [0]], [[], [], []]);
      const currPlan = makePlan(3, [[], [], []], [[0], [0], [0]]);
      const snapshot: Trabajadera[] = [
        makeTrabajadera(1, ["Ana", "Beto"], ["T1", "T2", "T3"], snapPlan),
      ];
      const current: Trabajadera[] = [
        makeTrabajadera(1, ["Beto"], ["T1", "T2", "T3"], currPlan),
      ];

      const result = reconcile(snapshot, current);

      // Ana removed, was DENTRO in all 3 tramos
      expect(result.diff.removed).toHaveLength(1);
      expect(result.diff.removed[0].nombre).toBe("Ana");
      expect(result.diff.removed[0].tramos_affected).toBe(3);
    });
  });
});
