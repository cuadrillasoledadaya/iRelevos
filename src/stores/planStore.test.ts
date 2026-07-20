// ══════════════════════════════════════════════════════════════════
// TESTS — planStore cuadrilla doblada gate
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from "vitest";
import { planStore, setPlanDeps } from "./planStore";
import type { DatosPerfil, Trabajadera } from "@/lib/types";

function makeDatos(cuadrillaDoblada = false): DatosPerfil {
  return {
    banco: [],
    planes: [],
    trabajaderas: [
      {
        id: 1,
        nombres: Array.from({ length: 12 }, (_, i) => `c${i + 1}`),
        salidas: 2,
        roles: [],
        tramos: ["T1", "T2", "T3"],
        plan: [{ dentro: [0, 1, 2, 3, 4], fuera: [5, 6, 7, 8, 9, 10, 11] }],
        obj: { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 11: 1 },
        analisis: {
          conteo: { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 11: 1 },
          okObj: true,
          dentro5: true,
          primer: [],
          ultimo: [],
          rep: [],
          cons: 0,
        },
        pinned: null,
        bajas: [],
        regla5costaleros: false,
        puntuaciones: {},
        boquilla: {},
        tramosClaves: [],
        cuadrillaDoblada,
        distribucionCuadrillas: null,
      },
    ],
  };
}

let datos: DatosPerfil;
function getTrab(d: DatosPerfil, tid: number): Trabajadera {
  const t = d.trabajaderas.find((x) => x.id === tid);
  if (!t) throw new Error(`Trabajadera ${tid} not found`);
  return t;
}

beforeEach(() => {
  datos = makeDatos();
  setPlanDeps(
    (fn) => fn(datos),
    getTrab,
    () => datos,
  );
});

describe("planStore cuadrilla doblada gate", () => {
  it("previsualizarCorreccionesBulk returns null when cuadrillaDoblada is true", () => {
    datos.trabajaderas[0].cuadrillaDoblada = true;
    const result = planStore.getState().previsualizarCorreccionesBulk(1);
    expect(result).toBeNull();
  });

  it("confirmarCorreccionesBulk returns zero result when cuadrillaDoblada is true", () => {
    datos.trabajaderas[0].cuadrillaDoblada = true;
    const result = planStore.getState().confirmarCorreccionesBulk(1);
    expect(result.aplicadas).toBe(0);
    expect(result.saltadas).toBe(0);
  });
});
