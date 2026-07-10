// ══════════════════════════════════════════════════════════════════
// TESTS — PreviewCorreccionesSheet.tsx
// Strict TDD: preview-then-apply UX for bulk corrections
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PreviewCorreccionesSheet from "../PreviewCorreccionesSheet";
import type { Trabajadera, DatosPerfil } from "@/lib/types";
import type { BulkCorreccionesPreview } from "@/lib/algoritmos";

// ── Mock stores ──────────────────────────────────────────────────

let currentPreview: BulkCorreccionesPreview | null = null;
const mockConfirmar = vi.fn();

vi.mock("@/stores", () => ({
	projectStore: vi.fn((selector) =>
		selector({
			S: { trabajaderas: [] as Trabajadera[] },
		}),
	),
	planStore: Object.assign(
		vi.fn(() => ({})),
		{
			getState: vi.fn(() => ({
				previsualizarCorreccionesBulk: vi.fn(() => currentPreview),
				confirmarCorreccionesBulk: mockConfirmar,
			})),
		},
	),
}));

const { projectStore, planStore } = await import("@/stores");

// ── Helpers ──────────────────────────────────────────────────────

function makeTrabajadera(
	overrides: Partial<Trabajadera> = {},
): Trabajadera {
	return {
		id: 1,
		nombres: ["Alice", "Bob", "Charlie", "Dana", "Eve"],
		roles: [
			{ pri: "COS_I", sec: "FIJ_I" },
			{ pri: "COS_D", sec: "FIJ_D" },
			{ pri: "FIJ_I", sec: "COS_I" },
			{ pri: "FIJ_D", sec: "COS_D" },
			{ pri: "COR", sec: "FIJ_I" },
		],
		salidas: 3,
		tramos: ["T1", "T2", "T3"],
		bajas: [],
		regla5costaleros: false,
		plan: null,
		obj: { 0: 1, 1: 1, 2: 1, 3: 0, 4: 0 },
		analisis: {
			conteo: { 0: 1, 1: 1, 2: 1, 3: 0, 4: 0 },
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

function makePreview(
	correcciones: BulkCorreccionesPreview["correcciones"] = [],
	summary: BulkCorreccionesPreview["summary"] = {},
): BulkCorreccionesPreview {
	return { correcciones, summary };
}

function renderSheet({
	t,
	preview,
	open = true,
}: {
	t: Trabajadera;
	preview: BulkCorreccionesPreview | null;
	open?: boolean;
}) {
	currentPreview = preview;

	vi.mocked(projectStore).mockImplementation((selector: any) =>
		selector({
			S: { trabajaderas: [t] },
		}),
	);

	const onClose = vi.fn();
	const result = render(
		<PreviewCorreccionesSheet tid={t.id} open={open} onClose={onClose} />,
	);
	return { ...result, onClose };
}

// ── Test suite ───────────────────────────────────────────────────

describe("PreviewCorreccionesSheet", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		currentPreview = null;
	});

	// REQ-CORR-V3-6: corrections present
	it("renders corrections with preview-row, Aplicar+Cancelar buttons, no Cerrar", () => {
		const t = makeTrabajadera({
			plan: [
				{ dentro: [1, 2, 3, 4, 0], fuera: [] },
				{ dentro: [0, 2, 3, 4, 1], fuera: [] },
				{ dentro: [0, 1, 3, 4, 2], fuera: [] },
			],
		});
		const preview = makePreview(
			[
				{
					tipo: "saldo",
					costaleroA: { nombre: "Alice", idx: 0, problema: "Needs 1 more" },
					costaleroB: { nombre: "Bob", idx: 1, solucion: "Can give 1" },
					tramoOrigen: 0,
					tramoDestino: 1,
					impacto: "Swap T1↔T2",
					prioridad: 2,
				},
				{
					tipo: "consecutivo",
					costaleroA: { nombre: "Charlie", idx: 2, problema: "Consecutive" },
					costaleroB: { nombre: "Dana", idx: 3, solucion: "Swap" },
					tramoOrigen: 1,
					tramoDestino: 2,
					impacto: "Separate consecutive",
					prioridad: 2,
				},
			],
			{ "T1↔T2": 1, "T2↔T3": 1 },
		);

		const { onClose } = renderSheet({ t, preview });

		// 2 preview rows
		const rows = screen.getAllByTestId("preview-row");
		expect(rows).toHaveLength(2);

		// Buttons present
		expect(screen.getByTestId("preview-aplicar")).toBeInTheDocument();
		expect(screen.getByTestId("preview-cancelar")).toBeInTheDocument();

		// Cerrar should NOT be present
		expect(screen.queryByTestId("preview-cerrar")).not.toBeInTheDocument();

		// Summary text
		const summary = screen.getByTestId("preview-summary");
		expect(summary.textContent).toContain("2 corrección(es)");
		expect(summary.textContent).toContain("T1↔T2: 1");
		expect(summary.textContent).toContain("T2↔T3: 1");
	});

	// REQ-CORR-V3-6: empty preview
	it("empty preview shows only Cerrar button, no Aplicar/Cancelar", () => {
		const t = makeTrabajadera({
			plan: [
				{ dentro: [1, 2, 3, 4, 0], fuera: [] },
				{ dentro: [0, 2, 3, 4, 1], fuera: [] },
			],
		});
		// null preview = no corrections
		const { onClose } = renderSheet({ t, preview: null });

		// Empty message
		expect(screen.getByTestId("preview-empty")).toBeInTheDocument();
		expect(screen.getByTestId("preview-empty")).toHaveTextContent(
			"No hay correcciones para aplicar — el plan está al día",
		);

		// Only Cerrar button
		expect(screen.getByTestId("preview-cerrar")).toBeInTheDocument();
		expect(screen.queryByTestId("preview-aplicar")).not.toBeInTheDocument();
		expect(screen.queryByTestId("preview-cancelar")).not.toBeInTheDocument();
	});

	// REQ-CORR-V3-7: Aplicar triggers store action
	it("Aplicar calls confirmarCorreccionesBulk(tid) and onClose", () => {
		const t = makeTrabajadera({
			plan: [
				{ dentro: [1, 2, 3, 4, 0], fuera: [] },
				{ dentro: [0, 2, 3, 4, 1], fuera: [] },
			],
		});
		const preview = makePreview(
			[
				{
					tipo: "saldo",
					costaleroA: { nombre: "Alice", idx: 0, problema: "" },
					costaleroB: { nombre: "Bob", idx: 1, solucion: "" },
					tramoOrigen: 0,
					tramoDestino: 1,
					impacto: "",
				},
			],
			{ "T1↔T2": 1 },
		);

		const { onClose } = renderSheet({ t, preview });

		fireEvent.click(screen.getByTestId("preview-aplicar"));

		expect(mockConfirmar).toHaveBeenCalledWith(t.id);
		expect(onClose).toHaveBeenCalled();
	});

	// REQ-CORR-V3-7: Cancelar is no-op
	it("Cancelar calls onClose without store mutations", () => {
		const t = makeTrabajadera({
			plan: [
				{ dentro: [1, 2, 3, 4, 0], fuera: [] },
				{ dentro: [0, 2, 3, 4, 1], fuera: [] },
			],
		});
		const preview = makePreview(
			[
				{
					tipo: "saldo",
					costaleroA: { nombre: "Alice", idx: 0, problema: "" },
					costaleroB: { nombre: "Bob", idx: 1, solucion: "" },
					tramoOrigen: 0,
					tramoDestino: 1,
					impacto: "",
				},
			],
			{ "T1↔T2": 1 },
		);

		const { onClose } = renderSheet({ t, preview });

		fireEvent.click(screen.getByTestId("preview-cancelar"));

		expect(mockConfirmar).not.toHaveBeenCalled();
		expect(onClose).toHaveBeenCalled();
	});

	// REQ-CORR-V3-8: CSS snapshot — borderLeftColor is non-empty RGB
	it("preview-row has non-empty borderLeftColor (CSS var resolves)", () => {
		const t = makeTrabajadera({
			plan: [
				{ dentro: [1, 2, 3, 4, 0], fuera: [] },
				{ dentro: [0, 2, 3, 4, 1], fuera: [] },
			],
		});
		const preview = makePreview(
			[
				{
					tipo: "saldo",
					costaleroA: { nombre: "Alice", idx: 0, problema: "" },
					costaleroB: { nombre: "Bob", idx: 1, solucion: "" },
					tramoOrigen: 0,
					tramoDestino: 1,
					impacto: "",
				},
			],
			{ "T1↔T2": 1 },
		);

		renderSheet({ t, preview });

		const row = screen.getByTestId("preview-row");
		const style = window.getComputedStyle(row);
		// borderLeftColor should resolve to a non-empty value (RGB/RGBA, not empty)
		expect(style.borderLeftColor).not.toBe("");
		expect(style.borderLeftColor).not.toBe("rgba(0, 0, 0, 0)");
	});
});
