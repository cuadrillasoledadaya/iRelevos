// ══════════════════════════════════════════════════════════════════
// HISTORY STORE — Slice para instantáneas del plan (plan-history)
// Delega a mutar() para modificar el projectStore.
// ══════════════════════════════════════════════════════════════════

import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { reconcile } from "@/lib/algoritmos/reconcile";
import { analizar } from "@/lib/algoritmos";
import { ordenarDentroFisico } from "@/lib/roles";
import { temporadaStore } from "@/stores/temporadaStore";
import type {
  DatosPerfil,
  PlanSnapshot,
  PlanSnapshotSummary,
  ReconcileDiff,
  Trabajadera,
} from "@/lib/types";

export interface HistoryStore {
  snapshots: PlanSnapshotSummary[];
  currentSnapshot: PlanSnapshot | null;
  isLoading: boolean;
  error: string | null;
  restorePreview: {
    mapped: Trabajadera[];
    diff: ReconcileDiff;
    snapshotId: string;
    currentHash: string;
  } | null;
  // Actions
  listSnapshots: () => Promise<void>;
  saveSnapshot: (
    proyectoId: string,
    nombre: string,
    descripcion?: string,
  ) => Promise<void>;
  getSnapshot: (id: string) => Promise<PlanSnapshot | null>;
  deleteSnapshot: (id: string) => Promise<void>;
  previewRestore: (snapshotId: string) => Promise<{ mapped: Trabajadera[]; diff: ReconcileDiff } | null>;
  applyRestore: (snapshotId: string) => Promise<{ ok: boolean; error?: string }>;
}

type MutarFn = (fn: (draft: DatosPerfil) => void) => void;
type GetSFn = () => DatosPerfil;
type GetEsMandoFn = () => boolean;
type RecalcAnalisisFn = (trabajaderas: Trabajadera[]) => void;

let _mutar: MutarFn;
let _getS: GetSFn;
let _getEsMando: GetEsMandoFn = () => true; // default permissive; override via setEsMandoGetter
let _recalcAnalisis: RecalcAnalisisFn;

export function setHistoryDeps(
  m: MutarFn,
  gs: GetSFn,
  recalcAnalisis: RecalcAnalisisFn = defaultRecalcAnalisis,
) {
  _mutar = m;
  _getS = gs;
  _recalcAnalisis = recalcAnalisis;
}

/**
 * Set the esMando permission getter. Call this from app init after auth is ready.
 * Default is permissive (true) so the store works before auth is initialized.
 */
export function setEsMandoGetter(fn: GetEsMandoFn) {
  _getEsMando = fn;
}

/** Default analisis recomputation: re-analyze each trabajadera with its existing plan. */
function defaultRecalcAnalisis(trabajaderas: Trabajadera[]) {
  for (const t of trabajaderas) {
    if (!t.plan) {
      t.analisis = null;
      continue;
    }
    // Recompute objetivo from current plan fuera counts
    const obj: Record<number, number> = {};
    for (let i = 0; i < t.nombres.length; i++) obj[i] = 0;
    for (const tramo of t.plan) {
      for (const ci of tramo.fuera) {
        obj[ci] = (obj[ci] ?? 0) + 1;
      }
    }
    ordenarDentroFisico(t, t.plan);
    t.analisis = analizar(t.plan, t.nombres.length, obj, t);
  }
}

export const historyStore = create<HistoryStore>()(() => ({
  snapshots: [],
  currentSnapshot: null,
  isLoading: false,
  error: null,
  restorePreview: null,

  listSnapshots: async () => {
    historyStore.setState({ isLoading: true, error: null });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        historyStore.setState({
          isLoading: false,
          error: "No autenticado",
        });
        return;
      }

      const { data, error } = await supabase
        .from("plan_snapshots")
        .select(
          "id, nombre, creado_en, snapshot->plan_summary, snapshot->trabajadera_count, proyectos!inner(nombre), temporadas!inner(nombre)",
        )
        .eq("user_id", session.user.id)
        .order("creado_en", { ascending: false });

      if (error) {
        historyStore.setState({ isLoading: false, error: error.message });
        return;
      }

      const summaries: PlanSnapshotSummary[] = (data ?? []).map(
        (row: Record<string, unknown>) => {
          const r = row as {
            id: string;
            nombre: string;
            creado_en: string;
            snapshot: {
              plan_summary: PlanSnapshotSummary["plan_summary"];
              trabajadera_count: number;
            };
            proyectos: { nombre: string };
            temporadas: { nombre: string };
          };
          return {
            id: r.id,
            nombre: r.nombre,
            created_at: r.creado_en,
            trabajadera_count: r.snapshot?.trabajadera_count ?? 0,
            plan_summary: r.snapshot?.plan_summary ?? {
              status: "incomplete",
              salidas_por_trab: [],
              tramos_por_trab: [],
            },
            proyecto_nombre: r.proyectos?.nombre,
            temporada_nombre: r.temporadas?.nombre,
          };
        },
      );

      historyStore.setState({ snapshots: summaries, isLoading: false });
    } catch (err) {
      historyStore.setState({
        isLoading: false,
        error: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  },

  saveSnapshot: async (
    proyectoId: string,
    nombre: string,
    descripcion?: string,
  ) => {
    historyStore.setState({ isLoading: true, error: null });

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      historyStore.setState({
        isLoading: false,
        error: "No autenticado",
      });
      return;
    }

    const S = _getS();
    const trabajaderas = S.trabajaderas;

    // Build denormalized metadata
    const trabajaderaCount = trabajaderas.length;
    const trabajaderaIds = trabajaderas.map((t) => t.id);
    const trabajaderaNombres = trabajaderas.map((t) => ({
      tid: t.id,
      nombres: [...t.nombres],
    }));

    const planSummary = computePlanSummary(trabajaderas);

    const snapshotPayload = {
      plan_data: trabajaderas,
      trabajadera_count: trabajaderaCount,
      trabajadera_ids: trabajaderaIds,
      trabajadera_nombres: trabajaderaNombres,
      plan_summary: planSummary,
    };

    const { data, error } = await supabase
      .from("plan_snapshots")
      .insert({
        proyecto_id: proyectoId,
        temporada_id: temporadaStore.getState().activeTemporadaId || null,
        user_id: session.user.id,
        nombre,
        descripcion: descripcion ?? null,
        snapshot: snapshotPayload,
        creado_por: session.user.id,
      })
      .select()
      .single();

    if (error) {
      historyStore.setState({ isLoading: false, error: error.message });
      return;
    }

    // Prepend to local list
    const row = data as Record<string, unknown>;
    const newSummary: PlanSnapshotSummary = {
      id: row.id as string,
      nombre: row.nombre as string,
      created_at: row.creado_en as string,
      trabajadera_count: trabajaderaCount,
      plan_summary: planSummary,
    };

    historyStore.setState((state) => ({
      snapshots: [newSummary, ...state.snapshots],
      isLoading: false,
    }));
  },

  getSnapshot: async (id: string) => {
    historyStore.setState({ isLoading: true, error: null });

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      historyStore.setState({
        isLoading: false,
        error: "No autenticado",
      });
      return null;
    }

    const { data, error } = await supabase
      .from("plan_snapshots")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    if (error) {
      historyStore.setState({ isLoading: false, error: error.message });
      return null;
    }

    const row = data as Record<string, unknown>;
    const snapshot: PlanSnapshot = {
      id: row.id as string,
      proyecto_id: row.proyecto_id as string,
      temporada_id: row.temporada_id as string,
      user_id: row.user_id as string,
      nombre: row.nombre as string,
      descripcion: row.descripcion as string | undefined,
      created_at: row.creado_en as string,
      plan_data: (row.snapshot as Record<string, unknown>)
        ?.plan_data as DatosPerfil,
      trabajadera_count: (row.snapshot as Record<string, unknown>)
        ?.trabajadera_count as number,
      trabajadera_ids: (row.snapshot as Record<string, unknown>)
        ?.trabajadera_ids as number[],
      trabajadera_nombres: (row.snapshot as Record<string, unknown>)
        ?.trabajadera_nombres as { tid: number; nombres: string[] }[],
      plan_summary: (row.snapshot as Record<string, unknown>)
        ?.plan_summary as PlanSnapshot["plan_summary"],
    };

    historyStore.setState({ currentSnapshot: snapshot, isLoading: false });
    return snapshot;
  },

  deleteSnapshot: async (id: string) => {
    historyStore.setState({ isLoading: true, error: null });

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      historyStore.setState({
        isLoading: false,
        error: "No autenticado",
      });
      return;
    }

    const { error } = await supabase
      .from("plan_snapshots")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      historyStore.setState({ isLoading: false, error: error.message });
      return;
    }

    historyStore.setState((state) => ({
      snapshots: state.snapshots.filter((s) => s.id !== id),
      currentSnapshot: state.currentSnapshot?.id === id ? null : state.currentSnapshot,
      isLoading: false,
    }));
  },

  previewRestore: async (snapshotId: string) => {
    historyStore.setState({ isLoading: true, error: null });

    const snapshot = await historyStore.getState().getSnapshot(snapshotId);
    if (!snapshot) {
      historyStore.setState({ isLoading: false, error: "Instantánea no encontrada" });
      return null;
    }

    const S = _getS();
    const snapshotTrabajaderas = snapshot.plan_data?.trabajaderas ?? [];
    const currentTrabajaderas = S.trabajaderas;

    const result = reconcile(snapshotTrabajaderas, currentTrabajaderas);

    // Hash current state for stale detection
    const currentHash = JSON.stringify(currentTrabajaderas.map((t) => ({
      nombres: t.nombres,
      tramos: t.tramos,
    })));

    historyStore.setState({
      restorePreview: {
        mapped: result.mapped,
        diff: result.diff,
        snapshotId,
        currentHash,
      },
      isLoading: false,
    });

    return result;
  },

  applyRestore: async (snapshotId: string) => {
    // Permission gate: only esMando can restore
    if (!_getEsMando()) {
      return { ok: false, error: "No autorizado. Solo los mandos pueden restaurar instantáneas." };
    }

    const preview = historyStore.getState().restorePreview;

    if (!preview || preview.snapshotId !== snapshotId) {
      return { ok: false, error: "No hay previsualización. Genera una nueva." };
    }

    // Stale guard: re-derive current state and compare hash
    const S = _getS();
    const currentHash = JSON.stringify(S.trabajaderas.map((t) => ({
      nombres: t.nombres,
      tramos: t.tramos,
    })));

    if (currentHash !== preview.currentHash) {
      return { ok: false, error: "La planificación ha cambiado desde la previsualización. Por favor, revisa la reconciliación de nuevo." };
    }

    // Apply the reconciled plan via mutar
    _mutar((d) => {
      d.trabajaderas = preview.mapped;
    });

    // Recompute analisis for all restored trabajaderas (REQ-PH-004 scenario 1)
    const restored = _getS();
    _recalcAnalisis(restored.trabajaderas);

    historyStore.setState({ restorePreview: null });

    return { ok: true };
  },
}));

// ── Pure helper: compute plan summary from trabajaderas ───────────

function computePlanSummary(trabajaderas: Trabajadera[]): PlanSnapshot["plan_summary"] {
  const allOk = trabajaderas.every((t) => t.analisis?.okObj ?? false);
  const hasAnyPlan = trabajaderas.some((t) => t.plan !== null);

  const status: "ok" | "incomplete" | "error" = allOk
    ? "ok"
    : hasAnyPlan
      ? "incomplete"
      : "incomplete";

  return {
    status,
    salidas_por_trab: trabajaderas.map((t) => t.nombres.length),
    tramos_por_trab: trabajaderas.map((t) => t.tramos.length),
  };
}
