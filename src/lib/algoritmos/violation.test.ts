// ══════════════════════════════════════════════════════════════════
// TESTS — Violation type (REQ-PLANPREC-5)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import type { Violation, ResultadoBulkApply } from "./correcciones";

describe("Violation type (REQ-PLANPREC-5)", () => {
  it("debería aceptar kind 'dentro5'", () => {
    const v: Violation = { kind: "dentro5", ti: 0, actual: 6 };
    expect(v.kind).toBe("dentro5");
    expect(v.ti).toBe(0);
    expect(v.actual).toBe(6);
  });

  it("debería aceptar kind 'pin'", () => {
    const v: Violation = { kind: "pin", ti: 1, message: "Tramo 2: pin error" };
    expect(v.kind).toBe("pin");
    expect(v.message).toBe("Tramo 2: pin error");
  });

  it("debería aceptar kind 'consecutivos'", () => {
    const v: Violation = { kind: "consecutivos", ti: 2, count: 3 };
    expect(v.kind).toBe("consecutivos");
    expect(v.count).toBe(3);
  });

  it("debería aceptar kind 'repeticion'", () => {
    const v: Violation = { kind: "repeticion", ti1: 0, ti2: 4, idx: 3 };
    expect(v.kind).toBe("repeticion");
    expect(v.ti1).toBe(0);
    expect(v.ti2).toBe(4);
  });

  it("debería aceptar kind 'fueramax'", () => {
    const v: Violation = { kind: "fueramax", ti: 0, pinned: 3, max: 2 };
    expect(v.kind).toBe("fueramax");
    expect(v.pinned).toBe(3);
    expect(v.max).toBe(2);
  });

  it("ResultadoBulkApply debería tener campo violations", () => {
    const r: ResultadoBulkApply = {
      aplicadas: 5,
      saltadas: 2,
      cap_alcanzado: false,
      violations: [],
    };
    expect(r.violations).toEqual([]);
    expect(Array.isArray(r.violations)).toBe(true);
  });
});
