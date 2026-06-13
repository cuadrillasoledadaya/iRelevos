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
      selectedTrabajaderaId: null,
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

      await historyStore.getState().listSnapshots(1);

      const state = historyStore.getState();
      expect(state.snapshots).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should populate snapshots when data is returned", async () => {
      setDeps();

      const mockDbRows = [
        {
          id: "snap-1",
          nombre: "Trabajadera 1 — 11/06/2026",
          creado_en: "2026-06-11T10:00:00Z",
          snapshot: {
            plan_summary: { status: "ok", salidas: 3, tramos: 5 },
            trabajadera_id: 1,
          },
          proyectos: { nombre_paso: "Paso Test" },
          temporadas: { nombre: "2026" },
        },
      ];

      (mockSupabase.auth.getSession as unknown as Mock).mockResolvedValue({
        data: { session: { user: { id: "user-1" } } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockDbRows, error: null }),
      } as never);

      await historyStore.getState().listSnapshots(1);

      const state = historyStore.getState();
      expect(state.snapshots).toHaveLength(1);
      expect(state.snapshots[0].nombre).toBe("Trabajadera 1 — 11/06/2026");
      expect(state.snapshots[0].trabajadera_id).toBe(1);
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

      await historyStore.getState().listSnapshots(1);

      const state = historyStore.getState();
      expect(state.error).toBe("DB error");
      expect(state.isLoading).toBe(false);
    });
  });

  // ── saveSnapshot ──

  describe("saveSnapshot", () => {
    it("should save snapshot with real temporada_id and trabajadera_id", async () => {
      const mockTrabajadera = {
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
      };

      setDeps(() => ({
        banco: [],
        planes: [],
        trabajaderas: [mockTrabajadera],
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
          trabajadera_id: 1,
          plan_summary: { status: "ok", salidas: 2, tramos: 1 },
        },
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: insertedRow, error: null }),
      } as never);

      await historyStore.getState().saveSnapshot("proj-1", 1, "Test Snapshot");

      const state = historyStore.getState();
      expect(state.snapshots).toHaveLength(1);
      expect(state.snapshots[0].id).toBe("snap-new");
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should set error when insert fails", async () => {
      const mockTrabajadera = {
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
      };

      setDeps(() => ({
        banco: [],
        planes: [],
        trabajaderas: [mockTrabajadera],
      }));

      (mockSupabase.auth.getSession as unknown as Mock).mockResolvedValue({
        data: { session: { user: { id: "user-1" } } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "FK violation" } }),
      } as never);

      await historyStore.getState().saveSnapshot("proj-1", 1, "Test");

      const state = historyStore.getState();
      expect(state.error).toBe("FK violation");
      expect(state.isLoading).toBe(false);
    });

    it("should set error when trabajadera not found", async () => {
      setDeps(() => ({
        banco: [],
        planes: [],
        trabajaderas: [{ id: 1, nombres: ["A"], tramos: ["T1"], plan: null, analisis: null, pinned: null, obj: null, bajas: [], regla5costaleros: false, roles: [], puntuaciones: {}, tramosClaves: [] }],
      }));

      (mockSupabase.auth.getSession as unknown as Mock).mockResolvedValue({
        data: { session: { user: { id: "user-1" } } },
        error: null,
      });

      await historyStore.getState().saveSnapshot("proj-1", 99, "Test");

      const state = historyStore.getState();
      expect(state.error).toBe("Trabajadera 99 no encontrada");
      expect(state.isLoading).toBe(false);
    });
  });
});
