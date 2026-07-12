// ══════════════════════════════════════════════════════════════════
// TESTS — ViolationsBanner.tsx (REQ-PLANPREC-7+8)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ViolationsBanner from "../ViolationsBanner";
import type { Violation } from "@/lib/algoritmos";

describe("ViolationsBanner", () => {
	it("REQ-PLANPREC-8: renders fueramax violation with kind label and message", () => {
		const violations: Violation[] = [
			{ kind: "fueramax", ti: 0, pinned: 3, max: 2 },
		];

		render(<ViolationsBanner violations={violations} />);

		// Kind label
		expect(screen.getByText("F máxima excedida")).toBeInTheDocument();
		// Human-readable message: "T1: 3 fijados fuera (máx. 2)"
		expect(screen.getByText("T1: 3 fijados fuera (máx. 2)")).toBeInTheDocument();
		// Left border bar element
		expect(screen.getByTestId("violation-bar")).toBeInTheDocument();
		// Row container
		expect(screen.getByTestId("violation-row")).toBeInTheDocument();
	});

	it("REQ-PLANPREC-8: renders pin violation with kind label and message", () => {
		const violations: Violation[] = [
			{ kind: "pin", ti: 1, message: "Tramo 2: 6 fijados dentro (máx. 5)" },
		];

		render(<ViolationsBanner violations={violations} />);

		expect(screen.getByText("Fijación inviable")).toBeInTheDocument();
		expect(screen.getByText("Tramo 2: 6 fijados dentro (máx. 5)")).toBeInTheDocument();
	});

	it("REQ-PLANPREC-8: renders consecutivos violation", () => {
		const violations: Violation[] = [
			{ kind: "consecutivos", ti: 0, count: 2 },
		];

		render(<ViolationsBanner violations={violations} />);

		expect(screen.getByText("Salidas consecutivas")).toBeInTheDocument();
		expect(screen.getByText("T1: 2 salidas consecutivas")).toBeInTheDocument();
	});

	it("REQ-PLANPREC-8: renders repeticion violation", () => {
		const violations: Violation[] = [
			{ kind: "repeticion", ti1: 0, ti2: 2, idx: 0 },
		];

		render(<ViolationsBanner violations={violations} />);

		expect(screen.getByText("Repetición 1º/último")).toBeInTheDocument();
	});

	it("REQ-PLANPREC-8: renders dentro5 violation", () => {
		const violations: Violation[] = [
			{ kind: "dentro5", ti: 0, actual: 4 },
		];

		render(<ViolationsBanner violations={violations} />);

		expect(screen.getByText("Dentro ≠ 5")).toBeInTheDocument();
		expect(screen.getByText("T1: 4 dentro (esperado 5)")).toBeInTheDocument();
	});

	it("REQ-PLANPREC-8: renders multiple violations as separate rows", () => {
		const violations: Violation[] = [
			{ kind: "fueramax", ti: 0, pinned: 3, max: 2 },
			{ kind: "pin", ti: 1, message: "Tramo 2: imposible completar 5 dentro" },
		];

		render(<ViolationsBanner violations={violations} />);

		const rows = screen.getAllByTestId("violation-row");
		expect(rows).toHaveLength(2);
	});
});
