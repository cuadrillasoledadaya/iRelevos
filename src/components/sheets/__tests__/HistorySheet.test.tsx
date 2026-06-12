// ══════════════════════════════════════════════════════════════════
// TESTS — HistorySheet.tsx (plan-history)
// List, save, and manage plan snapshots
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import HistorySheet from "../HistorySheet";
import type { PlanSnapshotSummary } from "@/lib/types";

// ── Mock stores and hooks ────────────────────────────────────────

const mockCloseSheet = vi.fn();
const mockOpenSheet = vi.fn();
const mockActiveSheet = "history";
const mockSnapshots = { snapshots: [] as PlanSnapshotSummary[] };
const mockLoading = { isLoading: false };
const mockError = { error: null as string | null };
const mockTrabajaderas = { trabajaderas: [] as { id: number; analisis: { okObj: boolean } | null }[] };
const mockPid = { pid: "proj-1" };
const mockProfile = { profile: { role: "capataz" } };

const mockUIStore = vi.fn((selector?: (s: any) => any) => {
  if (typeof selector === "function") {
    return selector({ activeSheet: mockActiveSheet });
  }
  return { closeSheet: mockCloseSheet, openSheet: mockOpenSheet, activeSheet: mockActiveSheet };
}) as any;
mockUIStore.getState = () => ({
  closeSheet: mockCloseSheet,
  openSheet: mockOpenSheet,
  activeSheet: mockActiveSheet,
});

const mockProjectStore = vi.fn((selector?: (s: any) => any) => {
  if (typeof selector === "function") {
    return selector({
      S: { trabajaderas: mockTrabajaderas.trabajaderas },
      pid: mockPid.pid,
    });
  }
  return { S: { trabajaderas: mockTrabajaderas.trabajaderas }, pid: mockPid.pid };
}) as any;

const mockHistoryStore = vi.fn((selector?: (s: any) => any) => {
  if (typeof selector === "function") {
    return selector({ ...mockSnapshots, ...mockLoading, ...mockError });
  }
  return {
    snapshots: mockSnapshots.snapshots,
    isLoading: mockLoading.isLoading,
    error: mockError.error,
    listSnapshots: vi.fn(),
    saveSnapshot: vi.fn(),
    getSnapshot: vi.fn(),
    deleteSnapshot: vi.fn(),
    previewRestore: vi.fn(),
    applyRestore: vi.fn(),
  };
}) as any;
mockHistoryStore.getState = () => ({
  snapshots: mockSnapshots.snapshots,
  isLoading: mockLoading.isLoading,
  error: mockError.error,
  listSnapshots: vi.fn(),
  saveSnapshot: vi.fn(),
  getSnapshot: vi.fn(),
  deleteSnapshot: vi.fn(),
  previewRestore: vi.fn(),
  applyRestore: vi.fn(),
});

vi.mock("@/stores", () => ({
  get uiStore() { return mockUIStore; },
  get historyStore() { return mockHistoryStore; },
  get projectStore() { return mockProjectStore; },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockProfile,
}));

// ── Test suite ───────────────────────────────────────────────────

describe("HistorySheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSnapshots.snapshots = [];
    mockLoading.isLoading = false;
    mockError.error = null;
    mockTrabajaderas.trabajaderas = [];
    mockProfile.profile = { role: "capataz" };
  });

  it("shows locked state for costaleros (non-mando)", () => {
    mockProfile.profile = { role: "costalero" };
    render(<HistorySheet />);

    expect(screen.getByText(/Solo los mandos pueden ver el historial/)).toBeInTheDocument();
  });

  it("shows empty state call-to-action when no snapshots", () => {
    mockProfile.profile = { role: "capataz" };
    render(<HistorySheet />);

    expect(screen.getByText(/Aún no tienes instantáneas guardadas/)).toBeInTheDocument();
    expect(screen.getByText(/\+ Guardar plan actual/)).toBeInTheDocument();
  });

  it("displays snapshot list items", () => {
    mockProfile.profile = { role: "capataz" };
    mockSnapshots.snapshots = [
      {
        id: "snap-1",
        nombre: "Trabajadera 1 — 11/06/2026",
        created_at: "2026-06-11T10:00:00Z",
        trabajadera_count: 2,
        plan_summary: { status: "ok", salidas_por_trab: [3], tramos_por_trab: [5] },
        proyecto_nombre: "Paso Test",
        temporada_nombre: "2026",
      },
    ];

    render(<HistorySheet />);

    expect(screen.getByText("Trabajadera 1 — 11/06/2026")).toBeInTheDocument();
    expect(screen.getByText("✓ OK")).toBeInTheDocument();
    expect(screen.getByText("Ver")).toBeInTheDocument();
    expect(screen.getByText("Comparar")).toBeInTheDocument();
    expect(screen.getByText("Restaurar")).toBeInTheDocument();
    expect(screen.getByText("Borrar")).toBeInTheDocument();
  });

  it("shows incomplete badge when plan is not ok", () => {
    mockProfile.profile = { role: "capataz" };
    mockSnapshots.snapshots = [
      {
        id: "snap-2",
        nombre: "Partial Plan",
        created_at: "2026-06-11T10:00:00Z",
        trabajadera_count: 1,
        plan_summary: { status: "incomplete", salidas_por_trab: [2], tramos_por_trab: [3] },
      },
    ];

    render(<HistorySheet />);

    expect(screen.getByText("⚠ Incompleto")).toBeInTheDocument();
  });
});
