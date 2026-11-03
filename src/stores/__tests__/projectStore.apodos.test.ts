// ══════════════════════════════════════════════════════════════════
// TESTS — projectStore: apodos del censo → cuadrillas
//
// Regresión del bug reportado: tras importar costaleros desde
// iCuadrilla, el apodo que se ponía en el censo NO aparecía en las
// cuadrillas. Causas:
//   1) las consultas al censo filtraban solo por `temporada_id` y el
//      censo importado tiene `temporada_id = NULL` → no se cargaba nada;
//   2) el nombre de la acción tenía un typo (`aplicarApodosATrabajadoras`)
//      → la acción nunca se ejecutaba y `refetchPasos` se abortaba;
//   3) los apodos aplicados no se guardaban en el content del paso.
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createProjectStore, setProjectStoreMutar } from "../projectStore";
import { supabase } from "@/lib/supabase";
import type { PasoDB, Trabajadera } from "@/lib/types";

vi.mock("@/lib/supabase", () => ({
	supabase: {
		from: vi.fn(),
		auth: { getSession: vi.fn() },
	},
}));

const mockSupabase = vi.mocked(supabase);

/** Cuadrilla completa (misma forma que produce `crearTrabajaderaBase`). */
function cuadrilla(nombres: string[]): Trabajadera {
	return {
		id: 1,
		nombres,
		roles: nombres.map(() => ({ pri: "COR" as const, sec: "FIJ_I" as const })),
		salidas: 2,
		tramos: ["Tramo 1 (T1)"],
		tramosTipo: ["primario"],
		bajas: [],
		regla5costaleros: false,
		plan: null,
		obj: null,
		analisis: null,
		pinned: null,
		puntuaciones: {},
		boquilla: {},
		tramosClaves: [],
	};
}

function paso(trabajaderas: Trabajadera[]): PasoDB {
	return {
		id: "proj-1",
		nombre_paso: "Paso 1",
		nombre_cuadrilla: "Cuadrilla 1",
		num_trabajaderas: 1,
		content: { banco: [], planes: [], trabajaderas },
		created_at: "2026-11-03T00:00:00Z",
		temporada_id: "temp-1",
	};
}

/** Mock de la consulta al censo: devuelve filas y captura el filtro. */
function mockCensus(rows: unknown[]) {
	const orMock = vi.fn().mockResolvedValue({ data: rows, error: null });
	const selectMock = vi.fn().mockReturnValue({ or: orMock });
	mockSupabase.from.mockReturnValue({ select: selectMock } as never);
	return { orMock, selectMock };
}

describe("projectStore — apodos del censo", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// El entorno de test no expone localStorage (el store lo usa para
		// recordar el paso activo).
		const memoria = new Map<string, string>();
		vi.stubGlobal("localStorage", {
			getItem: (k: string) => memoria.get(k) ?? null,
			setItem: (k: string, v: string) => {
				memoria.set(k, v);
			},
			removeItem: (k: string) => {
				memoria.delete(k);
			},
			clear: () => memoria.clear(),
		});
	});

	it("debe consultar el censo por proyecto (no solo por temporada)", async () => {
		const store = createProjectStore();
		store.setState({ pid: "proj-1" });

		const { orMock } = mockCensus([]);

		await store.getState().fetchCensusApodos();

		expect(orMock).toHaveBeenCalledTimes(1);
		const filtro = orMock.mock.calls[0][0] as string;
		expect(filtro).toContain("proyecto_id.eq.proj-1");
	});

	it("debe aplicar el apodo del censo a la cuadrilla y persistirlo", async () => {
		const store = createProjectStore();
		store
			.getState()
			.setPasos([paso([cuadrilla(["Carlos Tinoco"])])]);

		const mutar = vi.fn();
		setProjectStoreMutar(mutar as never);

		mockCensus([
			{ nombre: "Carlos", apellidos: "Tinoco", apodo: "Carlitos" },
			{ nombre: "Diego", apellidos: "Fabregas", apodo: "" },
		]);

		await store.getState().fetchCensusApodos();

		// Se llama a mutar para guardar el apodo en el content del paso.
		expect(mutar).toHaveBeenCalledTimes(1);

		const draft = {
			trabajaderas: [cuadrilla(["Carlos Tinoco"])],
		};
		mutar.mock.calls[0][0](draft);
		expect(draft.trabajaderas[0].apodos).toEqual(["Carlitos"]);
	});

	it("no debe volver a guardar si los apodos ya están aplicados", async () => {
		const store = createProjectStore();
		const conApodo = cuadrilla(["Carlos Tinoco"]);
		conApodo.apodos = ["Carlitos"];
		store.getState().setPasos([paso([conApodo])]);

		const mutar = vi.fn();
		setProjectStoreMutar(mutar as never);

		mockCensus([{ nombre: "Carlos", apellidos: "Tinoco", apodo: "Carlitos" }]);

		await store.getState().fetchCensusApodos();

		expect(mutar).not.toHaveBeenCalled();
	});

	it("debe resolver por apodo cuando la cuadrilla ya tiene el apodo", async () => {
		const store = createProjectStore();
		store
			.getState()
			.setPasos([paso([cuadrilla(["Rafa Sug", "Rafita"])])]);

		const mutar = vi.fn();
		setProjectStoreMutar(mutar as never);

		mockCensus([
			{ nombre: "Rafael", apellidos: "Sugrañes Estévez", apodo: "Rafa Sug" },
			{ nombre: "Rafael", apellidos: "García Sánchez", apodo: "Rafita" },
		]);

		await store.getState().fetchCensusApodos();

		expect(mutar).toHaveBeenCalledTimes(1);

		const draft = {
			trabajaderas: [cuadrilla(["Rafa Sug", "Rafita"])],
		};
		mutar.mock.calls[0][0](draft);
		expect(draft.trabajaderas[0].apodos).toEqual(["Rafa Sug", "Rafita"]);
	});
});
