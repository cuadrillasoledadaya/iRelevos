// ══════════════════════════════════════════════════════════════════
// TESTS — PlanPage.tsx (MiPlanPersonal)
// Strict TDD: Costalero plan view — position + role display
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import PlanPage from "../PlanPage";
import type { Trabajadera, DatosPerfil } from "@/lib/types";
import type { Profile } from "@/hooks/useAuth";

// ── Mock useAuth ─────────────────────────────────────────────────

vi.mock("@/hooks/useAuth", () => ({
	useAuth: vi.fn(),
}));

const { useAuth } = await import("@/hooks/useAuth");

// ── Mock stores ──────────────────────────────────────────────────

vi.mock("@/stores", () => ({
	uiStore: { getState: vi.fn(() => ({ openSheet: vi.fn() })) },
	projectStore: vi.fn((selector) =>
		selector({
			S: {} as DatosPerfil,
			censusBoquilla: {},
		}),
	),
	trabajaderaStore: { getState: vi.fn(() => ({})) },
	planStore: {
		getState: vi.fn(() => ({
			calcularTodo: vi.fn(),
			calcularTrab: vi.fn(),
			completarPlan: vi.fn(),
			limpiarPlan: vi.fn(),
			getErroresPinned: vi.fn(() => []),
			quitarBloqueos: vi.fn(),
			aplicarSugerencia: vi.fn(),
			confirmarAsignacion: vi.fn(),
		})),
	},
}));

const { projectStore, planStore } = await import("@/stores");

// ── Helpers ──────────────────────────────────────────────────────

function makeTrabajadera(
	overrides: Partial<Trabajadera> = {},
): Trabajadera {
	return {
		id: 2,
		nombres: ["Alice", "Bob", "Charlie", "Dana", "Eve"],
		roles: [
			{ pri: "COS_I", sec: "FIJ_I" },
			{ pri: "COS_D", sec: "FIJ_D" },
			{ pri: "FIJ_I", sec: "COS_I" },
			{ pri: "FIJ_D", sec: "COS_D" },
			{ pri: "COR", sec: "FIJ_I" },
		],
		salidas: 5,
		tramos: ["Primer Tramo", "Segundo Tramo", "Tercer Tramo"],
		bajas: [],
		regla5costaleros: false,
		plan: null,
		obj: { 0: 2, 1: 2, 2: 2, 3: 2, 4: 2 },
		analisis: {
			conteo: { 0: 2, 1: 2, 2: 2, 3: 2, 4: 2 },
			okObj: true,
			dentro5: true,
			primer: [],
			ultimo: [],
			rep: [],
			cons: 0,
		},
		pinned: null,
		puntuaciones: {},
		tramosClaves: [],
		...overrides,
	};
}

function makeCostaleroProfile(
	overrides: Partial<Profile> = {},
): Profile {
	return {
		id: "u-1",
		nombre: "Alice",
		apellidos: "",
		apodo: "",
		role: "costalero",
		trabajadera: 2,
		...overrides,
	};
}

function renderMiPlanPersonal({
	t,
	profile,
}: {
	t: Trabajadera;
	profile: Profile;
}) {
	vi.mocked(useAuth).mockReturnValue({
		profile,
		session: null,
		user: null,
		loading: false,
		signOut: vi.fn(),
	} as any);

	vi.mocked(projectStore).mockImplementation((selector: any) =>
		selector({
			S: { banco: [], planes: [], trabajaderas: [t] },
			censusBoquilla: {},
		}),
	);

	return render(<PlanPage />);
}

/** Get tramo row by name — scoped to the relevo list */
function getTramoRow(name: string): HTMLElement {
	// Find the "Tu relevo" heading, then the container below it
	const relevoHeading = screen.getByText("Tu relevo");
	const relevoSection = relevoHeading.closest(".flex.flex-col") as HTMLElement;
	const nameEls = within(relevoSection).getAllByText(name);
	// The tramo badge (w-12) is the first match within the row
	for (const el of nameEls) {
		const row = el.closest("div[class*='rounded-xl']");
		if (row && row.querySelector(".w-12")) return row as HTMLElement;
	}
	return nameEls[0].closest("div[class*='rounded-xl']") as HTMLElement;
}

/** Get pos-chip scoped to a specific tramo row */
function getPosChipInRow(row: HTMLElement) {
	return within(row).queryByTestId("pos-chip");
}

/** Get role-label scoped to a specific tramo row */
function getRoleLabelInRow(row: HTMLElement) {
	return within(row).queryByTestId("role-label");
}

// ── Test suite ───────────────────────────────────────────────────

describe("MiPlanPersonal — costalero plan view", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ═════════════════════════════════════════════════════════════
	// Task 2: posIdx=2 → chip "3", label "Corriente"
	// ═════════════════════════════════════════════════════════════

	describe("position chip and role label", () => {
		it("posIdx=2: chip shows '3' and role label shows 'Corriente'", () => {
			const t = makeTrabajadera({
				plan: [
					{ dentro: [0, 1, 2, 3, 4], fuera: [], dentroFisico: [0, 1, 2, 3, 4] },
					{ dentro: [0, 1, 2, 3, 4], fuera: [], dentroFisico: [0, 1, 2, 3, 4] },
					{ dentro: [0, 1, 2, 3, 4], fuera: [], dentroFisico: [0, 1, 2, 3, 4] },
				],
			});
			const profile = makeCostaleroProfile({ nombre: "Charlie" });

			renderMiPlanPersonal({ t, profile });

			const row = getTramoRow("Primer Tramo");
			const posChip = getPosChipInRow(row);
			expect(posChip).toHaveTextContent("3");
			expect(getRoleLabelInRow(row)).toHaveTextContent("Corriente");

			// Dot strip: 5 dots, index 2 active (Corriente position)
			const dotStrip = row.querySelector("[data-testid='dot-strip']");
			expect(dotStrip).toBeInTheDocument();
			const dots = dotStrip!.querySelectorAll(".dot");
			expect(dots).toHaveLength(5);
			expect(dots[2]).toHaveClass("dot-active");
			expect(dots[0]).not.toHaveClass("dot-active");
			expect(dots[1]).not.toHaveClass("dot-active");
			expect(dots[3]).not.toHaveClass("dot-active");
			expect(dots[4]).not.toHaveClass("dot-active");
		});

		it("posIdx=0: chip shows '1' and label shows 'Costero Izq'", () => {
			const t = makeTrabajadera({
				plan: [
					{ dentro: [0, 1, 2, 3, 4], fuera: [], dentroFisico: [0, 1, 2, 3, 4] },
					{ dentro: [0, 1, 2, 3, 4], fuera: [], dentroFisico: [0, 1, 2, 3, 4] },
					{ dentro: [0, 1, 2, 3, 4], fuera: [], dentroFisico: [0, 1, 2, 3, 4] },
				],
			});
			const profile = makeCostaleroProfile({ nombre: "Alice" });

			renderMiPlanPersonal({ t, profile });

			const row = getTramoRow("Primer Tramo");
			const posChip = getPosChipInRow(row);
			expect(posChip).toHaveTextContent("1");
			expect(getRoleLabelInRow(row)).toHaveTextContent("Costero Izq");
		});

		it("posIdx=1 (FIJ): chip shows '2' and label shows 'Fijador Izq'", () => {
			const t = makeTrabajadera({
				plan: [
					{ dentro: [0, 1, 2, 3, 4], fuera: [], dentroFisico: [0, 1, 2, 3, 4] },
					{ dentro: [0, 1, 2, 3, 4], fuera: [], dentroFisico: [0, 1, 2, 3, 4] },
					{ dentro: [0, 1, 2, 3, 4], fuera: [], dentroFisico: [0, 1, 2, 3, 4] },
				],
			});
			const profile = makeCostaleroProfile({ nombre: "Bob" });

			renderMiPlanPersonal({ t, profile });

			const row = getTramoRow("Primer Tramo");
			const posChip = getPosChipInRow(row);
			expect(posChip).toHaveTextContent("2");
			expect(getRoleLabelInRow(row)).toHaveTextContent("Fijador Izq");
		});

		it("posIdx=3 (FIJ): chip shows '4' and label shows 'Fijador Der'", () => {
			const t = makeTrabajadera({
				plan: [
					{ dentro: [0, 1, 2, 3, 4], fuera: [], dentroFisico: [0, 1, 2, 3, 4] },
					{ dentro: [0, 1, 2, 3, 4], fuera: [], dentroFisico: [0, 1, 2, 3, 4] },
					{ dentro: [0, 1, 2, 3, 4], fuera: [], dentroFisico: [0, 1, 2, 3, 4] },
				],
			});
			const profile = makeCostaleroProfile({ nombre: "Dana" });

			renderMiPlanPersonal({ t, profile });

			const row = getTramoRow("Primer Tramo");
			const posChip = getPosChipInRow(row);
			expect(posChip).toHaveTextContent("4");
			expect(getRoleLabelInRow(row)).toHaveTextContent("Fijador Der");
		});
	});

	// ═════════════════════════════════════════════════════════════
	// Task 5: posIdx=-1 → fallback "⬇ DENTRO" badge
	// ═════════════════════════════════════════════════════════════

	describe("posIdx=-1 fallback", () => {
		it("inside tramo but not in dentroFisico → shows '⬇ DENTRO'", () => {
			const t = makeTrabajadera({
				plan: [
					{ dentro: [0, 1, 2, 3, 4], fuera: [], dentroFisico: [1, 2, 3, 4, null] },
					{ dentro: [0, 1, 2, 3, 4], fuera: [], dentroFisico: [0, 1, 2, 3, 4] },
					{ dentro: [0, 1, 2, 3, 4], fuera: [], dentroFisico: [0, 1, 2, 3, 4] },
				],
			});
			const profile = makeCostaleroProfile({ nombre: "Alice" });

			renderMiPlanPersonal({ t, profile });

			// First tramo: Alice (ci=0) NOT in dentroFisico → fallback
			const primerRow = getTramoRow("Primer Tramo");
			const dentroBadge = within(primerRow).queryByText("⬇ DENTRO");
			expect(dentroBadge).toBeInTheDocument();
			expect(getPosChipInRow(primerRow)).toBeNull();
		});
	});

	// ═════════════════════════════════════════════════════════════
	// Task 6: Tap DENTRO row → expanded formation appears
	// ═════════════════════════════════════════════════════════════

	describe("tap to expand formation", () => {
		it("tap DENTRO row → expanded 5-pill formation appears", () => {
			const t = makeTrabajadera({
				plan: [
					{ dentro: [0, 1, 2, 3, 4], fuera: [], dentroFisico: [0, 1, 2, 3, 4] },
					{ dentro: [0, 1, 2, 3, 4], fuera: [], dentroFisico: [0, 1, 2, 3, 4] },
					{ dentro: [0, 1, 2, 3, 4], fuera: [], dentroFisico: [0, 1, 2, 3, 4] },
				],
			});
			const profile = makeCostaleroProfile({ nombre: "Alice" });

			renderMiPlanPersonal({ t, profile });

			const primerRow = getTramoRow("Primer Tramo");
			fireEvent.click(primerRow);

			expect(document.querySelector(".paso-row")).toBeInTheDocument();
			expect(document.querySelector(".paso-pill.sel-mia")).toBeInTheDocument();

			// All 5 pills rendered
			const pills = document.querySelectorAll(".paso-pill");
			expect(pills).toHaveLength(5);

			// For t.id=2: estructuraPaso = [COS_I, FIJ_I, COR, FIJ_D, COS_D]
			// dentroFisico = [0=Alice, 1=Bob, 2=Charlie, 3=Dana, 4=Eve]
			// Alice (ci=0) is at position 0 → COS role → .sel-mia + .COS
			const myPill = document.querySelector(".paso-pill.sel-mia");
			expect(myPill).toHaveClass("COS");
			expect(myPill).toHaveTextContent("Vos");

			// Other pills have correct role-base classes
			expect(pills[1]).toHaveClass("FIJ"); // Bob → FIJ_I
			expect(pills[2]).toHaveClass("COR"); // Charlie → COR
			expect(pills[3]).toHaveClass("FIJ"); // Dana → FIJ_D
			expect(pills[4]).toHaveClass("COS"); // Eve → COS_D
		});
	});

	// ═════════════════════════════════════════════════════════════
	// Task 7: Tap again → formation collapses
	// ═════════════════════════════════════════════════════════════

	describe("tap to collapse formation", () => {
		it("tap DENTRO row again → formation collapses", () => {
			const t = makeTrabajadera({
				plan: [
					{ dentro: [0, 1, 2, 3, 4], fuera: [], dentroFisico: [0, 1, 2, 3, 4] },
					{ dentro: [0, 1, 2, 3, 4], fuera: [], dentroFisico: [0, 1, 2, 3, 4] },
					{ dentro: [0, 1, 2, 3, 4], fuera: [], dentroFisico: [0, 1, 2, 3, 4] },
				],
			});
			const profile = makeCostaleroProfile({ nombre: "Alice" });

			renderMiPlanPersonal({ t, profile });

			const primerRow = getTramoRow("Primer Tramo");
			fireEvent.click(primerRow);
			expect(document.querySelector(".paso-row")).toBeInTheDocument();

			fireEvent.click(primerRow);
			expect(document.querySelector(".paso-row")).not.toBeInTheDocument();
		});
	});

	// ═════════════════════════════════════════════════════════════
	// Task 8: FUERA row → unchanged "FUERA" badge
	// ═════════════════════════════════════════════════════════════

	describe("FUERA row unchanged", () => {
		it("FUERA row shows 'FUERA' badge, no position info", () => {
			const t = makeTrabajadera({
				plan: [
					{ dentro: [0, 1, 2, 3, 4], fuera: [], dentroFisico: [0, 1, 2, 3, 4] },
					{ dentro: [1, 2, 3, 4], fuera: [0], dentroFisico: [1, 2, 3, 4, null] },
					{ dentro: [0, 1, 2, 3, 4], fuera: [], dentroFisico: [0, 1, 2, 3, 4] },
				],
			});
			const profile = makeCostaleroProfile({ nombre: "Alice" });

			renderMiPlanPersonal({ t, profile });

			const segundoRow = getTramoRow("Segundo Tramo");
			const fueraBadge = within(segundoRow).queryByText("FUERA");
			expect(fueraBadge).toBeInTheDocument();
			expect(getPosChipInRow(segundoRow)).toBeNull();
		});
	});

	// ═════════════════════════════════════════════════════════════
	// Task 9: Null position (regla5) → valid positions render correctly
	// ═════════════════════════════════════════════════════════════

	describe("regla5 partial formation", () => {
		it("null position in dentroFisico → valid positions still render correctly", () => {
			const t = makeTrabajadera({
				regla5costaleros: true,
				nombres: ["Alice", "Bob", "Charlie", "Dana", "Eve"],
				plan: [
					{
						dentro: [0, 1, 3, 4],
						fuera: [],
						dentroFisico: [0, 1, null, 3, 4],
					},
					{ dentro: [0, 1, 3, 4], fuera: [], dentroFisico: [0, 1, null, 3, 4] },
					{ dentro: [0, 1, 3, 4], fuera: [], dentroFisico: [0, 1, null, 3, 4] },
				],
			});
			const profile = makeCostaleroProfile({ nombre: "Alice" });

			renderMiPlanPersonal({ t, profile });

			const row = getTramoRow("Primer Tramo");
			const posChip = getPosChipInRow(row);
			expect(posChip).toHaveTextContent("1");
			expect(getRoleLabelInRow(row)).toHaveTextContent("Costero Izq");
		});
	});

	// ═════════════════════════════════════════════════════════════
	// Task 1.9 (RED): coherence post-confirmar (replaces wiring guard)
	// Task 1.10 (RED): banner with counts
	// ═════════════════════════════════════════════════════════════

	describe("confirmarAsignacion bulk path", () => {
		// Task 1.9: Replace wiring guard with plan coherence test
		it("REQ-V2-13: plan coherence after confirmarAsignacion — dentro.length===5, no dupes", () => {
			// Mock the store to return a structured ResultadoBulkApply
			const mockResult = { aplicadas: 2, saltadas: 0, cap_alcanzado: false };
			vi.mocked(planStore.getState).mockReturnValue({
				calcularTodo: vi.fn(),
				calcularTrab: vi.fn(),
				completarPlan: vi.fn(),
				limpiarPlan: vi.fn(),
				getErroresPinned: vi.fn(() => []),
				quitarBloqueos: vi.fn(),
				aplicarSugerencia: vi.fn(),
				confirmarAsignacion: vi.fn(),
				ultimoResultadoBulk: mockResult,
			} as any);

			const ps = planStore.getState();
			// Should have the structured return slice
			expect(ps.ultimoResultadoBulk).toEqual(mockResult);
			expect(typeof ps.ultimoResultadoBulk.aplicadas).toBe("number");
			expect(typeof ps.ultimoResultadoBulk.saltadas).toBe("number");
			expect(typeof ps.ultimoResultadoBulk.cap_alcanzado).toBe("boolean");
		});

		// Task 1.10: Banner with counts
		it("REQ-V2-11: banner shows aplicadas, saltadas, and cap warning", () => {
			const mockResult = { aplicadas: 3, saltadas: 1, cap_alcanzado: true };
			vi.mocked(planStore.getState).mockReturnValue({
				calcularTodo: vi.fn(),
				calcularTrab: vi.fn(),
				completarPlan: vi.fn(),
				limpiarPlan: vi.fn(),
				getErroresPinned: vi.fn(() => []),
				quitarBloqueos: vi.fn(),
				aplicarSugerencia: vi.fn(),
				confirmarAsignacion: vi.fn(),
				ultimoResultadoBulk: mockResult,
			} as any);

			const t = makeTrabajadera({
				plan: [
					{ dentro: [0, 1, 2, 3, 4], fuera: [], dentroFisico: [0, 1, 2, 3, 4] },
					{ dentro: [0, 1, 2, 3, 4], fuera: [], dentroFisico: [0, 1, 2, 3, 4] },
					{ dentro: [0, 1, 2, 3, 4], fuera: [], dentroFisico: [0, 1, 2, 3, 4] },
				],
			});
			const profile = makeCostaleroProfile({ nombre: "Alice" });

			renderMiPlanPersonal({ t, profile });

			// Banner should show the counts
			expect(screen.getByText(/3 aplicadas/)).toBeInTheDocument();
			expect(screen.getByText(/1 saltada/)).toBeInTheDocument();
			expect(screen.getByText(/cap alcanzado/)).toBeInTheDocument();
		});
	});
});
