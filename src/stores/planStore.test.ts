// ══════════════════════════════════════════════════════════════════
// TESTS — planStore cuadrilla doblada gate
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from "vitest";
import { planStore, setPlanDeps } from "./planStore";
import * as rotacion from "@/lib/algoritmos/rotacion";
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

describe("planStore completarPlan dispatch", () => {
  function makeCuadrillaDobladaData(): DatosPerfil {
    return {
      banco: [],
      planes: [],
      trabajaderas: [
        {
          id: 1,
          nombres: Array.from({ length: 12 }, (_, i) => `c${i + 1}`),
          salidas: 1,
          roles: [],
          tramos: ["T1", "T2", "T3", "T4", "T5", "T6"],
          tramosTipo: [
            "primario",
            "secundario",
            "primario",
            "secundario",
            "primario",
            "secundario",
          ],
          plan: null,
          obj: null,
          analisis: null,
          pinned: null,
          bajas: [],
          regla5costaleros: false,
          puntuaciones: {},
          boquilla: {},
          tramosClaves: [],
          cuadrillaDoblada: true,
          distribucionCuadrillas: { a: [0, 1, 2, 3, 4, 5], b: [6, 7, 8, 9, 10, 11] },
        },
      ],
    };
  }

  it("completarPlan with cuadrillaDoblada=true uses grouped rotation (A→B), not greedy", () => {
    // v1.3.3: con [P,S,P,S,P,S] reagrupado a [P×3, S×3] y A=6, B=6,
    // A hace su ciclo entero (load + 1 swap) ANTES de B. Cada slot
    // tiene 5 dentro, todos de UNA sola cuadrilla (Regla 1).
    datos = makeCuadrillaDobladaData();
    setPlanDeps(
      (fn) => fn(datos),
      getTrab,
      () => datos,
    );
    planStore.getState().completarPlan(1);
    const t = datos.trabajaderas[0];
    expect(t.plan).not.toBeNull();
    expect(t.plan).toHaveLength(6);
    // Regla 1: 5 dentro, todos de UNA cuadrilla en cada slot
    for (const slot of t.plan!) {
      const dentro = new Set(slot.dentro);
      const aCount = [...dentro].filter((i) => i < 6).length;
      const bCount = [...dentro].filter((i) => i >= 6).length;
      expect(aCount === 5 || bCount === 5).toBe(true);
      expect(aCount + bCount).toBe(5);
    }
    // A's full cycle: R1 load + R2 swap + R3 swap (A=6 → 2 swaps)
    expect(t.plan![0].dentro).toEqual(expect.arrayContaining([0, 1, 2, 3, 4]));
    expect(t.plan![1].dentro).toEqual(expect.arrayContaining([1, 2, 3, 4, 5]));
    expect(t.plan![2].dentro).toEqual(expect.arrayContaining([0, 2, 3, 4, 5]));
    // B's full cycle: R4 load + R5 swap + R6 swap
    expect(t.plan![3].dentro).toEqual(expect.arrayContaining([6, 7, 8, 9, 10]));
    expect(t.plan![4].dentro).toEqual(expect.arrayContaining([7, 8, 9, 10, 11]));
    expect(t.plan![5].dentro).toEqual(expect.arrayContaining([6, 8, 9, 10, 11]));
  });

  it("completarPlan with cuadrillaDoblada=false still uses greedy (backward compat)", () => {
    // Una trabajadera estándar (sin cuadrilla doblada) debe seguir usando
    // completarAuto, que respeta los pins. Esto NO debe cambiar.
    datos = makeDatos(false);
    setPlanDeps(
      (fn) => fn(datos),
      getTrab,
      () => datos,
    );
    // Set un pin D en c1 en T1
    const p = Array.from({ length: 3 }, () => Array(12).fill("L" as const));
    p[0][0] = "D";
    datos.trabajaderas[0].pinned = p;
    planStore.getState().completarPlan(1);
    const t = datos.trabajaderas[0];
    expect(t.plan).not.toBeNull();
    // T1: c1 debe estar en D (respetado por el greedy)
    expect(t.plan![0].dentro).toContain(0); // c1
  });
});

// ══════════════════════════════════════════════════════════════════
// v1.2.92 #5: per-iteration try/catch en calcularTodo/calcularTrab.
// Sin esto, un error que escapa de calcularCiclo aborta el forEach a
// mitad de camino y deja el store en estado inconsistente. Esto
// reproduce el patrón del crash del capataz screen de la semana
// pasada. La defense in depth es: dispatcher (#4) NO debe tirar, pero
// si por alguna razón futura tira (regression, error no-CuadrillaDoblada
// desde completarAuto, etc.), el forEach debe continuar con las
// siguientes trabajaderas.
// ══════════════════════════════════════════════════════════════════

describe("planStore v1.2.92 #5 — per-iteration try/catch", () => {
  function makeMultipleDatos(): DatosPerfil {
    return {
      banco: [],
      planes: [],
      trabajaderas: [
        {
          id: 1,
          nombres: Array.from({ length: 6 }, (_, i) => `a${i + 1}`),
          salidas: 2,
          roles: [],
          tramos: ["T1", "T2", "T3"],
          plan: null,
          obj: null,
          analisis: null,
          pinned: null,
          bajas: [],
          regla5costaleros: false,
          puntuaciones: {},
          boquilla: {},
          tramosClaves: [],
        },
        {
          id: 2,
          nombres: Array.from({ length: 6 }, (_, i) => `b${i + 1}`),
          salidas: 2,
          roles: [],
          tramos: ["T1", "T2", "T3"],
          plan: null,
          obj: null,
          analisis: null,
          pinned: null,
          bajas: [],
          regla5costaleros: false,
          puntuaciones: {},
          boquilla: {},
          tramosClaves: [],
        },
        {
          id: 3,
          nombres: Array.from({ length: 6 }, (_, i) => `c${i + 1}`),
          salidas: 2,
          roles: [],
          tramos: ["T1", "T2", "T3"],
          plan: null,
          obj: null,
          analisis: null,
          pinned: null,
          bajas: [],
          regla5costaleros: false,
          puntuaciones: {},
          boquilla: {},
          tramosClaves: [],
        },
      ],
    };
  }

  it("calcularTodo: si una trabajadera tira, las demás siguen computándose", () => {
    datos = makeMultipleDatos();
    setPlanDeps(
      (fn) => fn(datos),
      getTrab,
      () => datos,
    );
    // Forzar throw en la 2da iteración (id=2), pasar para id=1 y id=3
    const original = rotacion.calcularCiclo;
    const spy = vi
      .spyOn(rotacion, "calcularCiclo")
      .mockImplementation((t: Trabajadera) => {
        if (t.id === 2) throw new Error("boom — malformed trabajadera 2");
        return original(t);
      });
    try {
      // No debe throw out del forEach
      let thrown: unknown = null;
      try {
        planStore.getState().calcularTodo();
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toBeNull();
      // id=1 y id=3 tienen plan computado
      expect(datos.trabajaderas[0].plan).not.toBeNull();
      expect(datos.trabajaderas[0].plan!.length).toBeGreaterThan(0);
      expect(datos.trabajaderas[2].plan).not.toBeNull();
      expect(datos.trabajaderas[2].plan!.length).toBeGreaterThan(0);
      // id=2 quedó marcada con error y plan vacío (no quedó a medias)
      const t2 = datos.trabajaderas[1];
      expect(t2.analisis).not.toBeNull();
      expect(t2.analisis!.error).toMatch(/boom/);
    } finally {
      spy.mockRestore();
    }
  });

  it("calcularTrab: si la trabajadera tira, no crashea el store", () => {
    datos = makeMultipleDatos();
    setPlanDeps(
      (fn) => fn(datos),
      getTrab,
      () => datos,
    );
    const spy = vi
      .spyOn(rotacion, "calcularCiclo")
      .mockImplementation(() => {
        throw new Error("calcularTrab boom");
      });
    try {
      let thrown: unknown = null;
      try {
        planStore.getState().calcularTrab(1);
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toBeNull();
      const t = datos.trabajaderas[0];
      expect(t.analisis).not.toBeNull();
      expect(t.analisis!.error).toMatch(/calcularTrab boom/);
    } finally {
      spy.mockRestore();
    }
  });

  it("calcularTodo: store queda consistente después de errores parciales", () => {
    // Tras un throw en id=2, id=1 e id=3 tienen plan+obj+analisis
    // completos. Ninguna referencia queda en estado parcial (e.g. plan
    // seteado pero obj no).
    datos = makeMultipleDatos();
    setPlanDeps(
      (fn) => fn(datos),
      getTrab,
      () => datos,
    );
    const spy = vi
      .spyOn(rotacion, "calcularCiclo")
      .mockImplementation((t: Trabajadera) => {
        if (t.id === 2) throw new Error("partial state test");
        return {
          plan: [
            { dentro: [0, 1, 2, 3, 4], fuera: [5] },
            { dentro: [0, 1, 2, 3, 4], fuera: [5] },
            { dentro: [0, 1, 2, 3, 4], fuera: [5] },
          ],
          objetivo: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 3 },
        };
      });
    try {
      planStore.getState().calcularTodo();
      // id=1: plan, obj, analisis todos presentes
      const t1 = datos.trabajaderas[0];
      expect(t1.plan).not.toBeNull();
      expect(t1.obj).not.toBeNull();
      expect(t1.analisis).not.toBeNull();
      // id=2: error capturado, plan/obj vacíos o nulos
      const t2 = datos.trabajaderas[1];
      expect(t2.analisis).not.toBeNull();
      expect(t2.analisis!.error).toBeDefined();
      // id=3: plan, obj, analisis todos presentes (idéntico a id=1)
      const t3 = datos.trabajaderas[2];
      expect(t3.plan).not.toBeNull();
      expect(t3.obj).not.toBeNull();
      expect(t3.analisis).not.toBeNull();
    } finally {
      spy.mockRestore();
    }
  });
});
