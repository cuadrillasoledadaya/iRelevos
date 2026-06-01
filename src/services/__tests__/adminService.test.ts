// ══════════════════════════════════════════════════════════════════
// TESTS — adminService.ts (Strict TDD Mode)
// Pure Supabase/data operations — no React, no UI
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/hooks/useAuth";

// Import functions under test
import {
	deleteUser,
	updateUserRole,
	updateUserProfile,
	createPaso,
	deletePaso,
	syncCostaleroToProject,
	addToCensus,
	deleteFromCensus,
	saveCensusEdit,
	rebuildCensusComplete,
	syncTodoCenso,
	syncProjectToCensus,
	fetchICuadrillaData,
	executeImport,
	fullSyncCheck,
	deleteCensusEntry,
	deleteTemporada,
	createTemporada,
} from "../adminService";

// ── Mock helpers ────────────────────────────────────────────────────

function mockChain(
	method: "select" | "insert" | "update" | "delete",
	result: { data?: unknown; error?: { message: string } | null },
) {
	const eqMock = vi.fn().mockReturnValue({
		single: vi.fn().mockResolvedValue(result),
		order: vi.fn().mockReturnValue({
			single: vi.fn().mockResolvedValue(result),
			not: vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue(result),
			}),
		}),
		not: vi.fn().mockReturnValue({
			eq: vi.fn().mockResolvedValue(result),
		}),
		in: vi.fn().mockReturnValue(result),
	});

	const methodMock = vi.fn().mockReturnValue({
		eq: eqMock,
		single: vi.fn().mockResolvedValue(result),
	});

	vi.mocked(supabase.from).mockReturnValue({
		select: methodMock,
		insert: methodMock,
		update: methodMock,
		delete: methodMock,
	} as any);

	return { eqMock, methodMock };
}

// ── USUARIOS ────────────────────────────────────────────────────────

describe("Usuarios", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("deleteUser", () => {
		it("debe retornar éxito cuando el fetch responde 200", async () => {
			vi.spyOn(global, "fetch").mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({}),
			} as unknown as Response);

			const result = await deleteUser("user-123", "token-abc");

			expect(result.error).toBeUndefined();
			expect(global.fetch).toHaveBeenCalledWith(
				"/api/admin/delete-user",
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ uid: "user-123" }),
				}),
			);
		});

		it("debe retornar error cuando el fetch responde con error", async () => {
			vi.spyOn(global, "fetch").mockResolvedValue({
				ok: false,
				json: vi.fn().mockResolvedValue({ error: "No autorizado" }),
			} as unknown as Response);

			const result = await deleteUser("user-123", "bad-token");

			expect(result.error).toBe("No autorizado");
		});

		it("debe retornar error genérico cuando la respuesta no tiene mensaje", async () => {
			vi.spyOn(global, "fetch").mockResolvedValue({
				ok: false,
				json: vi.fn().mockResolvedValue({}),
			} as unknown as Response);

			const result = await deleteUser("user-123", "token");

			expect(result.error).toBe("desconocido");
		});
	});

	describe("updateUserRole", () => {
		it("debe actualizar el rol correctamente", async () => {
			const eqMock = vi.fn().mockResolvedValue({ error: null });
			const updateMock = vi.fn().mockReturnValue({ eq: eqMock });

			vi.mocked(supabase.from).mockReturnValue({
				update: updateMock,
			} as any);

			const result = await updateUserRole(
				"user-123",
				"capataz" as UserRole,
			);

			expect(result.error).toBeUndefined();
			expect(supabase.from).toHaveBeenCalledWith("profiles");
			expect(updateMock).toHaveBeenCalledWith({ role: "capataz" });
			expect(eqMock).toHaveBeenCalledWith("id", "user-123");
		});

		it("debe retornar error cuando Supabase falla", async () => {
			const eqMock = vi.fn().mockResolvedValue({
				error: { message: "RLS violation" },
			});
			const updateMock = vi.fn().mockReturnValue({ eq: eqMock });

			vi.mocked(supabase.from).mockReturnValue({
				update: updateMock,
			} as any);

			const result = await updateUserRole("user-123", "superadmin" as UserRole);

			expect(result.error).toBe("RLS violation");
		});
	});

	describe("updateUserProfile", () => {
		it("debe actualizar el perfil correctamente", async () => {
			const eqMock = vi.fn().mockResolvedValue({ error: null });
			const updateMock = vi.fn().mockReturnValue({ eq: eqMock });

			vi.mocked(supabase.from).mockReturnValue({
				update: updateMock,
			} as any);

			const result = await updateUserProfile("user-123", {
				nombre: "Juan",
				apellidos: "Pérez",
				apodo: "Juanito",
			});

			expect(result.error).toBeUndefined();
			expect(updateMock).toHaveBeenCalledWith({
				nombre: "Juan",
				apellidos: "Pérez",
				apodo: "Juanito",
			});
		});

		it("debe retornar error cuando Supabase falla", async () => {
			const eqMock = vi.fn().mockResolvedValue({
				error: { message: "Column not found" },
			});
			const updateMock = vi.fn().mockReturnValue({ eq: eqMock });

			vi.mocked(supabase.from).mockReturnValue({
				update: updateMock,
			} as any);

			const result = await updateUserProfile("user-123", {
				nombre: "Juan",
				apellidos: "Pérez",
				apodo: "Juanito",
			});

			expect(result.error).toBe("Column not found");
		});
	});
});

// ── PASOS ───────────────────────────────────────────────────────────

describe("Pasos", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("createPaso", () => {
		it("debe crear un paso con content inicializado correctamente", async () => {
			const insertMock = vi.fn().mockResolvedValue({ error: null });

			vi.mocked(supabase.from).mockReturnValue({
				insert: insertMock,
			} as any);

			const result = await createPaso(
				{
					nombre_paso: "La Macarena",
					nombre_cuadrilla: "Los Costaleros",
					num_trabajaderas: 2,
				},
				"temp-1",
				"user-123",
			);

			expect(result.error).toBeUndefined();
			expect(supabase.from).toHaveBeenCalledWith("proyectos");
			expect(insertMock).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({
						nombre_paso: "La Macarena",
						temporada_id: "temp-1",
						user_id: "user-123",
						content: expect.objectContaining({
							banco: [],
							trabajaderas: expect.arrayContaining([
								expect.objectContaining({
									id: 1,
									nombres: [],
									salidas: 1,
								}),
								expect.objectContaining({
									id: 2,
									nombres: [],
									salidas: 1,
								}),
							]),
						}),
					}),
				]),
			);
		});

		it("debe retornar error cuando Supabase falla al insertar", async () => {
			const insertMock = vi.fn().mockResolvedValue({
				error: { message: "duplicate key" },
			});

			vi.mocked(supabase.from).mockReturnValue({
				insert: insertMock,
			} as any);

			const result = await createPaso(
				{
					nombre_paso: "Duplicate",
					nombre_cuadrilla: "Test",
					num_trabajaderas: 1,
				},
				"temp-1",
				"user-123",
			);

			expect(result.error).toBe("duplicate key");
		});

		it("debe crear paso con userId null cuando no hay sesión", async () => {
			const insertMock = vi.fn().mockResolvedValue({ error: null });

			vi.mocked(supabase.from).mockReturnValue({
				insert: insertMock,
			} as any);

			const result = await createPaso(
				{
					nombre_paso: "Sin Owner",
					nombre_cuadrilla: "Test",
					num_trabajaderas: 1,
				},
				"temp-1",
				null,
			);

			expect(result.error).toBeUndefined();
			expect(insertMock).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({ user_id: null }),
				]),
			);
		});
	});

	describe("deletePaso", () => {
		it("debe borrar un paso y retornar el user_id del proyecto", async () => {
			const singleMock = vi.fn().mockResolvedValue({
				data: { user_id: "user-123" },
				error: null,
			});
			const selectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({ single: singleMock }),
			});
			const deleteEqMock = vi.fn().mockResolvedValue({ error: null });
			const deleteMock = vi.fn().mockReturnValue({
				eq: deleteEqMock,
			});

			vi.mocked(supabase.from).mockReturnValue({
				select: selectMock,
				delete: deleteMock,
			} as any);

			const result = await deletePaso("paso-1");

			expect(result.error).toBeUndefined();
			expect(result.data).toEqual({ user_id: "user-123" });
			expect(singleMock).toHaveBeenCalled();
			expect(deleteEqMock).toHaveBeenCalledWith("id", "paso-1");
		});

		it("debe retornar error cuando no se encuentra el proyecto", async () => {
			const singleMock = vi.fn().mockResolvedValue({
				data: null,
				error: { message: "not found" },
			});
			const selectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({ single: singleMock }),
			});

			vi.mocked(supabase.from).mockReturnValue({
				select: selectMock,
			} as any);

			const result = await deletePaso("nonexistent");

			expect(result.error).toBe("not found");
		});

		it("debe retornar error genérico cuando proyecto es null sin error", async () => {
			const singleMock = vi.fn().mockResolvedValue({
				data: null,
				error: null,
			});
			const selectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({ single: singleMock }),
			});

			vi.mocked(supabase.from).mockReturnValue({
				select: selectMock,
			} as any);

			const result = await deletePaso("nonexistent");

			expect(result.error).toBe("Proyecto no encontrado");
		});

		it("debe retornar error cuando el delete falla", async () => {
			const singleMock = vi.fn().mockResolvedValue({
				data: { user_id: "user-123" },
				error: null,
			});
			const selectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({ single: singleMock }),
			});
			const deleteEqMock = vi.fn().mockResolvedValue({
				error: { message: "RLS violation" },
			});
			const deleteMock = vi.fn().mockReturnValue({
				eq: deleteEqMock,
			});

			vi.mocked(supabase.from).mockReturnValue({
				select: selectMock,
				delete: deleteMock,
			} as any);

			const result = await deletePaso("paso-1");

			expect(result.error).toBe("RLS violation");
		});
	});
});

// ── CENSO ───────────────────────────────────────────────────────────

describe("Censo", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("syncCostaleroToProject", () => {
		it("debe reemplazar un slot placeholder con el nombre del costalero", async () => {
			const updateEqMock = vi.fn().mockResolvedValue({ error: null });
			const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });
			const singleMock = vi.fn().mockResolvedValue({
				data: {
					content: {
						trabajaderas: [
							{ id: 1, nombres: ["Costalero 1", "Costalero 2"], roles: [{ pri: "COR", sec: "FIJ_I" }] },
						],
					},
					user_id: "user-123",
				},
				error: null,
			});
			const selectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({ single: singleMock }),
			});

			vi.mocked(supabase.from).mockReturnValue({
				select: selectMock,
				update: updateMock,
			} as any);

			const result = await syncCostaleroToProject(
				"proy-1",
				1,
				"Juan Pérez",
				"user-123",
			);

			expect(result.error).toBeUndefined();
			expect(updateEqMock).toHaveBeenCalledWith("id", "proy-1");
		});

		it("debe agregar un nombre nuevo cuando no hay slots placeholder", async () => {
			const updateEqMock = vi.fn().mockResolvedValue({ error: null });
			const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });
			const singleMock = vi.fn().mockResolvedValue({
				data: {
					content: {
						trabajaderas: [
							{ id: 1, nombres: ["Juan", "Pedro"], roles: [{ pri: "COR", sec: "FIJ_I" }] },
						],
					},
					user_id: "user-123",
				},
				error: null,
			});
			const selectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({ single: singleMock }),
			});

			vi.mocked(supabase.from).mockReturnValue({
				select: selectMock,
				update: updateMock,
			} as any);

			const result = await syncCostaleroToProject(
				"proy-1",
				1,
				"María López",
				"user-123",
			);

			expect(result.error).toBeUndefined();
		});

		it("debe retornar error cuando el proyecto no existe", async () => {
			const singleMock = vi.fn().mockResolvedValue({
				data: null,
				error: { message: "not found" },
			});
			const selectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({ single: singleMock }),
			});

			vi.mocked(supabase.from).mockReturnValue({
				select: selectMock,
			} as any);

			const result = await syncCostaleroToProject(
				"nonexistent",
				1,
				"Juan",
				"user-123",
			);

			expect(result.error).toBe("not found");
		});

		it("debe retornar error cuando el usuario no tiene permiso", async () => {
			const singleMock = vi.fn().mockResolvedValue({
				data: {
					content: { trabajaderas: [] },
					user_id: "other-user",
				},
				error: null,
			});
			const selectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({ single: singleMock }),
			});

			vi.mocked(supabase.from).mockReturnValue({
				select: selectMock,
			} as any);

			const result = await syncCostaleroToProject(
				"proy-1",
				1,
				"Juan",
				"user-123",
			);

			expect(result.error).toBe("No tenes permiso para modificar este proyecto.");
		});

		it("debe retornar error cuando la trabajadera no existe", async () => {
			const singleMock = vi.fn().mockResolvedValue({
				data: {
					content: {
						trabajaderas: [{ id: 1, nombres: [] }],
					},
					user_id: "user-123",
				},
				error: null,
			});
			const selectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({ single: singleMock }),
			});

			vi.mocked(supabase.from).mockReturnValue({
				select: selectMock,
			} as any);

			const result = await syncCostaleroToProject(
				"proy-1",
				99,
				"Juan",
				"user-123",
			);

			expect(result.error).toContain("No existe trabajadera 99");
		});

		it("debe asignar user_id cuando el proyecto no tiene owner", async () => {
			const updateEqMock = vi.fn().mockResolvedValue({ error: null });
			const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });
			const singleMock = vi.fn().mockResolvedValue({
				data: {
					content: {
						trabajaderas: [
							{ id: 1, nombres: ["Costalero 1"] },
						],
					},
					user_id: null,
				},
				error: null,
			});
			const selectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({ single: singleMock }),
			});

			vi.mocked(supabase.from).mockReturnValue({
				select: selectMock,
				update: updateMock,
			} as any);

			const result = await syncCostaleroToProject(
				"proy-1",
				1,
				"Juan Pérez",
				"user-123",
			);

			expect(result.error).toBeUndefined();
			expect(updateMock).toHaveBeenCalledWith(
				expect.objectContaining({
					content: expect.any(Object),
					user_id: "user-123",
				}),
			);
		});
	});

	describe("addToCensus", () => {
		it("debe insertar una entrada al censo correctamente", async () => {
			const mockEntry = {
				id: "census-1",
				nombre: "Juan",
				apellidos: "Pérez",
				apodo: "Juanito",
				email: "juan@test.com",
				telefono: "123456",
				trabajadera: 1,
				altura: 175,
				proyecto_id: "proy-1",
				temporada_id: "temp-1",
				created_at: "2024-01-01",
			};

			const selectMock = vi.fn().mockResolvedValue({ data: [mockEntry], error: null });
			const insertMock = vi.fn().mockReturnValue({ select: selectMock });

			vi.mocked(supabase.from).mockReturnValue({
				insert: insertMock,
			} as any);

			const result = await addToCensus(
				{
					nombre: "Juan",
					apellidos: "Pérez",
					apodo: "Juanito",
					email: "juan@test.com",
					telefono: "123456",
					trabajadera: "1",
					altura: "175",
					proyecto_id: "proy-1",
				},
				"temp-1",
			);

			expect(result.error).toBeUndefined();
			expect(result.data).toEqual(mockEntry);
		});

		it("debe retornar error cuando Supabase falla al insertar", async () => {
			const selectMock = vi.fn().mockResolvedValue({
				data: null,
				error: { message: "constraint violation" },
			});
			const insertMock = vi.fn().mockReturnValue({ select: selectMock });

			vi.mocked(supabase.from).mockReturnValue({
				insert: insertMock,
			} as any);

			const result = await addToCensus(
				{
					nombre: "Juan",
					apellidos: "Pérez",
					apodo: "",
					email: "",
					telefono: "",
					trabajadera: "",
					altura: "",
					proyecto_id: "proy-1",
				},
				"temp-1",
			);

			expect(result.error).toBe("constraint violation");
		});

		it("debe retornar error cuando data viene vacío tras insert", async () => {
			const selectMock = vi.fn().mockResolvedValue({
				data: [],
				error: null,
			});
			const insertMock = vi.fn().mockReturnValue({ select: selectMock });

			vi.mocked(supabase.from).mockReturnValue({
				insert: insertMock,
			} as any);

			const result = await addToCensus(
				{
					nombre: "Juan",
					apellidos: "Pérez",
					apodo: "",
					email: "",
					telefono: "",
					trabajadera: "",
					altura: "",
					proyecto_id: "proy-1",
				},
				"temp-1",
			);

			expect(result.error).toBe("Error al añadir al censo");
		});
	});

	describe("deleteFromCensus", () => {
		it("debe borrar una entrada del censo correctamente", async () => {
			const eqMock = vi.fn().mockResolvedValue({ error: null });
			const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });

			vi.mocked(supabase.from).mockReturnValue({
				delete: deleteMock,
			} as any);

			const result = await deleteFromCensus("census-1");

			expect(result.error).toBeUndefined();
			expect(eqMock).toHaveBeenCalledWith("id", "census-1");
		});

		it("debe retornar error cuando Supabase falla", async () => {
			const eqMock = vi.fn().mockResolvedValue({
				error: { message: "not found" },
			});
			const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });

			vi.mocked(supabase.from).mockReturnValue({
				delete: deleteMock,
			} as any);

			const result = await deleteFromCensus("nonexistent");

			expect(result.error).toBe("not found");
		});
	});

	describe("saveCensusEdit", () => {
		it("debe actualizar una entrada del censo correctamente", async () => {
			const eqMock = vi.fn().mockResolvedValue({ error: null });
			const updateMock = vi.fn().mockReturnValue({ eq: eqMock });

			vi.mocked(supabase.from).mockReturnValue({
				update: updateMock,
			} as any);

			const result = await saveCensusEdit("census-1", {
				nombre: "Juan Carlos",
				altura: 180,
			});

			expect(result.error).toBeUndefined();
		});

		it("debe retornar error cuando Supabase falla", async () => {
			const eqMock = vi.fn().mockResolvedValue({
				error: { message: "column not found" },
			});
			const updateMock = vi.fn().mockReturnValue({ eq: eqMock });

			vi.mocked(supabase.from).mockReturnValue({
				update: updateMock,
			} as any);

			const result = await saveCensusEdit("census-1", {
				nombre: "Juan",
			});

			expect(result.error).toBe("column not found");
		});
	});

	describe("rebuildCensusComplete", () => {
		it("debe escanear proyectos y crear entradas de censo nuevas", async () => {
			// First call: select proyectos
			const proyectosResult = {
				data: [
					{
						id: "proy-1",
						temporada_id: "temp-1",
						content: {
							trabajaderas: [
								{ id: 1, nombres: ["Juan Pérez", "Pedro López"] },
							],
						},
					},
				],
				error: null,
			};

			// Second call: select existing census
			const censusResult = {
				data: [],
				error: null,
			};

			// Third call: insert new census
			const insertResult = { error: null };

			const selectEqMock = vi.fn().mockResolvedValue(censusResult);
			const selectMock = vi.fn().mockReturnValue({
				eq: selectEqMock,
			});

			const insertEqMock = vi.fn().mockResolvedValue(insertResult);
			const insertMock = vi.fn().mockReturnValue({
				eq: insertEqMock,
			});

			// supabase.from is called twice: first for proyectos, then for census (select), then for census (insert)
			vi.mocked(supabase.from)
				.mockReturnValueOnce({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue(proyectosResult),
					}),
				} as any)
				.mockReturnValue({
					select: selectMock,
					insert: insertMock,
				} as any);

			const result = await rebuildCensusComplete("temp-1");

			expect(result.error).toBeUndefined();
			expect(result.data).toEqual({ totalNuevos: 2 });
		});

		it("debe retornar error cuando no hay proyectos en la temporada", async () => {
			vi.mocked(supabase.from).mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({ data: [], error: null }),
				}),
			} as any);

			const result = await rebuildCensusComplete("temp-1");

			expect(result.error).toBe("No hay proyectos en esta temporada.");
		});

		it("debe omitir nombres que empiezan con 'Costalero '", async () => {
			const proyectosResult = {
				data: [
					{
						id: "proy-1",
						temporada_id: "temp-1",
						content: {
							trabajaderas: [
								{ id: 1, nombres: ["Costalero 1", "Juan Pérez", "Costalero 2"] },
							],
						},
					},
				],
				error: null,
			};

			const insertMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({ error: null }),
			});

			vi.mocked(supabase.from)
				.mockReturnValueOnce({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue(proyectosResult),
					}),
				} as any)
				.mockReturnValue({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({ data: [], error: null }),
					}),
					insert: insertMock,
				} as any);

			const result = await rebuildCensusComplete("temp-1");

			expect(result.error).toBeUndefined();
			expect(result.data).toEqual({ totalNuevos: 1 });
		});

		it("debe retornar error cuando el insert falla", async () => {
			const proyectosResult = {
				data: [
					{
						id: "proy-1",
						temporada_id: "temp-1",
						content: {
							trabajaderas: [
								{ id: 1, nombres: ["Juan Pérez"] },
							],
						},
					},
				],
				error: null,
			};

			const insertMock = vi.fn().mockResolvedValue({ error: { message: "duplicate" } });

			vi.mocked(supabase.from)
				.mockReturnValueOnce({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue(proyectosResult),
					}),
				} as any)
				.mockReturnValue({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({ data: [], error: null }),
					}),
					insert: insertMock,
				} as any);

			const result = await rebuildCensusComplete("temp-1");

			expect(result.error).toBe("duplicate");
		});
	});

	describe("syncTodoCenso", () => {
		it("debe sincronizar censo al proyecto con mapeo de roles", async () => {
			const censusData = [
				{ nombre: "Juan", apellidos: "Pérez", apodo: "Juanito", trabajadera: 1, rol: "COR", rol_sec: "FIJ_I" },
			];

			const projContent = {
				trabajaderas: [
					{ id: 1, nombres: ["Costalero 1", "Costalero 2"] },
				],
			};

			// census select
			const censusSelectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					not: vi.fn().mockReturnValue({
						order: vi.fn().mockResolvedValue({
							data: censusData,
							error: null,
						}),
					}),
				}),
			});

			// proyecto select
			const projSelectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: { content: projContent },
						error: null,
					}),
				}),
			});

			// update
			const updateMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({ error: null }),
			});

			// read-back select
			const readBackMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: { content: projContent },
						error: null,
					}),
				}),
			});

			vi.mocked(supabase.from)
				.mockReturnValueOnce({ select: censusSelectMock } as any)
				.mockReturnValueOnce({ select: projSelectMock } as any)
				.mockReturnValueOnce({ update: updateMock } as any)
				.mockReturnValueOnce({ select: readBackMock } as any);

			const result = await syncTodoCenso("proy-1");

			expect(result.error).toBeUndefined();
			expect(result.data).toHaveProperty("content");
		});

		it("debe retornar error cuando no hay censo con trabajadera", async () => {
			const censusSelectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					not: vi.fn().mockReturnValue({
						order: vi.fn().mockResolvedValue({
							data: [],
							error: null,
						}),
					}),
				}),
			});

			vi.mocked(supabase.from).mockReturnValueOnce({
				select: censusSelectMock,
			} as any);

			const result = await syncTodoCenso("proy-1");

			expect(result.error).toBe(
				"No hay costaleros con trabajadera asignada en el censo.",
			);
		});

		it("debe retornar error cuando el proyecto no existe", async () => {
			const censusSelectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					not: vi.fn().mockReturnValue({
						order: vi.fn().mockResolvedValue({
							data: [{ nombre: "Juan", apellidos: "", apodo: "J", trabajadera: 1 }],
							error: null,
						}),
					}),
				}),
			});

			const projSelectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: null,
						error: { message: "not found" },
					}),
				}),
			});

			vi.mocked(supabase.from)
				.mockReturnValueOnce({ select: censusSelectMock } as any)
				.mockReturnValueOnce({ select: projSelectMock } as any);

			const result = await syncTodoCenso("proy-1");

			expect(result.error).toBe("not found");
		});

		it("debe retornar error cuando el update falla", async () => {
			const censusData = [
				{ nombre: "Juan", apellidos: "Pérez", apodo: "Juanito", trabajadera: 1, rol: "COR", rol_sec: "FIJ_I" },
			];

			const censusSelectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					not: vi.fn().mockReturnValue({
						order: vi.fn().mockResolvedValue({
							data: censusData,
							error: null,
						}),
					}),
				}),
			});

			const projSelectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: {
							content: {
								trabajaderas: [{ id: 1, nombres: ["Costalero 1"] }],
							},
						},
						error: null,
					}),
				}),
			});

			const updateMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({
					error: { message: "RLS violation" },
				}),
			});

			vi.mocked(supabase.from)
				.mockReturnValueOnce({ select: censusSelectMock } as any)
				.mockReturnValueOnce({ select: projSelectMock } as any)
				.mockReturnValueOnce({ update: updateMock } as any);

			const result = await syncTodoCenso("proy-1");

			expect(result.error).toBe("RLS violation");
		});
	});

	describe("syncProjectToCensus", () => {
		it("debe escanear proyecto y agregar nombres nuevos al censo", async () => {
			const projResult = {
				data: {
					content: {
						trabajaderas: [
							{ id: 1, nombres: ["Juan Pérez", "Pedro López"] },
						],
					},
				},
				error: null,
			};

			const censusResult = { data: [], error: null };

			const insertResult = { error: null };

			const projSelectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue(projResult),
				}),
			});

			const censusSelectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue(censusResult),
			});

			const insertMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue(insertResult),
			});

			vi.mocked(supabase.from)
				.mockReturnValueOnce({ select: projSelectMock } as any)
				.mockReturnValueOnce({ select: censusSelectMock } as any)
				.mockReturnValueOnce({ insert: insertMock } as any);

			const result = await syncProjectToCensus("proy-1", "temp-1");

			expect(result.error).toBeUndefined();
			expect(result.data).toEqual({ inserted: 2 });
		});

		it("debe retornar error cuando el proyecto no existe", async () => {
			const projSelectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: null,
						error: null,
					}),
				}),
			});

			vi.mocked(supabase.from).mockReturnValueOnce({
				select: projSelectMock,
			} as any);

			const result = await syncProjectToCensus("nonexistent", "temp-1");

			expect(result.error).toBe("Proyecto no encontrado");
		});

		it("debe retornar inserted:0 cuando no hay nombres nuevos", async () => {
			const projResult = {
				data: {
					content: {
						trabajaderas: [
							{ id: 1, nombres: ["Costalero 1", "Costalero 2"] },
						],
					},
				},
				error: null,
			};

			const censusResult = { data: [], error: null };

			const projSelectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue(projResult),
				}),
			});

			const censusSelectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue(censusResult),
			});

			vi.mocked(supabase.from)
				.mockReturnValueOnce({ select: projSelectMock } as any)
				.mockReturnValueOnce({ select: censusSelectMock } as any);

			const result = await syncProjectToCensus("proy-1", "temp-1");

			expect(result.error).toBeUndefined();
			expect(result.data).toEqual({ inserted: 0 });
		});

		it("debe retornar error cuando el insert falla", async () => {
			const projResult = {
				data: {
					content: {
						trabajaderas: [
							{ id: 1, nombres: ["Juan Pérez"] },
						],
					},
				},
				error: null,
			};

			const censusResult = { data: [], error: null };

			const projSelectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue(projResult),
				}),
			});

			const censusSelectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue(censusResult),
			});

			const insertMock = vi.fn().mockResolvedValue({
				error: { message: "constraint violation" },
			});

			vi.mocked(supabase.from)
				.mockReturnValueOnce({ select: projSelectMock } as any)
				.mockReturnValueOnce({ select: censusSelectMock } as any)
				.mockReturnValueOnce({ insert: insertMock } as any);

			const result = await syncProjectToCensus("proy-1", "temp-1");

			expect(result.error).toBe("constraint violation");
		});
	});
});

// ── IMPORTACIÓN ICUADRILLA ──────────────────────────────────────────

describe("Importación iCuadrilla", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("fetchICuadrillaData", () => {
		it("debe obtener datos remotos correctamente", async () => {
			const mockData = [
				{
					nombre: "Juan",
					apellidos: "Pérez",
					apodo: "Juanito",
					email: null,
					trabajadera: 1,
					rol: "COR" as const,
					external_id: "ext-1",
					selected: false,
				},
			];

			vi.spyOn(global, "fetch").mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue(mockData),
			} as unknown as Response);

			const result = await fetchICuadrillaData("token-abc");

			expect(result.error).toBeUndefined();
			expect(result.data).toEqual(mockData);
			expect(global.fetch).toHaveBeenCalledWith(
				"/api/import-costaleros",
				expect.objectContaining({
					headers: { Authorization: "Bearer token-abc" },
				}),
			);
		});

		it("debe retornar error cuando el fetch falla", async () => {
			vi.spyOn(global, "fetch").mockResolvedValue({
				ok: false,
				status: 500,
				text: vi.fn().mockResolvedValue("Internal Server Error"),
			} as unknown as Response);

			const result = await fetchICuadrillaData("token-abc");

			expect(result.error).toBe("Internal Server Error");
		});

		it("debe retornar error con status cuando no hay texto de error", async () => {
			vi.spyOn(global, "fetch").mockResolvedValue({
				ok: false,
				status: 404,
				text: vi.fn().mockResolvedValue(""),
			} as unknown as Response);

			const result = await fetchICuadrillaData("token-abc");

			expect(result.error).toBe("Error 404 al obtener datos");
		});
	});

	describe("executeImport", () => {
		it("debe ejecutar la importación correctamente", async () => {
			const mockResult = { deleted: 5, inserted: 10 };

			vi.spyOn(global, "fetch").mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue(mockResult),
			} as unknown as Response);

			const result = await executeImport("proy-1", "token-abc");

			expect(result.error).toBeUndefined();
			expect(result.data).toEqual(mockResult);
			expect(global.fetch).toHaveBeenCalledWith(
				"/api/import-costaleros",
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ proyecto_id: "proy-1" }),
				}),
			);
		});

		it("debe retornar error cuando el fetch responde con error", async () => {
			vi.spyOn(global, "fetch").mockResolvedValue({
				ok: false,
				status: 400,
				json: vi.fn().mockResolvedValue({ error: "Proyecto no encontrado" }),
			} as unknown as Response);

			const result = await executeImport("nonexistent", "token-abc");

			expect(result.error).toBe("Proyecto no encontrado");
		});

		it("debe retornar error con status cuando la respuesta no tiene body parseable", async () => {
			vi.spyOn(global, "fetch").mockResolvedValue({
				ok: false,
				status: 500,
				json: vi.fn().mockRejectedValue(new Error("invalid json")),
			} as unknown as Response);

			const result = await executeImport("proy-1", "token-abc");

			expect(result.error).toBe("Error 500");
		});
	});

	describe("fullSyncCheck", () => {
		it("debe comparar datos remotos vs locales y retornar entradas a borrar", async () => {
			const remoteData = [
				{ external_id: "ext-1", nombre: "Juan", apellidos: "Pérez" },
				{ external_id: "ext-2", nombre: "Pedro", apellidos: "López" },
			];

			const localData = [
				{ id: "c1", external_id: "ext-1", nombre: "Juan", apellidos: "Pérez" },
				{ id: "c2", external_id: "ext-3", nombre: "María", apellidos: "García" },
			];

			vi.spyOn(global, "fetch").mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue(remoteData),
			} as unknown as Response);

			const notMock = vi.fn().mockResolvedValue({
				data: localData,
				error: null,
			});
			const eq2Mock = vi.fn().mockReturnValue({ not: notMock });
			const eq1Mock = vi.fn().mockReturnValue({ eq: eq2Mock });
			const selectMock = vi.fn().mockReturnValue({ eq: eq1Mock });

			vi.mocked(supabase.from).mockReturnValue({
				select: selectMock,
			} as any);

			const result = await fullSyncCheck("proy-1", "token-abc");

			expect(result.error).toBeUndefined();
			expect(result.data?.aBorrar).toHaveLength(1);
			expect(result.data?.aBorrar[0].external_id).toBe("ext-3");
		});

		it("debe retornar lista vacía cuando no hay datos locales", async () => {
			vi.spyOn(global, "fetch").mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue([]),
			} as unknown as Response);

			const notMock = vi.fn().mockResolvedValue({
				data: null,
				error: null,
			});
			const eq2Mock = vi.fn().mockReturnValue({ not: notMock });
			const eq1Mock = vi.fn().mockReturnValue({ eq: eq2Mock });
			const selectMock = vi.fn().mockReturnValue({ eq: eq1Mock });

			vi.mocked(supabase.from).mockReturnValue({
				select: selectMock,
			} as any);

			const result = await fullSyncCheck("proy-1", "token-abc");

			expect(result.error).toBeUndefined();
			expect(result.data?.aBorrar).toEqual([]);
		});

		it("debe retornar error cuando el fetch remoto falla", async () => {
			vi.spyOn(global, "fetch").mockResolvedValue({
				ok: false,
				status: 500,
				text: vi.fn().mockResolvedValue("Remote error"),
			} as unknown as Response);

			const result = await fullSyncCheck("proy-1", "token-abc");

			expect(result.error).toBe("Remote error");
		});
	});

	describe("deleteCensusEntry", () => {
		it("debe borrar una entrada del censo", async () => {
			const eqMock = vi.fn().mockResolvedValue({ error: null });
			const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });

			vi.mocked(supabase.from).mockReturnValue({
				delete: deleteMock,
			} as any);

			const result = await deleteCensusEntry("census-1");

			expect(result.error).toBeUndefined();
		});

		it("debe retornar error cuando Supabase falla", async () => {
			const eqMock = vi.fn().mockResolvedValue({
				error: { message: "not found" },
			});
			const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });

			vi.mocked(supabase.from).mockReturnValue({
				delete: deleteMock,
			} as any);

			const result = await deleteCensusEntry("nonexistent");

			expect(result.error).toBe("not found");
		});
	});
});

// ── TEMPORADAS ──────────────────────────────────────────────────────

describe("Temporadas", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("deleteTemporada", () => {
		it("debe borrar temporada con cascade (census → proyectos → temporada)", async () => {
			// proyectos select
			const proyectosSelectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({
					data: [{ id: "proy-1" }, { id: "proy-2" }],
					error: null,
				}),
			});

			// census delete (in)
			const censusInMock = vi.fn().mockResolvedValue({ error: null });
			const censusDeleteInMock = vi.fn().mockReturnValue({ in: censusInMock });

			// census delete (eq)
			const censusEqMock = vi.fn().mockResolvedValue({ error: null });
			const censusDeleteEqMock = vi.fn().mockReturnValue({ eq: censusEqMock });

			// proyectos delete
			const proyectosDeleteMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({ error: null }),
			});

			// temporadas delete
			const temporadasDeleteMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					select: vi.fn().mockResolvedValue({
						data: [{ id: "temp-1" }],
						error: null,
					}),
				}),
			});

			vi.mocked(supabase.from)
				.mockReturnValueOnce({ select: proyectosSelectMock } as any)
				.mockReturnValueOnce({ delete: censusDeleteInMock } as any)
				.mockReturnValueOnce({ delete: censusDeleteEqMock } as any)
				.mockReturnValueOnce({ delete: proyectosDeleteMock } as any)
				.mockReturnValueOnce({ delete: temporadasDeleteMock } as any);

			const result = await deleteTemporada("temp-1");

			expect(result.error).toBeUndefined();
			expect(censusInMock).toHaveBeenCalledWith("proyecto_id", ["proy-1", "proy-2"]);
		});

		it("debe funcionar cuando no hay proyectos en la temporada", async () => {
			const proyectosSelectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({
					data: [],
					error: null,
				}),
			});

			const censusEqMock = vi.fn().mockResolvedValue({ error: null });
			const censusDeleteEqMock = vi.fn().mockReturnValue({ eq: censusEqMock });

			const proyectosDeleteMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({ error: null }),
			});

			const temporadasDeleteMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					select: vi.fn().mockResolvedValue({
						data: [{ id: "temp-1" }],
						error: null,
					}),
				}),
			});

			vi.mocked(supabase.from)
				.mockReturnValueOnce({ select: proyectosSelectMock } as any)
				.mockReturnValueOnce({ delete: censusDeleteEqMock } as any)
				.mockReturnValueOnce({ delete: proyectosDeleteMock } as any)
				.mockReturnValueOnce({ delete: temporadasDeleteMock } as any);

			const result = await deleteTemporada("temp-1");

			expect(result.error).toBeUndefined();
		});

		it("debe retornar error cuando falla el delete de proyectos", async () => {
			const proyectosSelectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({
					data: [],
					error: null,
				}),
			});

			const censusEqMock = vi.fn().mockResolvedValue({ error: null });
			const censusDeleteEqMock = vi.fn().mockReturnValue({ eq: censusEqMock });

			const proyectosDeleteMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({
					error: { message: "foreign key violation" },
				}),
			});

			vi.mocked(supabase.from)
				.mockReturnValueOnce({ select: proyectosSelectMock } as any)
				.mockReturnValueOnce({ delete: censusDeleteEqMock } as any)
				.mockReturnValueOnce({ delete: proyectosDeleteMock } as any);

			const result = await deleteTemporada("temp-1");

			expect(result.error).toBe("foreign key violation");
		});

		it("debe retornar error cuando no se puede borrar la temporada (RLS)", async () => {
			const proyectosSelectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({
					data: [],
					error: null,
				}),
			});

			const censusEqMock = vi.fn().mockResolvedValue({ error: null });
			const censusDeleteEqMock = vi.fn().mockReturnValue({ eq: censusEqMock });

			const proyectosDeleteMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({ error: null }),
			});

			const temporadasDeleteMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					select: vi.fn().mockResolvedValue({
						data: [],
						error: null,
					}),
				}),
			});

			vi.mocked(supabase.from)
				.mockReturnValueOnce({ select: proyectosSelectMock } as any)
				.mockReturnValueOnce({ delete: censusDeleteEqMock } as any)
				.mockReturnValueOnce({ delete: proyectosDeleteMock } as any)
				.mockReturnValueOnce({ delete: temporadasDeleteMock } as any);

			const result = await deleteTemporada("temp-1");

			expect(result.error).toContain("RLS");
		});
	});

	describe("createTemporada", () => {
		it("debe crear una temporada nueva sin clonar", async () => {
			const insertMock = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: { id: "temp-new", nombre: "2025", activa: false },
						error: null,
					}),
				}),
			});

			vi.mocked(supabase.from).mockReturnValue({
				insert: insertMock,
			} as any);

			const result = await createTemporada({
				nombre: "2025",
				clonarCenso: false,
				clonarPasos: false,
				sourceTempId: "",
			});

			expect(result.error).toBeUndefined();
			expect(insertMock).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({ nombre: "2025", activa: false }),
				]),
			);
		});

		it("debe retornar error cuando falla la creación de temporada", async () => {
			const insertMock = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: null,
						error: { message: "duplicate" },
					}),
				}),
			});

			vi.mocked(supabase.from).mockReturnValue({
				insert: insertMock,
			} as any);

			const result = await createTemporada({
				nombre: "2025",
				clonarCenso: false,
				clonarPasos: false,
				sourceTempId: "",
			});

			expect(result.error).toBe("Error al crear temporada");
		});

		it("debe clonar pasos cuando clonarPasos=true", async () => {
			// create temporada
			const tempInsertMock = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: { id: "temp-new", nombre: "2025", activa: false },
						error: null,
					}),
				}),
			});

			// fetch old proyectos
			const oldProyectosMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({
					data: [
						{
							id: "proy-old-1",
							nombre_paso: "Macarena",
							nombre_cuadrilla: "Test",
							num_trabajaderas: 1,
							content: {
								trabajaderas: [
									{
										id: 1,
										nombres: ["Juan"],
										plan: {},
										obj: { 1: 1 },
										analisis: {},
										pinned: [],
										bajas: [1],
									},
								],
								banco: [],
							},
							temporada_id: "temp-old",
						},
					],
					error: null,
				}),
			});

			// insert cloned proyecto
		 const clonedInsertMock = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: { id: "proy-new-1" },
						error: null,
					}),
				}),
			});

			vi.mocked(supabase.from)
				.mockReturnValueOnce({ insert: tempInsertMock } as any)
				.mockReturnValueOnce({ select: oldProyectosMock } as any)
				.mockReturnValueOnce({ insert: clonedInsertMock } as any);

			const result = await createTemporada({
				nombre: "2025",
				clonarCenso: false,
				clonarPasos: true,
				sourceTempId: "temp-old",
			});

			expect(result.error).toBeUndefined();
			expect(clonedInsertMock).toHaveBeenCalled();
		});

		it("debe clonar censo cuando clonarCenso=true", async () => {
			// create temporada
			const tempInsertMock = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: { id: "temp-new", nombre: "2025", activa: false },
						error: null,
					}),
				}),
			});

			// fetch old census
			const oldCensusMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({
					data: [
						{
							id: "c1",
							nombre: "Juan",
							apellidos: "Pérez",
							proyecto_id: "proy-old-1",
							temporada_id: "temp-old",
						},
					],
					error: null,
				}),
			});

			// insert cloned census
			const censusInsertMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({ error: null }),
			});

			vi.mocked(supabase.from)
				.mockReturnValueOnce({ insert: tempInsertMock } as any)
				.mockReturnValueOnce({ select: oldCensusMock } as any)
				.mockReturnValueOnce({ insert: censusInsertMock } as any);

			const result = await createTemporada({
				nombre: "2025",
				clonarCenso: true,
				clonarPasos: false,
				sourceTempId: "temp-old",
			});

			expect(result.error).toBeUndefined();
			expect(censusInsertMock).toHaveBeenCalled();
		});

		it("debe retornar error cuando falla el clonado de censo", async () => {
			const tempInsertMock = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: { id: "temp-new", nombre: "2025", activa: false },
						error: null,
					}),
				}),
			});

			const oldCensusMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({
					data: null,
					error: { message: "timeout" },
				}),
			});

			vi.mocked(supabase.from)
				.mockReturnValueOnce({ insert: tempInsertMock } as any)
				.mockReturnValueOnce({ select: oldCensusMock } as any);

			const result = await createTemporada({
				nombre: "2025",
				clonarCenso: true,
				clonarPasos: false,
				sourceTempId: "temp-old",
			});

			expect(result.error).toBe("Error al leer el censo de la temporada origen");
		});

		it("debe retornar error cuando falla el insert de proyecto clonado", async () => {
			const tempInsertMock = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: { id: "temp-new", nombre: "2025", activa: false },
						error: null,
					}),
				}),
			});

			const oldProyectosMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({
					data: [
						{
							id: "proy-old-1",
							nombre_paso: "Macarena",
							nombre_cuadrilla: "Test",
							num_trabajaderas: 1,
							content: {
								trabajaderas: [{ id: 1, nombres: [], plan: null, obj: {}, analisis: null, pinned: null, bajas: [] }],
								banco: [],
							},
							temporada_id: "temp-old",
						},
					],
					error: null,
				}),
			});

			const clonedInsertMock = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: null,
						error: { message: "constraint violation" },
					}),
				}),
			});

			vi.mocked(supabase.from)
				.mockReturnValueOnce({ insert: tempInsertMock } as any)
				.mockReturnValueOnce({ select: oldProyectosMock } as any)
				.mockReturnValueOnce({ insert: clonedInsertMock } as any);

			const result = await createTemporada({
				nombre: "2025",
				clonarCenso: false,
				clonarPasos: true,
				sourceTempId: "temp-old",
			});

			expect(result.error).toBe("constraint violation");
		});
	});
});
