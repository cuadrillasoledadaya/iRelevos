// ══════════════════════════════════════════════════════════════════
// TESTS — trabajaderaStore cuadrilla doblada actions
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from "vitest";
import { trabajaderaStore, setTrabajaderaDeps } from "./trabajaderaStore";
import type { DatosPerfil, Trabajadera } from "@/lib/types";

// Minimal mock datos
function makeDatos(): DatosPerfil {
  return {
    banco: [],
    planes: [],
    trabajaderas: [
      {
        id: 1,
        nombres: Array.from({ length: 12 }, (_, i) => `Costalero ${i + 1}`),
        salidas: 2,
        roles: [],
        tramos: ["T1", "T2", "T3"],
        tramosTipo: ["primario", "secundario", "primario"],
        plan: null,
        obj: null,
        analisis: null,
        pinned: null,
        bajas: [],
        regla5costaleros: false,
        puntuaciones: {},
        boquilla: {},
        tramosClaves: [],
        cuadrillaDoblada: false,
        distribucionCuadrillas: null,
      },
    ],
  };
}

// Mock deps
let datos: DatosPerfil;
function getTrab(d: DatosPerfil, tid: number): Trabajadera {
  const t = d.trabajaderas.find((x) => x.id === tid);
  if (!t) throw new Error(`Trabajadera ${tid} not found`);
  return t;
}

beforeEach(() => {
  datos = makeDatos();
  setTrabajaderaDeps(
    (fn) => fn(datos),
    getTrab,
    () => {},
    () => datos,
  );
});

describe("trabajaderaStore cuadrilla doblada", () => {
  describe("toggleCuadrillaDoblada", () => {
    it("activates with suggested distribution and clears pins", () => {
      datos.trabajaderas[0].pinned = [["D"], ["F"]];
      const result = trabajaderaStore.getState().toggleCuadrillaDoblada(1);

      expect(result.anterior).toBe(false);
      expect(result.nuevo).toBe(true);
      expect(result.pinsInvalidated).toBe(true);
      expect(result.distribucionAplicada).not.toBeNull();
      expect(result.distribucionAplicada!.a.length).toBe(6);
      expect(result.distribucionAplicada!.b.length).toBe(6);

      const t = datos.trabajaderas[0];
      expect(t.cuadrillaDoblada).toBe(true);
      expect(t.pinned).toBeNull();
      expect(t.plan).toBeNull();
    });

    it("deactivates without restoring pins", () => {
      // First activate
      trabajaderaStore.getState().toggleCuadrillaDoblada(1);
      // Then deactivate
      const result = trabajaderaStore.getState().toggleCuadrillaDoblada(1);

      expect(result.anterior).toBe(true);
      expect(result.nuevo).toBe(false);
      expect(result.pinsInvalidated).toBe(false);
      expect(result.distribucionAplicada).toBeNull();

      const t = datos.trabajaderas[0];
      expect(t.cuadrillaDoblada).toBe(false);
      expect(t.pinned).toBeNull();
      // Distribution should remain
      expect(t.distribucionCuadrillas).not.toBeNull();
    });
  });

  describe("setDistribucionCuadrillas", () => {
    it("accepts valid distribution", () => {
      const a = [0, 1, 2, 3, 4, 5];
      const b = [6, 7, 8, 9, 10, 11];
      trabajaderaStore
        .getState()
        .setDistribucionCuadrillas(1, a, b);

      const t = datos.trabajaderas[0];
      expect(t.distribucionCuadrillas).toEqual({ a, b });
      expect(t.plan).toBeNull();
    });

    it("throws on mismatched sum", () => {
      expect(() =>
        trabajaderaStore.getState().setDistribucionCuadrillas(1, [0, 1, 2], [3, 4, 5]),
      ).toThrow(/Distribución inválida/);
    });

    it("throws on out-of-range index", () => {
      expect(() =>
        trabajaderaStore.getState().setDistribucionCuadrillas(1, [0, 1, 2, 3, 4, 99], [5, 6, 7, 8, 9, 10]),
      ).toThrow(/fuera de rango/);
    });
  });

  describe("setTipoTramo", () => {
    it("sets tipo for a valid tramo index", () => {
      const t = datos.trabajaderas[0];
      expect(t.tramosTipo![0]).toBe("primario");
      trabajaderaStore.getState().setTipoTramo(1, 0, "secundario");
      expect(t.tramosTipo![0]).toBe("secundario");
      expect(t.tramosTipo).toHaveLength(3);
    });

    it("throws on out-of-range index", () => {
      expect(() =>
        trabajaderaStore.getState().setTipoTramo(1, 99, "secundario"),
      ).toThrow(/fuera de rango/);
    });

    it("throws on negative index", () => {
      expect(() =>
        trabajaderaStore.getState().setTipoTramo(1, -1, "secundario"),
      ).toThrow(/fuera de rango/);
    });

    it("clears plan/obj/analisis after mutation", () => {
      const t = datos.trabajaderas[0];
      t.plan = [{ dentro: [0, 1, 2, 3, 4], fuera: [5, 6, 7, 8, 9, 10, 11] }];
      t.obj = { 0: 1 };
      t.analisis = { conteo: {}, okObj: true, dentro5: true, primer: [], ultimo: [], rep: [], cons: 0 };
      trabajaderaStore.getState().setTipoTramo(1, 1, "secundario");
      expect(t.plan).toBeNull();
      expect(t.obj).toBeNull();
      expect(t.analisis).toBeNull();
    });
  });

  describe("drift protection", () => {
    it("addTramo appends primario to tramosTipo", () => {
      const t = datos.trabajaderas[0];
      expect(t.tramosTipo).toHaveLength(3);
      trabajaderaStore.getState().addTramo(1);
      expect(t.tramos).toHaveLength(4);
      expect(t.tramosTipo).toHaveLength(4);
      expect(t.tramosTipo![3]).toBe("primario");
    });

    it("delTramo removes corresponding tramosTipo entry", () => {
      const t = datos.trabajaderas[0];
      expect(t.tramosTipo).toEqual(["primario", "secundario", "primario"]);
      trabajaderaStore.getState().delTramo(1, 1);
      expect(t.tramos).toHaveLength(2);
      expect(t.tramosTipo).toHaveLength(2);
      expect(t.tramosTipo).toEqual(["primario", "primario"]);
    });

    it("toggleCuadrillaDoblada seeds tramosTipo on activation", () => {
      const t = datos.trabajaderas[0];
      t.tramosTipo = undefined;
      expect(t.tramosTipo).toBeUndefined();
      trabajaderaStore.getState().toggleCuadrillaDoblada(1);
      expect(t.tramosTipo).toBeDefined();
      expect(t.tramosTipo).toHaveLength(3);
      expect(t.tramosTipo).toEqual(["primario", "primario", "primario"]);
    });
  });
});
