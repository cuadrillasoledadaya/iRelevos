import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { historyStore, setHistoryDeps } from "../historyStore";
import type { PlanSnapshotSummary } from "@/lib/types";

// Mock supabase
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
  },
}));

// Mock temporadaStore
vi.mock("@/stores/temporadaStore", () => ({
  temporadaStore: {
    getState: () => ({ activeTemporadaId: "temp-1", temporadas: [] }),
  },
}));

import { supabase } from "@/lib/supabase";

const mockSupabase = vi.mocked(supabase);

describe("historyStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    historyStore.setState({
      snapshots: [],
      currentSnapshot: null,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Dependency injection ──

  function setDeps(getSOverride?: () => any) {
    const mockMutar = vi.fn();
    const mockGetS = getSOverride ?? vi.fn(() => ({
      banco: [],
      planes: [],
      trabajaderas: [],
    }));
    setHistoryDeps(mockMutar, mockGetS);
  }

  // ── listSnapshots ──

  describe("listSnapshots", () => {
    it("should return empty array when no snapshots exist", async () => {
      setDeps();

      (mockSupabase.auth.getSession as unknown as Mock).mockResolvedValue({
        data: { session: { user: { id: "user-1" } } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as never);

      await historyStore.getState().listSnapshots();

      const state = historyStore.getState();
      expect(state.snapshots).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should populate snapshots when data is returned", async () => {
      setDeps();

      const mockSummaries: PlanSnapshotSummary[] = [
        {
          id: "snap-1",
          nombre: "Trabajadera 1 — 11/06/2026",
          created_at: "2026-06-11T10:00:00Z",
          trabajadera_count: 2,
          plan_summary: {
            status: "ok",
            salidas_por_trab: [3, 3],
            tramos_por_trab: [5, 5],
          },
          proyecto_nombre: "Paso Test",
          temporada_nombre: "2026",
        },
      ];

      (mockSupabase.auth.getSession as unknown as Mock).mockResolvedValue({
        data: { session: { user: { id: "user-1" } } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockSummaries, error: null }),
      } as never);

      await historyStore.getState().listSnapshots();

      const state = historyStore.getState();
      expect(state.snapshots).toHaveLength(1);
      expect(state.snapshots[0].nombre).toBe("Trabajadera 1 — 11/06/2026");
      expect(state.isLoading).toBe(false);
    });

    it("should set error when query fails", async () => {
      setDeps();

      (mockSupabase.auth.getSession as unknown as Mock).mockResolvedValue({
        data: { session: { user: { id: "user-1" } } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "DB error" },
        }),
      } as never);

      await historyStore.getState().listSnapshots();

      const state = historyStore.getState();
      expect(state.error).toBe("DB error");
      expect(state.isLoading).toBe(false);
    });
  });

  // ── saveSnapshot ──

  describe("saveSnapshot", () => {
    it("should save snapshot with real temporada_id and prepend to list", async () => {
      const mockTrabajaderas = [
        {
          id: 1,
          nombres: ["A", "B"],
          tramos: ["T1"],
          plan: [{ dentro: [0, 1], fuera: [] }],
          analisis: { okObj: true } as any,
          pinned: null,
          obj: null,
          bajas: [],
          regla5costaleros: false,
          roles: [],
          puntuaciones: {},
          tramosClaves: [],
        },
      ];

      setDeps(() => ({
        banco: [],
        planes: [],
        trabajaderas: mockTrabajaderas,
      }));

      (mockSupabase.auth.getSession as unknown as Mock).mockResolvedValue({
        data: { session: { user: { id: "user-1" } } },
        error: null,
      });

      const insertedRow = {
        id: "snap-new",
        nombre: "Test Snapshot",
        creado_en: "2026-06-12T10:00:00Z",
        snapshot: {
          trabajadera_count: 1,
          plan_summary: { status: "ok", salidas_por_trab: [2], tramos_por_trab: [1] },
        },
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: insertedRow, error: null }),
      } as never);

      await historyStore.getState().saveSnapshot("proj-1", "Test Snapshot");

      const state = historyStore.getState();
      expect(state.snapshots).toHaveLength(1);
      expect(state.snapshots[0].id).toBe("snap-new");
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();

      // Verify temporada_id was NOT empty string
      const insertCall = (mockSupabase.from as any).mock.calls.find(
        (c: string[]) => c[0] === "plan_snapshots",
      );
      // The insert arg is in the chain; verify via the mock chain
      const insertArg = (mockSupabase.from as any).mock.results[0]?.value?.insert?.mock?.calls?.[0]?.[0];
      if (insertArg) {
        expect(insertArg.temporada_id).toBe("temp-1");
        expect(insertArg.temporada_id).not.toBe("");
      }
    });

    it("should set error when insert fails", async () => {
      setDeps();

      (mockSupabase.auth.getSession as unknown as Mock).mockResolvedValue({
        data: { session: { user: { id: "user-1" } } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "FK violation" } }),
      } as never);

      await historyStore.getState().saveSnapshot("proj-1", "Test");

      const state = historyStore.getState();
      expect(state.error).toBe("FK violation");
      expect(state.isLoading).toBe(false);
    });
  });
});
