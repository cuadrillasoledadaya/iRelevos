// ══════════════════════════════════════════════════════════════════
// TESTS — ConfigPage.tsx (Cuadrilla Doblada Configuration)
// Strict TDD: REQ-UI-CFG-1 through REQ-UI-CFG-5
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ConfigPage from "../ConfigPage";
import type { Trabajadera, DatosPerfil } from "@/lib/types";
import type { Profile } from "@/hooks/useAuth";

// ── Mock useAuth ─────────────────────────────────────────────────

vi.mock("@/hooks/useAuth", () => ({
	useAuth: vi.fn(),
}));

const { useAuth } = await import("@/hooks/useAuth");

// ── Mock stores ──────────────────────────────────────────────────

// Shared mutable state so projectStore.getState() reflects mutations
let mockState: {
	S: DatosPerfil;
} = { S: {} as DatosPerfil };

function resetMockState(trabajaderas: Trabajadera[]) {
	mockState = {
		S: { banco: [], planes: [], trabajaderas: [...trabajaderas] },
	};
}

const mockToggleCuadrillaDoblada = vi.fn(() => ({
	anterior: false,
	nuevo: true,
	distribucionAplicada: { a: [0, 1, 2, 3, 4, 5], b: [6, 7, 8, 9, 10, 11] },
	pinsInvalidated: false,
}));

const mockSetTipoTramo = vi.fn((tid: number, ti: number, tipo: string) => {
	// Actually mutate the shared state so handleTipoChange can read current value
	const t = mockState.S.trabajaderas?.find((w) => w.id === tid);
	if (t) {
		if (!t.tramosTipo) t.tramosTipo = Array(t.tramos.length).fill("primario");
		t.tramosTipo[ti] = tipo as "primario" | "secundario";
	}
});
const mockSetDistribucionCuadrillas = vi.fn();
const mockSetActivePage = vi.fn();

const mockTrabajaderaStoreState = {
	setSalidas: vi.fn(),
	addTramo: vi.fn(),
	delTramo: vi.fn(),
	setNombreTramo: vi.fn(),
	toggleTramoClave: vi.fn(),
	toggleCuadrillaDoblada: mockToggleCuadrillaDoblada,
	setTipoTramo: mockSetTipoTramo,
	setDistribucionCuadrillas: mockSetDistribucionCuadrillas,
};

vi.mock("@/stores", () => ({
	uiStore: {
		getState: vi.fn(() => ({
			openSheet: vi.fn(),
			setCellTarget: vi.fn(),
			setBancoTarget: vi.fn(),
			setActivePage: vi.fn(() => mockSetActivePage()),
		})),
	},
	bancoStore: {
		getState: vi.fn(() => ({
			addBanco: vi.fn(),
			delBanco: vi.fn(),
			editBanco: vi.fn(),
			reorderBanco: vi.fn(),
			limpiarBanco: vi.fn(),
		})),
	},
	projectStore: Object.assign(
		vi.fn((selector) =>
			selector({
				S: {} as DatosPerfil,
				censusBoquilla: {},
				vaciarCenso: vi.fn(),
			}),
		),
		{ getState: vi.fn(() => mockState) },
	),
	trabajaderaStore: {
		getState: vi.fn(() => mockTrabajaderaStoreState),
	},
	planStore: {
		getState: vi.fn(() => ({
			calcularTodo: vi.fn(),
			calcularTrab: vi.fn(),
			resetTodo: vi.fn(),
			limpiarPlanificacion: vi.fn(),
			limpiarTrabajaderas: vi.fn(),
			limpiarPlan: vi.fn(),
			addPlan: vi.fn(),
			updatePlan: vi.fn(),
			updatePlanTramos: vi.fn(),
			delPlan: vi.fn(),
			cargarPlanEnTrabajadera: vi.fn(),
		})),
	},
}));

const { projectStore, trabajaderaStore } = await import("@/stores");

// ── Helpers ──────────────────────────────────────────────────────

function makeTrabajadera(
	overrides: Partial<Trabajadera> = {},
): Trabajadera {
	return {
		id: 1,
		nombres: [
			"Alice", "Bob", "Charlie", "Dana", "Eve",
			"Frank", "Grace", "Hank", "Ivy", "Jack", "Kate", "Leo",
		],
		roles: Array(12).fill({ pri: "COR" as const, sec: "FIJ_I" as const }),
		salidas: 2,
		tramos: ["T1", "T2", "T3"],
		bajas: [],
		regla5costaleros: false,
		plan: null,
		obj: null,
		analisis: null,
		pinned: null,
		puntuaciones: {},
		tramosClaves: [],
		cuadrillaDoblada: false,
		tramosTipo: ["primario", "primario", "primario"],
		distribucionCuadrillas: null,
		...overrides,
	};
}

function makeMandoProfile(
	overrides: Partial<Profile> = {},
): Profile {
	return {
		id: "u-1",
		nombre: "Capataz",
		apellidos: "Test",
		apodo: "",
		role: "capataz",
		trabajadera: 1,
		...overrides,
	};
}

function renderConfigPage({
	trabajaderas = [makeTrabajadera()],
	profile = makeMandoProfile(),
}: {
	trabajaderas?: Trabajadera[];
	profile?: Profile;
} = {}) {
	// Initialize shared mutable state with deep copies
	resetMockState(trabajaderas.map((t) => ({ ...t, tramosTipo: t.tramosTipo ? [...t.tramosTipo] : undefined, distribucionCuadrillas: t.distribucionCuadrillas ? { a: [...t.distribucionCuadrillas.a], b: [...t.distribucionCuadrillas.b] } : null }) as Trabajadera));

	vi.mocked(useAuth).mockReturnValue({
		profile,
		session: null,
		user: null,
		loading: false,
		signOut: vi.fn(),
	} as any);

	vi.mocked(projectStore).mockImplementation((selector: any) =>
		selector({
			S: { banco: [], planes: [], trabajaderas },
			censusBoquilla: {},
			vaciarCenso: vi.fn(),
		}),
	);

	return render(<ConfigPage />);
}

// ── Test suite ───────────────────────────────────────────────────

describe("ConfigPage — Cuadrilla Doblada Configuration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockToggleCuadrillaDoblada.mockReturnValue({
			anterior: false,
			nuevo: true,
			distribucionAplicada: { a: [0, 1, 2, 3, 4, 5], b: [6, 7, 8, 9, 10, 11] },
			pinsInvalidated: false,
		});
	});

	// ═════════════════════════════════════════════════════════════
	// REQ-UI-CFG-1: Master cuadrillaDoblada toggle
	// ═════════════════════════════════════════════════════════════

	describe("REQ-UI-CFG-1: Master toggle", () => {
		it("renders toggle with OFF state when cuadrillaDoblada is false", () => {
			const t = makeTrabajadera({ cuadrillaDoblada: false });
			renderConfigPage({ trabajaderas: [t] });

			// Toggle should show OFF
			expect(screen.getByText("OFF")).toBeInTheDocument();
			expect(screen.getByText("Doblada")).toBeInTheDocument();
		});

		it("renders toggle with ON state when cuadrillaDoblada is true", () => {
			const t = makeTrabajadera({
				cuadrillaDoblada: true,
				distribucionCuadrillas: { a: [0, 1, 2, 3, 4, 5], b: [6, 7, 8, 9, 10, 11] },
			});
			renderConfigPage({ trabajaderas: [t] });

			expect(screen.getByText("ON")).toBeInTheDocument();
		});

		it("calling toggle calls toggleCuadrillaDoblada store action", () => {
			const t = makeTrabajadera({ cuadrillaDoblada: false });
			renderConfigPage({ trabajaderas: [t] });

			const toggleBtn = screen.getByRole("button", { name: /Doblada/i });
			fireEvent.click(toggleBtn);

			expect(mockToggleCuadrillaDoblada).toHaveBeenCalledWith(t.id);
		});

		it("toggle is not rendered for non-mando users", () => {
			const t = makeTrabajadera({ cuadrillaDoblada: false });
			renderConfigPage({
				trabajaderas: [t],
				profile: makeMandoProfile({ role: "costalero" }),
			});

			// The toggle requires esMando && totalActivos >= 10
			// For non-mando, the cuadrilla doblada section should not render
			expect(screen.queryByText("Doblada")).not.toBeInTheDocument();
		});
	});

	// ═════════════════════════════════════════════════════════════
	// REQ-UI-CFG-2: Per-tramo primary/secondary selector
	// ═════════════════════════════════════════════════════════════

	describe("REQ-UI-CFG-2: Per-tramo P/S selector", () => {
		it("P/S buttons render when cuadrillaDoblada is true", () => {
			const t = makeTrabajadera({
				cuadrillaDoblada: true,
				tramos: ["T1", "T2"],
				tramosTipo: ["primario", "primario"],
			});
			renderConfigPage({ trabajaderas: [t] });

			// Should see P buttons for each tramo
			const pButtons = screen.getAllByText("P");
			expect(pButtons.length).toBeGreaterThanOrEqual(2);

			// Should see S buttons for each tramo
			const sButtons = screen.getAllByText("S");
			expect(sButtons.length).toBeGreaterThanOrEqual(2);
		});

		it("P/S buttons are hidden when cuadrillaDoblada is false", () => {
			const t = makeTrabajadera({
				cuadrillaDoblada: false,
				tramos: ["T1", "T2"],
			});
			renderConfigPage({ trabajaderas: [t] });

			// No P or S buttons should appear
			expect(screen.queryByText("P")).not.toBeInTheDocument();
			expect(screen.queryByText("S")).not.toBeInTheDocument();
		});

		it("clicking S calls setTipoTramo with correct args", () => {
			const t = makeTrabajadera({
				cuadrillaDoblada: true,
				tramos: ["T1", "T2", "T3"],
				tramosTipo: ["primario", "primario", "primario"],
			});
			renderConfigPage({ trabajaderas: [t] });

			// Get all S buttons and click the first one
			const sButtons = screen.getAllByText("S");
			fireEvent.click(sButtons[0]);

			expect(mockSetTipoTramo).toHaveBeenCalledWith(t.id, 0, "secundario");
		});

		it("clicking P calls setTipoTramo with primario", () => {
			const t = makeTrabajadera({
				cuadrillaDoblada: true,
				tramos: ["T1", "T2"],
				tramosTipo: ["secundario", "primario"],
			});
			renderConfigPage({ trabajaderas: [t] });

			const pButtons = screen.getAllByText("P");
			fireEvent.click(pButtons[0]);

			expect(mockSetTipoTramo).toHaveBeenCalledWith(t.id, 0, "primario");
		});
	});

	// ═════════════════════════════════════════════════════════════
	// REQ-UI-CFG-3: A/B distribution editor
	// ═════════════════════════════════════════════════════════════

	describe("REQ-UI-CFG-3: Distribution editor", () => {
		it("shows distribution summary with A/B counts when active", () => {
			const t = makeTrabajadera({
				cuadrillaDoblada: true,
				distribucionCuadrillas: { a: [0, 1, 2, 3, 4, 5], b: [6, 7, 8, 9, 10, 11] },
			});
			renderConfigPage({ trabajaderas: [t] });

			// Should show "A: 6 / B: 6"
			expect(screen.getByText(/A:/)).toBeInTheDocument();
			expect(screen.getByText(/B:/)).toBeInTheDocument();
		});

		it("clicking 'Editar distribución' opens the editor", () => {
			const t = makeTrabajadera({
				cuadrillaDoblada: true,
				distribucionCuadrillas: { a: [0, 1, 2, 3, 4, 5], b: [6, 7, 8, 9, 10, 11] },
			});
			renderConfigPage({ trabajaderas: [t] });

			const editBtn = screen.getByText(/Editar distribución/);
			fireEvent.click(editBtn);

			// DistributionEditor should render — it has "Cuadrilla A (N)" and "Cuadrilla B (N)" labels
			expect(screen.getByText(/Cuadrilla A/)).toBeInTheDocument();
			expect(screen.getByText(/Cuadrilla B/)).toBeInTheDocument();
		});

		it("editor shows Cancelar button", async () => {
			const t = makeTrabajadera({
				cuadrillaDoblada: true,
				distribucionCuadrillas: { a: [0, 1, 2, 3, 4, 5], b: [6, 7, 8, 9, 10, 11] },
			});
			renderConfigPage({ trabajaderas: [t] });

			screen.getByText(/Editar distribución/).click();

			// Wait for DistributionEditor to render
			await waitFor(() => {
				expect(screen.getByText(/Cancelar/)).toBeInTheDocument();
			});
		});
	});

	// ═════════════════════════════════════════════════════════════
	// REQ-UI-CFG-4: Validation — at least one primario required
	// ═════════════════════════════════════════════════════════════

	describe("REQ-UI-CFG-4: Validation — at least one primario", () => {
		it("clicking S on a tramo calls setTipoTramo with 'secundario'", () => {
			const t = makeTrabajadera({
				cuadrillaDoblada: true,
				tramos: ["T1", "T2", "T3"],
				tramosTipo: ["primario", "primario", "secundario"],
			});
			renderConfigPage({ trabajaderas: [t] });

			const sButtons = screen.getAllByText("S");
			fireEvent.click(sButtons[0]);

			expect(mockSetTipoTramo).toHaveBeenCalledWith(t.id, 0, "secundario");
		});

		it("clicking P on a tramo calls setTipoTramo with 'primario'", () => {
			const t = makeTrabajadera({
				cuadrillaDoblada: true,
				tramos: ["T1", "T2"],
				tramosTipo: ["secundario", "primario"],
			});
			renderConfigPage({ trabajaderas: [t] });

			const pButtons = screen.getAllByText("P");
			fireEvent.click(pButtons[0]);

			expect(mockSetTipoTramo).toHaveBeenCalledWith(t.id, 0, "primario");
		});

		it("REQ-UI-CFG-4: all-secundario shows error and blocks store mutation", () => {
			const t = makeTrabajadera({
				cuadrillaDoblada: true,
				tramos: ["T1", "T2"],
				tramosTipo: ["primario", "primario"],
			});
			renderConfigPage({ trabajaderas: [t] });

			// Click S on tramo 0 → now [S, P] — still valid, no error
			const sButtons = screen.getAllByText("S");
			fireEvent.click(sButtons[0]);

			// No error yet (tramo 1 is still primario)
			expect(screen.queryByText(/Al menos un tramo debe ser primario/i)).not.toBeInTheDocument();

			// Click S on tramo 1 → now [S, S] — ALL secundario, error should appear
			const sButtonsAfter = screen.getAllByText("S");
			fireEvent.click(sButtonsAfter[1]);

			// Error must be visible in the DOM
			expect(screen.getByText(/Al menos un tramo debe ser primario/i)).toBeInTheDocument();

			// The store should NOT have been mutated with the last secundario change
			// (the last call to setTipoTramo should NOT be the all-S one)
			const allSecundarioCalls = mockSetTipoTramo.mock.calls.filter(
				(call) => call[2] === "secundario",
			);
			// Only 1 secundario call (the first one that was valid), not 2
			expect(allSecundarioCalls.length).toBe(1);
		});
	});

	// ═════════════════════════════════════════════════════════════
	// REQ-UI-CFG-5: Mando-only access
	// ═════════════════════════════════════════════════════════════

	describe("REQ-UI-CFG-5: Mando-only access", () => {
		it("non-mando (costalero) cannot see editing controls", () => {
			const t = makeTrabajadera({ cuadrillaDoblada: false });
			renderConfigPage({
				trabajaderas: [t],
				profile: makeMandoProfile({ role: "costalero" }),
			});

			// No toggle, no P/S buttons, no distribution editor trigger
			expect(screen.queryByText("Doblada")).not.toBeInTheDocument();
			expect(screen.queryByText("P")).not.toBeInTheDocument();
			expect(screen.queryByText("S")).not.toBeInTheDocument();
		});

		it("capataz can see all editing controls", () => {
			const t = makeTrabajadera({
				cuadrillaDoblada: true,
				tramos: ["T1"],
				tramosTipo: ["primario"],
				distribucionCuadrillas: { a: [0, 1, 2, 3, 4, 5], b: [6, 7, 8, 9, 10, 11] },
			});
			renderConfigPage({
				trabajaderas: [t],
				profile: makeMandoProfile({ role: "capataz" }),
			});

			expect(screen.getByText("Doblada")).toBeInTheDocument();
			expect(screen.getByText("P")).toBeInTheDocument();
			expect(screen.getByText("S")).toBeInTheDocument();
		});
	});
});
