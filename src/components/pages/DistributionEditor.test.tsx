// ══════════════════════════════════════════════════════════════════
// TESTS — DistributionEditor component
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DistributionEditor from "./DistributionEditor";

vi.mock("@/stores", () => ({
  trabajaderaStore: {
    getState: vi.fn(() => ({
      setDistribucionCuadrillas: vi.fn(),
    })),
  },
}));

function makeProps(overrides = {}) {
  return {
    tid: 1,
    nombres: Array.from({ length: 12 }, (_, i) => `c${i + 1}`),
    distribucion: {
      a: [0, 1, 2, 3, 4, 5],
      b: [6, 7, 8, 9, 10, 11],
    },
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

describe("DistributionEditor", () => {
  it("renders two columns with correct names", () => {
    render(<DistributionEditor {...makeProps()} />);
    expect(screen.getByText("Cuadrilla A (6)")).toBeInTheDocument();
    expect(screen.getByText("Cuadrilla B (6)")).toBeInTheDocument();
    expect(screen.getByText("c1")).toBeInTheDocument();
    expect(screen.getByText("c7")).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is clicked", () => {
    const onConfirm = vi.fn();
    render(<DistributionEditor {...makeProps({ onConfirm })} />);
    fireEvent.click(screen.getByText("✓ Confirmar"));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<DistributionEditor {...makeProps({ onCancel })} />);
    fireEvent.click(screen.getByText("✕ Cancelar"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("shows drag hint text", () => {
    render(<DistributionEditor {...makeProps()} />);
    expect(
      screen.getByText(/Arrastra nombres entre columnas/),
    ).toBeInTheDocument();
  });

  it("keyboard Enter moves name between columns", () => {
    render(<DistributionEditor {...makeProps()} />);
    const firstA = screen.getByText("c1").parentElement;
    expect(firstA).toBeTruthy();
    fireEvent.keyDown(firstA!, { key: "Enter" });
    // After moving c1 to B, A should have 5 items, B should have 7
    expect(screen.getByText("Cuadrilla A (5)")).toBeInTheDocument();
    expect(screen.getByText("Cuadrilla B (7)")).toBeInTheDocument();
  });
});
