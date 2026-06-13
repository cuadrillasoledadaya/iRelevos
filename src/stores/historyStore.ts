// ══════════════════════════════════════════════════════════════════
// HISTORY STORE — Snapshots por trabajadera individual (plan-history)
// Delega a mutar() para modificar el projectStore.
// ══════════════════════════════════════════════════════════════════

import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { analizar } from "@/lib/algoritmos";
import { ordenarDentroFisico } from "@/lib/roles";
import { temporadaStore } from "@/stores/temporadaStore";
import type {
  DatosPerfil,
  PlanSnapshot,
  PlanSnapshotSummary,
  Trabajadera,
} from "@/lib/types";

export interface HistoryStore {
  snapshots: PlanSnapshotSummary[];
  currentSnapshot: PlanSnapshot | null;
  isLoading: boolean;
  error: string | null;
  restorePreview: {
    snapshotData: Trabajadera;
    snapshotId: string;
    currentHash: string;
  } | null;
  // Actions
  listSnapshots: (trabajaderaId: number) => Promise<void>;
  saveSnapshot: (
    proyectoId: string,
    trabajaderaId: number,
    nombre: string,
    descripcion?: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  getSnapshot: (id: string) => Promise<PlanSnapshot | null>;
  deleteSnapshot: (id: string) => Promise<void>;
  previewRestore: (snapshotId: string) => Promise<{ snapshotData: Trabajadera } | null>;
  applyRestore: (snapshotId: string) => Promise<{ ok: boolean; error?: string }>;
}

type MutarFn = (fn: (draft: DatosPerfil) => void) => void;
type GetSFn = () => DatosPerfil;
type GetEsMandoFn = () => boolean;
type RecalcAnalisisFn = (t: Trabajadera) => void;

let _mutar: MutarFn;
let _getS: GetSFn;
let _getEsMando: GetEsMandoFn = () => true;
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
 */
export function setEsMandoGetter(fn: GetEsMandoFn) {
  _getEsMando = fn;
}

/** Recompute analisis for a single trabajadera. */
function defaultRecalcAnalisis(t: Trabajadera) {
  if (!t.plan) {
    t.analisis = null;
    return;
  }
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

export const historyStore = create<HistoryStore>()(() => ({
  snapshots: [],
  currentSnapshot: null,
  isLoading: false,
  error: null,
  restorePreview: null,

  listSnapshots: async (trabajaderaId: number) => {
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
          "id, nombre, creado_en, snapshot->plan_summary, snapshot->trabajadera_id, proyectos!inner(nombre_paso), temporadas!inner(nombre)",
        )
        .eq("user_id", session.user.id)
        .eq("trabajadera_id", trabajaderaId)
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
              trabajadera_id: number;
            };
            proyectos: { nombre_paso: string };
            temporadas: { nombre: string };
          };
          return {
            id: r.id,
            nombre: r.nombre,
            created_at: r.creado_en,
            trabajadera_id: r.snapshot?.trabajadera_id ?? trabajaderaId,
            plan_summary: r.snapshot?.plan_summary ?? {
              status: "incomplete",
              salidas: 0,
              tramos: 0,
            },
            proyecto_nombre: r.proyectos?.nombre_paso,
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
    trabajaderaId: number,
    nombre: string,
    descripcion?: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
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
        return { ok: false, error: "No autenticado" };
      }

      const S = _getS();
      const trabajadera = S.trabajaderas.find((t) => t.id === trabajaderaId);

      if (!trabajadera) {
        const msg = `Trabajadera ${trabajaderaId} no encontrada`;
        historyStore.setState({ isLoading: false, error: msg });
        return { ok: false, error: msg };
      }

      const activeTemporadaId = temporadaStore.getState().activeTemporadaId;
      if (!activeTemporadaId) {
        const msg = "No hay temporada activa. Selecciona una temporada antes de guardar.";
        historyStore.setState({ isLoading: false, error: msg });
        return { ok: false, error: msg };
      }

      const planSummary = computePlanSummary(trabajadera);

      const snapshotPayload = {
        plan_data: trabajadera,
        trabajadera_id: trabajaderaId,
        plan_summary: planSummary,
      };

      const { data, error } = await supabase
        .from("plan_snapshots")
        .insert({
          proyecto_id: proyectoId,
          temporada_id: activeTemporadaId,
          user_id: session.user.id,
          trabajadera_id: trabajaderaId,
          nombre,
          descripcion: descripcion ?? null,
          snapshot: snapshotPayload,
          creado_por: session.user.id,
        })
        .select()
        .single();

      if (error) {
        historyStore.setState({ isLoading: false, error: error.message });
        return { ok: false, error: error.message };
      }

      // Prepend to local list
      const row = data as Record<string, unknown>;
      const newSummary: PlanSnapshotSummary = {
        id: row.id as string,
        nombre: row.nombre as string,
        created_at: row.creado_en as string,
        trabajadera_id: trabajaderaId,
        plan_summary: planSummary,
      };

      historyStore.setState((state: HistoryStore) => ({
        snapshots: [newSummary, ...state.snapshots],
        isLoading: false,
        error: null,
      }));

      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido al guardar";
      historyStore.setState({ isLoading: false, error: msg });
      return { ok: false, error: msg };
    }
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
      trabajadera_id: row.trabajadera_id as number,
      nombre: row.nombre as string,
      descripcion: row.descripcion as string | undefined,
      created_at: row.creado_en as string,
      plan_data: (row.snapshot as Record<string, unknown>)
        ?.plan_data as Trabajadera,
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

    historyStore.setState((state: HistoryStore) => ({
      snapshots: state.snapshots.filter((s: PlanSnapshotSummary) => s.id !== id),
      currentSnapshot: state.currentSnapshot?.id === id ? null : state.currentSnapshot,
      isLoading: false,
    }));
  },

  previewRestore: async (snapshotId: string): Promise<{ snapshotData: Trabajadera } | null> => {
    historyStore.setState({ isLoading: true, error: null });

    const snapshot: PlanSnapshot | null = await historyStore.getState().getSnapshot(snapshotId);
    if (!snapshot) {
      historyStore.setState({ isLoading: false, error: "Instantánea no encontrada" });
      return null;
    }

    const S = _getS();
    const currentTrabajadera = S.trabajaderas.find(
      (t) => t.id === snapshot.trabajadera_id,
    );

    if (!currentTrabajadera) {
      historyStore.setState({
        isLoading: false,
        error: "La trabajadera de esta instantánea ya no existe en el proyecto",
      });
      return null;
    }

    // Hash current state for stale detection
    const currentHash = JSON.stringify({
      nombres: currentTrabajadera.nombres,
      plan: currentTrabajadera.plan,
    });

    historyStore.setState({
      restorePreview: {
        snapshotData: snapshot.plan_data,
        snapshotId,
        currentHash,
      },
      isLoading: false,
    });

    return { snapshotData: snapshot.plan_data };
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
    const currentTrabajadera = S.trabajaderas.find(
      (t) => t.id === preview.snapshotData.id,
    );

    if (!currentTrabajadera) {
      return { ok: false, error: "La trabajadera ya no existe en el proyecto" };
    }

    const currentHash = JSON.stringify({
      nombres: currentTrabajadera.nombres,
      plan: currentTrabajadera.plan,
    });

    if (currentHash !== preview.currentHash) {
      return { ok: false, error: "La planificación ha cambiado desde la previsualización. Por favor, revisa de nuevo." };
    }

    // Apply the restored plan to this single trabajadera
    _mutar((d) => {
      const idx = d.trabajaderas.findIndex((t) => t.id === preview.snapshotData.id);
      if (idx !== -1) {
        d.trabajaderas[idx] = preview.snapshotData;
      }
    });

    // Recompute analisis for the restored trabajadera
    const restored = _getS();
    const t = restored.trabajaderas.find((t) => t.id === preview.snapshotData.id);
    if (t) {
      _recalcAnalisis(t);
    }

    historyStore.setState({ restorePreview: null });

    return { ok: true };
  },
}));

// ── Pure helper: compute plan summary from single trabajadera ─────

function computePlanSummary(t: Trabajadera): PlanSnapshot["plan_summary"] {
  const status: "ok" | "incomplete" | "error" = t.analisis?.okObj
    ? "ok"
    : t.plan
      ? "incomplete"
      : "incomplete";

  return {
    status,
    salidas: t.nombres.length,
    tramos: t.tramos.length,
  };
}
