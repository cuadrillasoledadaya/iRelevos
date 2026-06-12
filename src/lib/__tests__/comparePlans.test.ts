// ══════════════════════════════════════════════════════════════════
// TESTS — comparePlans utility (plan-history Slice 2)
// Pure function: compares snapshot trabajaderas vs current trabajaderas
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { comparePlans, type CellComparison } from "../comparePlans";
import type { Trabajadera } from "@/lib/types";

// ── Helpers ──────────────────────────────────────────────────────

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

// ── Test suite ───────────────────────────────────────────────────

describe("comparePlans", () => {
  // ═════════════════════════════════════════════════════════════
  // Task 2.1: Neutral cells — same costalero in both snapshot and current
  // ═════════════════════════════════════════════════════════════

  describe("neutral cells (same in both)", () => {
    it("returns 'neutral' when same costalero is DENTRO in both", () => {
      const plan = makePlan(2, [[0, 1, 2, 3, 4], [0, 1, 2, 3, 4]], [[], []]);
      const snapshot: Trabajadera[] = [makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1", "T2"], plan)];
      const current: Trabajadera[] = [makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1", "T2"], plan)];

      const result = comparePlans(snapshot, current);

      // A (ci=0) in T1 (ti=0): DENTRO in both → neutral
      const cellA_T1 = result[0]?.[0]?.[0]; // [trabIdx][ci][ti]
      expect(cellA_T1).toBe("neutral");

      // B (ci=1) in T2 (ti=1): DENTRO in both → neutral
      const cellB_T2 = result[0]?.[1]?.[1];
      expect(cellB_T2).toBe("neutral");
    });

    it("returns 'neutral' when same costalero is FUERA in both", () => {
      const snapPlan = makePlan(2, [[0, 1, 2, 3], [0, 1, 2, 3]], [[4], [4]]);
      const currPlan = makePlan(2, [[0, 1, 2, 3], [0, 1, 2, 3]], [[4], [4]]);
      const snapshot: Trabajadera[] = [makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1", "T2"], snapPlan)];
      const current: Trabajadera[] = [makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1", "T2"], currPlan)];

      const result = comparePlans(snapshot, current);

      // E (ci=4) in T1: FUERA in both → neutral
      const cellE_T1 = result[0]?.[4]?.[0];
      expect(cellE_T1).toBe("neutral");
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Task 2.2: Orange cells — removed from snapshot (DENTRO in snap, FUERA/null in current)
  // ═════════════════════════════════════════════════════════════

  describe("orange cells (removed from snapshot)", () => {
    it("returns 'removed' when costalero is DENTRO in snapshot but FUERA in current", () => {
      const snapPlan = makePlan(2, [[0, 1, 2, 3, 4], [0, 1, 2, 3, 4]], [[], []]);
      const currPlan = makePlan(2, [[1, 2, 3, 4], [1, 2, 3, 4]], [[0], [0]]);
      const snapshot: Trabajadera[] = [makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1", "T2"], snapPlan)];
      const current: Trabajadera[] = [makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1", "T2"], currPlan)];

      const result = comparePlans(snapshot, current);

      // A (ci=0) in T1: DENTRO in snap, FUERA in current → removed (orange)
      const cellA_T1 = result[0]?.[0]?.[0];
      expect(cellA_T1).toBe("removed");
    });

    it("returns 'removed' when costalero is DENTRO in snapshot but not in current trabajadera", () => {
      const snapPlan = makePlan(1, [[0, 1, 2, 3, 4]], [[]]);
      const currPlan = makePlan(1, [[0, 1, 2, 3]], [[4]]);
      const snapshot: Trabajadera[] = [makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1"], snapPlan)];
      // Current has only 4 costaleros (E removed from roster)
      const current: Trabajadera[] = [makeTrabajadera(1, ["A", "B", "C", "D"], ["T1"], currPlan)];

      const result = comparePlans(snapshot, current);

      // E (ci=4) exists in snapshot but not in current → removed
      const cellE_T1 = result[0]?.[4]?.[0];
      expect(cellE_T1).toBe("removed");
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Task 2.2: Blue cells — new in current (FUERA in snap, DENTRO in current)
  // ═════════════════════════════════════════════════════════════

  describe("blue cells (new in current)", () => {
    it("returns 'new' when costalero is FUERA in snapshot but DENTRO in current", () => {
      const snapPlan = makePlan(2, [[0, 1, 2, 3], [0, 1, 2, 3]], [[4], [4]]);
      const currPlan = makePlan(2, [[0, 1, 2, 3, 4], [0, 1, 2, 3, 4]], [[], []]);
      const snapshot: Trabajadera[] = [makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1", "T2"], snapPlan)];
      const current: Trabajadera[] = [makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1", "T2"], currPlan)];

      const result = comparePlans(snapshot, current);

      // E (ci=4) in T1: FUERA in snap, DENTRO in current → new (blue)
      const cellE_T1 = result[0]?.[4]?.[0];
      expect(cellE_T1).toBe("new");
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Task 2.2: Purple cells — mapped, different person at same index
  // ═════════════════════════════════════════════════════════════

  describe("purple cells (mapped, different person)", () => {
    it("returns 'neutral' when same costalero is DENTRO in both at same index", () => {
      // Same names at same indices, different plan order — still neutral
      const snapPlan = makePlan(1, [[0, 1, 2, 3, 4]], [[]]);
      const currPlan = makePlan(1, [[4, 1, 2, 3, 0]], [[]]);
      const snapshot: Trabajadera[] = [makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1"], snapPlan)];
      const current: Trabajadera[] = [makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1"], currPlan)];

      const result = comparePlans(snapshot, current);

      // A (ci=0): same index in both → neutral
      const cellA_T1 = result[0]?.[0]?.[0];
      expect(cellA_T1).toBe("neutral");

      // E (ci=4): same index in both → neutral
      const cellE_T1 = result[0]?.[4]?.[0];
      expect(cellE_T1).toBe("neutral");

      // B (ci=1): same index in both → neutral
      const cellB_T1 = result[0]?.[1]?.[0];
      expect(cellB_T1).toBe("neutral");
    });

    it("returns 'mapped' when same costalero exists at different indices (cross-temporada)", () => {
      // A moved from index 0 to index 4, E moved from index 4 to index 0
      const snapPlan = makePlan(1, [[0, 1, 2, 3, 4]], [[]]);
      const currPlan = makePlan(1, [[4, 1, 2, 3, 0]], [[]]);
      const snapshot: Trabajadera[] = [makeTrabajadera(1, ["A", "B", "C", "D", "E"], ["T1"], snapPlan)];
      // Different order: E is now at index 0, A at index 4
      const current: Trabajadera[] = [makeTrabajadera(1, ["E", "B", "C", "D", "A"], ["T1"], currPlan)];

      const result = comparePlans(snapshot, current);

      // A: index 0 in snapshot, index 4 in current → mapped
      const cellA = result[0]?.[0]?.[0];
      expect(cellA).toBe("mapped");

      // E: index 4 in snapshot, index 0 in current → mapped
      const cellE = result[0]?.[4]?.[0];
      expect(cellE).toBe("mapped");

      // B, C, D: same index in both → neutral
      expect(result[0]?.[1]?.[0]).toBe("neutral");
      expect(result[0]?.[2]?.[0]).toBe("neutral");
      expect(result[0]?.[3]?.[0]).toBe("neutral");
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Edge cases
  // ═════════════════════════════════════════════════════════════

  describe("edge cases", () => {
    it("handles empty snapshot plan", () => {
      const snapshot: Trabajadera[] = [makeTrabajadera(1, ["A", "B"], ["T1"], null)];
      const current: Trabajadera[] = [makeTrabajadera(1, ["A", "B"], ["T1"], makePlan(1, [[0, 1]], [[]]))];

      const result = comparePlans(snapshot, current);

      // No snapshot plan → all current cells should be 'new'
      const cellA_T1 = result[0]?.[0]?.[0];
      expect(cellA_T1).toBe("new");
    });

    it("handles empty current plan", () => {
      const snapPlan = makePlan(1, [[0, 1]], [[]]);
      const snapshot: Trabajadera[] = [makeTrabajadera(1, ["A", "B"], ["T1"], snapPlan)];
      const current: Trabajadera[] = [makeTrabajadera(1, ["A", "B"], ["T1"], null)];

      const result = comparePlans(snapshot, current);

      // No current plan → all snapshot cells should be 'removed'
      const cellA_T1 = result[0]?.[0]?.[0];
      expect(cellA_T1).toBe("removed");
    });

    it("handles multiple trabajaderas", () => {
      const plan1 = makePlan(1, [[0, 1]], [[]]);
      const plan2 = makePlan(1, [[0, 1, 2]], [[]]);
      const snapshot: Trabajadera[] = [
        makeTrabajadera(1, ["A", "B"], ["T1"], plan1),
        makeTrabajadera(2, ["X", "Y", "Z"], ["T1"], plan2),
      ];
      const current: Trabajadera[] = [
        makeTrabajadera(1, ["A", "B"], ["T1"], plan1),
        makeTrabajadera(2, ["X", "Y", "Z"], ["T1"], plan2),
      ];

      const result = comparePlans(snapshot, current);

      // All neutral
      expect(result[0]?.[0]?.[0]).toBe("neutral");
      expect(result[1]?.[2]?.[0]).toBe("neutral");
    });

    it("handles different number of tramos", () => {
      const snapPlan = makePlan(3, [[0], [0], [0]], [[], [], []]);
      const currPlan = makePlan(2, [[0], [0]], [[], []]);
      const snapshot: Trabajadera[] = [makeTrabajadera(1, ["A"], ["T1", "T2", "T3"], snapPlan)];
      const current: Trabajadera[] = [makeTrabajadera(1, ["A"], ["T1", "T2"], currPlan)];

      const result = comparePlans(snapshot, current);

      // T3 exists in snapshot but not in current → removed
      const cellA_T3 = result[0]?.[0]?.[2];
      expect(cellA_T3).toBe("removed");
    });
  });
});
