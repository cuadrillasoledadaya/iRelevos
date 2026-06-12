// ══════════════════════════════════════════════════════════════════
// COMPARE PLANS — Pure function for snapshot vs current comparison
// Returns a 3D array: [trabajaderaIdx][costaleroIdx][tramoIdx] → CellComparison
// ══════════════════════════════════════════════════════════════════

import type { Trabajadera } from "@/lib/types";

export type CellComparison = "neutral" | "removed" | "new" | "mapped";

/**
 * Compare snapshot trabajaderas against current trabajaderas.
 * Returns a 3D lookup: result[trabIdx][ci][ti] → CellComparison
 *
 * - "neutral": same status (DENTRO/FUERA) in both snapshot and current
 * - "removed": DENTRO in snapshot but FUERA (or absent) in current
 * - "new": FUERA in snapshot but DENTRO in current
 */
export function comparePlans(
  snapshot: Trabajadera[],
  current: Trabajadera[]
): CellComparison[][][] {
  const maxTrabIdx = Math.max(snapshot.length, current.length);
  const result: CellComparison[][][] = [];

  for (let trabIdx = 0; trabIdx < maxTrabIdx; trabIdx++) {
    const snapT = snapshot[trabIdx];
    const currT = current[trabIdx];

    if (!snapT && currT) {
      // Entire trabajadera is new
      result[trabIdx] = buildAllCells(currT.nombres.length, currT.tramos.length, currT.plan, null, "new");
    } else if (snapT && !currT) {
      // Entire trabajadera was removed
      result[trabIdx] = buildAllCells(snapT.nombres.length, snapT.tramos.length, null, snapT.plan, "removed");
    } else if (snapT && currT) {
      result[trabIdx] = compareTrabajadera(snapT, currT);
    }
  }

  return result;
}

function compareTrabajadera(snapT: Trabajadera, currT: Trabajadera): CellComparison[][] {
  const maxTi = Math.max(snapT.tramos.length, currT.tramos.length);
  const result: CellComparison[][] = [];

  // Build unified name list for row-by-row comparison
  const allNames = [...new Set([
    ...snapT.nombres,
    ...currT.nombres,
  ])];

  for (let ci = 0; ci < allNames.length; ci++) {
    result[ci] = [];
    const name = allNames[ci];
    const snapCi = snapT.nombres.indexOf(name);
    const currCi = currT.nombres.indexOf(name);

    for (let ti = 0; ti < maxTi; ti++) {
      const snapSlot = snapT.plan?.[ti];
      const currSlot = currT.plan?.[ti];

      const snapDentro = snapCi >= 0 && (snapSlot?.dentro.includes(snapCi) ?? false);
      const currDentro = currCi >= 0 && (currSlot?.dentro.includes(currCi) ?? false);

      // Costalero doesn't exist in current → removed
      if (currCi < 0) {
        result[ci][ti] = snapDentro ? "removed" : "neutral";
        continue;
      }

      // Costalero doesn't exist in snapshot → new
      if (snapCi < 0) {
        result[ci][ti] = currDentro ? "new" : "neutral";
        continue;
      }

      // Same person at different index in snapshot vs current → mapped
      if (snapCi !== currCi) {
        result[ci][ti] = "mapped";
        continue;
      }

      // Tramo doesn't exist in current → removed
      if (ti >= currT.tramos.length) {
        result[ci][ti] = snapDentro ? "removed" : "neutral";
        continue;
      }

      // Tramo doesn't exist in snapshot → new
      if (ti >= snapT.tramos.length) {
        result[ci][ti] = currDentro ? "new" : "neutral";
        continue;
      }

      // Both have this tramo and costalero at same index
      if (snapDentro && currDentro) {
        result[ci][ti] = "neutral";
      } else if (snapDentro && !currDentro) {
        result[ci][ti] = "removed";
      } else if (!snapDentro && currDentro) {
        result[ci][ti] = "new";
      } else {
        // Both FUERA
        result[ci][ti] = "neutral";
      }
    }
  }

  return result;
}

function buildAllCells(
  nNombres: number,
  nTramos: number,
  currPlan: Trabajadera["plan"],
  snapPlan: Trabajadera["plan"],
  defaultStatus: CellComparison
): CellComparison[][] {
  const result: CellComparison[][] = [];
  for (let ci = 0; ci < nNombres; ci++) {
    result[ci] = [];
    for (let ti = 0; ti < nTramos; ti++) {
      const slot = currPlan?.[ti] ?? snapPlan?.[ti];
      const isDentro = slot?.dentro.includes(ci) ?? false;
      // If the costalero was never in this position, it's neutral (not a change)
      result[ci][ti] = isDentro ? defaultStatus : "neutral";
    }
  }
  return result;
}
