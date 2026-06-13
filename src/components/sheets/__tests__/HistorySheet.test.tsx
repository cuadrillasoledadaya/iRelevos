// ══════════════════════════════════════════════════════════════════
// TESTS — HistorySheet.tsx (plan-history — single trabajadera)
// List, save, and manage plan snapshots per trabajadera
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
const mockActiveTemporadaId = { activeTemporadaId: "temp-1" };
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

const mockTemporadaStore = vi.fn((selector?: (s: any) => any) => {
  if (typeof selector === "function") {
    return selector({ activeTemporadaId: mockActiveTemporadaId.activeTemporadaId });
  }
  return { activeTemporadaId: mockActiveTemporadaId.activeTemporadaId };
}) as any;

const mockHistoryStore = vi.fn((selector?: (s: any) => any) => {
  if (typeof selector === "function") {
    return selector({ ...mockSnapshots, ...mockLoading, ...mockError, selectedTrabajaderaId: null });
  }
  return {
    snapshots: mockSnapshots.snapshots,
    isLoading: mockLoading.isLoading,
    error: mockError.error,
    selectedTrabajaderaId: null,
    setSelectedTrabajaderaId: vi.fn(),
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
  selectedTrabajaderaId: null,
  setSelectedTrabajaderaId: vi.fn(),
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
  get temporadaStore() { return mockTemporadaStore; },
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
    mockActiveTemporadaId.activeTemporadaId = "temp-1";
    mockProfile.profile = { role: "capataz" };
  });

  it("shows locked state for costaleros (non-mando)", () => {
    mockProfile.profile = { role: "costalero" };
    render(<HistorySheet />);

    expect(screen.getByText(/Solo los mandos pueden ver el historial/)).toBeInTheDocument();
  });

  it("shows empty state call-to-action when no snapshots", () => {
    mockProfile.profile = { role: "capataz" };
    mockTrabajaderas.trabajaderas = [{ id: 1, analisis: { okObj: true } }];
    render(<HistorySheet />);

    expect(screen.getByText(/Aún no tienes instantáneas guardadas/)).toBeInTheDocument();
    expect(screen.getByText(/\+ Guardar plan actual/)).toBeInTheDocument();
  });

  it("displays snapshot list items", () => {
    mockProfile.profile = { role: "capataz" };
    mockTrabajaderas.trabajaderas = [{ id: 1, analisis: { okObj: true } }];
    mockSnapshots.snapshots = [
      {
        id: "snap-1",
        nombre: "Trabajadera 1 — 11/06/2026",
        created_at: "2026-06-11T10:00:00Z",
        trabajadera_id: 1,
        plan_summary: { status: "ok", salidas: 3, tramos: 5 },
        proyecto_nombre: "Paso Test",
        temporada_nombre: "2026",
      },
    ];

    render(<HistorySheet />);

    expect(screen.getByText("Trabajadera 1 — 11/06/2026")).toBeInTheDocument();
    expect(screen.getByText(/ OK/)).toBeInTheDocument();
    expect(screen.getByText("Ver")).toBeInTheDocument();
    expect(screen.getByText("Comparar")).toBeInTheDocument();
    expect(screen.getByText("Restaurar")).toBeInTheDocument();
    expect(screen.getByText("Borrar")).toBeInTheDocument();
  });

  it("shows incomplete badge when plan is not ok", () => {
    mockProfile.profile = { role: "capataz" };
    mockTrabajaderas.trabajaderas = [{ id: 1, analisis: { okObj: true } }];
    mockSnapshots.snapshots = [
      {
        id: "snap-2",
        nombre: "Partial Plan",
        created_at: "2026-06-11T10:00:00Z",
        trabajadera_id: 1,
        plan_summary: { status: "incomplete", salidas: 2, tramos: 3 },
      },
    ];

    render(<HistorySheet />);

    expect(screen.getByText(/Incompleto/)).toBeInTheDocument();
  });
});
