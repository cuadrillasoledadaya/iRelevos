// ══════════════════════════════════════════════════════════════════
// RECONCILE — Pure function for cross-temporada name→index remapping
// Maps snapshot costalero names to current indices, handling
// removed/new costaleros and ambiguous name collisions.
// ══════════════════════════════════════════════════════════════════

import type { Trabajadera, ReconcileDiff } from "@/lib/types";

export interface ReconcileResult {
  mapped: Trabajadera[];
  diff: ReconcileDiff;
}

/**
 * Normalize a name for comparison: trim, lowercase, NFD strip accents.
 */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Reconcile snapshot trabajaderas against current trabajaderas.
 *
 * For each snapshot trabajadera:
 * 1. Build Map<normalized_name, currentIdx> from current.t.nombres
 * 2. Detect ambiguous names in snapshot (same normalized name at multiple indices)
 * 3. Walk snapshot plan slots, remap each ci using the map
 * 4. Removed costaleros (in snapshot, not in current) → add to fuera
 * 5. New costaleros (in current, not in snapshot) → add to fuera
 * 6. Ambiguous names → unmapped, drop to fuera
 * 7. t.pinned always reset to null
 */
export function reconcile(
  snapshot: Trabajadera[],
  current: Trabajadera[],
): ReconcileResult {
  const mapped: Trabajadera[] = [];
  const diff: ReconcileDiff = {
    removed: [],
    new: [],
    mapped: [],
    unmapped: [],
  };

  for (let trabIdx = 0; trabIdx < snapshot.length; trabIdx++) {
    const snapT = snapshot[trabIdx];
    const currT = current[trabIdx];

    // Build current name→index map and reverse index→name lookup
    const currentNameMap = new Map<string, number>();
    const currentNombres: string[] = currT?.nombres ?? [];
    if (currT) {
      for (let i = 0; i < currT.nombres.length; i++) {
        const key = normalizeName(currT.nombres[i]);
        currentNameMap.set(key, i);
      }
    }

    // Detect ambiguous names in snapshot
    const snapshotNameOccurrences = new Map<string, number[]>();
    for (let i = 0; i < snapT.nombres.length; i++) {
      const key = normalizeName(snapT.nombres[i]);
      const existing = snapshotNameOccurrences.get(key) ?? [];
      existing.push(i);
      snapshotNameOccurrences.set(key, existing);
    }

    const ambiguousIndices = new Set<number>();
    for (const [, indices] of snapshotNameOccurrences) {
      if (indices.length > 1) {
        for (const idx of indices) {
          ambiguousIndices.add(idx);
        }
      }
    }

    // Track which snapshot indices have been recorded in diff.mapped
    const mappedSnapshotIndices = new Map<number, number>(); // snapshotCi → currentCi

    // Build the restored plan
    const nTramos = snapT.plan?.length ?? 0;
    const restoredPlan: Trabajadera["plan"] = [];

    for (let ti = 0; ti < nTramos; ti++) {
      const snapSlot = snapT.plan![ti];
      const restoredSlot = { dentro: [] as number[], fuera: [] as number[] };

      // Remap dentro
      for (const ci of snapSlot.dentro) {
        const mappedCi = remapCi(
          ci, snapT.nombres, currentNombres, currentNameMap,
          ambiguousIndices, snapT.id, diff, mappedSnapshotIndices,
        );
        if (mappedCi !== null) {
          restoredSlot.dentro.push(mappedCi);
        } else {
          restoredSlot.fuera.push(ci);
        }
      }

      // Remap fuera
      for (const ci of snapSlot.fuera) {
        const mappedCi = remapCi(
          ci, snapT.nombres, currentNombres, currentNameMap,
          ambiguousIndices, snapT.id, diff, mappedSnapshotIndices,
        );
        if (mappedCi !== null) {
          restoredSlot.fuera.push(mappedCi);
        } else {
          restoredSlot.fuera.push(ci);
        }
      }

      restoredPlan.push(restoredSlot);
    }

    // If snapshot had no plan, create empty plan matching current tramos
    if (nTramos === 0 && currT) {
      for (let ti = 0; ti < currT.tramos.length; ti++) {
        restoredPlan.push({ dentro: [], fuera: [] });
      }
    }

    // Add new costaleros (in current but not in snapshot) to FUERA
    if (currT) {
      const snapshotNormalizedNames = new Set<string>();
      for (const name of snapT.nombres) {
        snapshotNormalizedNames.add(normalizeName(name));
      }

      for (let i = 0; i < currT.nombres.length; i++) {
        const key = normalizeName(currT.nombres[i]);
        if (!snapshotNormalizedNames.has(key)) {
          diff.new.push({
            tid: snapT.id,
            idx: i,
            nombre: currT.nombres[i],
          });
          // Add to fuera of all tramos
          for (const slot of restoredPlan) {
            if (!slot.fuera.includes(i)) {
              slot.fuera.push(i);
            }
          }
        }
      }
    }

    // If no current trabajadera, all snapshot indices go to FUERA
    if (!currT) {
      for (let ci = 0; ci < snapT.nombres.length; ci++) {
        if (!ambiguousIndices.has(ci)) {
          const existing = diff.removed.find(
            (r) => r.tid === snapT.id && r.idx === ci,
          );
          if (!existing) {
            diff.removed.push({
              tid: snapT.id,
              idx: ci,
              nombre: snapT.nombres[ci],
              tramos_affected: nTramos,
            });
          }
        }
      }
      // Ensure all indices are in fuera, none in dentro
      for (const slot of restoredPlan) {
        for (let ci = 0; ci < snapT.nombres.length; ci++) {
          if (!slot.fuera.includes(ci)) {
            slot.fuera.push(ci);
          }
        }
        slot.dentro = [];
      }
    }

    const restoredT: Trabajadera = {
      ...snapT,
      nombres: currT ? [...currT.nombres] : [...snapT.nombres],
      plan: restoredPlan,
      pinned: null,
      obj: null,
      analisis: null,
    };

    mapped.push(restoredT);
  }

  return { mapped, diff };
}

/**
 * Remap a snapshot costalero index to a current index.
 * Returns null if the costalero cannot be mapped (removed or ambiguous).
 * Side effects: populates diff.removed, diff.unmapped, diff.mapped.
 */
function remapCi(
  snapshotCi: number,
  snapshotNombres: string[],
  currentNombres: string[],
  currentNameMap: Map<string, number>,
  ambiguousIndices: Set<number>,
  tid: number,
  diff: ReconcileDiff,
  mappedSnapshotIndices: Map<number, number>,
): number | null {
  // Ambiguous → unmapped
  if (ambiguousIndices.has(snapshotCi)) {
    const existing = diff.unmapped.find(
      (u) => u.tid === tid && u.idx === snapshotCi,
    );
    if (!existing) {
      diff.unmapped.push({
        tid,
        idx: snapshotCi,
        nombre: snapshotNombres[snapshotCi],
        reason: "ambiguous",
      });
    }
    return null;
  }

  const name = snapshotNombres[snapshotCi];
  const key = normalizeName(name);
  const currentCi = currentNameMap.get(key);

  if (currentCi === undefined) {
    // Name not found in current → removed
    const existing = diff.removed.find(
      (r) => r.tid === tid && r.idx === snapshotCi,
    );
    if (!existing) {
      diff.removed.push({
        tid,
        idx: snapshotCi,
        nombre: name,
        tramos_affected: 1,
      });
    } else {
      existing.tramos_affected++;
    }
    return null;
  }

  // Record mapping (deduplicated)
  if (!mappedSnapshotIndices.has(snapshotCi)) {
    mappedSnapshotIndices.set(snapshotCi, currentCi);
    diff.mapped.push({
      tid,
      old_nombre: name,
      new_nombre: currentNombres[currentCi],
      old_idx: snapshotCi,
      new_idx: currentCi,
    });
  }

  return currentCi;
}
