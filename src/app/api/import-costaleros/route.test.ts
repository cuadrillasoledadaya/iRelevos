import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET, POST } from "./route";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

vi.mock("@/lib/supabaseAdmin");

describe("GET /api/import-costaleros", () => {
	const mockAdmin = {
		auth: {
			getUser: vi.fn(),
		},
		from: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getSupabaseAdmin).mockReturnValue(
			mockAdmin as unknown as ReturnType<typeof getSupabaseAdmin>,
		);
	});

	it("should return 401 when no Authorization header", async () => {
		const req = new Request("http://localhost/api/import-costaleros");
		const res = await GET(req);
		const json = await res.json();

		expect(res.status).toBe(401);
		expect(json.error).toBe("No autenticado");
	});

	it("should return 401 when token is invalid", async () => {
		mockAdmin.auth.getUser.mockResolvedValue({
			data: { user: null },
			error: new Error("invalid"),
		});

		const req = new Request("http://localhost/api/import-costaleros", {
			headers: { Authorization: "Bearer bad-token" },
		});
		const res = await GET(req);
		const json = await res.json();

		expect(res.status).toBe(401);
		expect(json.error).toBe("Token inválido");
	});

	it("should return 403 when user is not admin", async () => {
		mockAdmin.auth.getUser.mockResolvedValue({
			data: { user: { id: "user-1" } },
			error: null,
		});

		mockAdmin.from.mockReturnValue({
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi
				.fn()
				.mockResolvedValue({ data: { role: "costalero" }, error: null }),
		});

		const req = new Request("http://localhost/api/import-costaleros", {
			headers: { Authorization: "Bearer valid-token" },
		});
		const res = await GET(req);
		const json = await res.json();

		expect(res.status).toBe(403);
		expect(json.error).toBe("Solo admins pueden importar costaleros");
	});

	it("should return 500 when env vars are missing", async () => {
		mockAdmin.auth.getUser.mockResolvedValue({
			data: { user: { id: "admin-1" } },
			error: null,
		});

		mockAdmin.from.mockReturnValue({
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi
				.fn()
				.mockResolvedValue({ data: { role: "superadmin" }, error: null }),
		});

		const originalUrl = process.env.ICUADRILLA_API_URL;
		const originalToken = process.env.ICUADRILLA_API_TOKEN;
		delete process.env.ICUADRILLA_API_URL;
		delete process.env.ICUADRILLA_API_TOKEN;

		const req = new Request("http://localhost/api/import-costaleros", {
			headers: { Authorization: "Bearer valid-token" },
		});
		const res = await GET(req);
		const json = await res.json();

		expect(res.status).toBe(500);
		expect(json.error).toContain("Faltan variables de entorno");

		process.env.ICUADRILLA_API_URL = originalUrl;
		process.env.ICUADRILLA_API_TOKEN = originalToken;
	});
});

describe("POST /api/import-costaleros", () => {
	const mockAdmin = {
		auth: {
			getUser: vi.fn(),
		},
		from: vi.fn(),
		rpc: vi.fn(),
	};

	const mockFetch = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal("fetch", mockFetch);
		vi.mocked(getSupabaseAdmin).mockReturnValue(
			mockAdmin as unknown as ReturnType<typeof getSupabaseAdmin>,
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function authMocks(role = "superadmin") {
		mockAdmin.auth.getUser.mockResolvedValue({
			data: { user: { id: "admin-1" } },
			error: null,
		});
		mockAdmin.from.mockReturnValue({
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({ data: { role }, error: null }),
		});
	}

	it("should return 400 when proyecto_id is missing", async () => {
		authMocks();

		const req = new Request("http://localhost/api/import-costaleros", {
			method: "POST",
			headers: {
				Authorization: "Bearer valid-token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({}),
		});
		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(400);
		expect(json.error).toBe("proyecto_id es requerido");
	});

	it("should return 500 when iCuadrilla API fails", async () => {
		authMocks();
		process.env.ICUADRILLA_API_URL = "https://api.icuadrilla.test";
		process.env.ICUADRILLA_API_TOKEN = "test-token";

		mockFetch.mockResolvedValue({
			ok: false,
			status: 502,
			text: async () => "Bad Gateway",
		});

		const req = new Request("http://localhost/api/import-costaleros", {
			method: "POST",
			headers: {
				Authorization: "Bearer valid-token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ proyecto_id: "proj-1" }),
		});
		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(500);
		expect(json.error).toContain("iCuadrilla API respondió con 502");
	});

	it("should return 500 when RPC fails", async () => {
		authMocks();
		process.env.ICUADRILLA_API_URL = "https://api.icuadrilla.test";
		process.env.ICUADRILLA_API_TOKEN = "test-token";

		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => [
				{
					id: 1,
					nombre: "Juan",
					apellidos: "García",
					apodo: "El Rubio",
					trabajadera: 3,
					email: "juan@test.com",
				},
			],
		});

		mockAdmin.rpc.mockResolvedValue({
			data: null,
			error: { message: "DB transaction failed" },
		});

		const req = new Request("http://localhost/api/import-costaleros", {
			method: "POST",
			headers: {
				Authorization: "Bearer valid-token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ proyecto_id: "proj-1" }),
		});
		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(500);
		expect(json.error).toContain("DB transaction failed");
	});

	it("should perform full sync successfully", async () => {
		authMocks();
		process.env.ICUADRILLA_API_URL = "https://api.icuadrilla.test";
		process.env.ICUADRILLA_API_TOKEN = "test-token";

		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => [
				{
					id: 1,
					nombre: "Juan",
					apellidos: "García",
					apodo: "El Rubio",
					trabajadera: 3,
					email: "juan@test.com",
					puesto: "Patero Der",
				},
				{
					id: 2,
					nombre: "Pedro",
					apellidos: "López",
					apodo: "",
					trabajadera: 5,
					email: "",
					puesto: "Fijador Izq",
				},
			],
		});

		mockAdmin.rpc.mockResolvedValue({
			data: { deleted: 3, inserted: 2 },
			error: null,
		});

		const req = new Request("http://localhost/api/import-costaleros", {
			method: "POST",
			headers: {
				Authorization: "Bearer valid-token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ proyecto_id: "proj-1" }),
		});
		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.deleted).toBe(3);
		expect(json.inserted).toBe(2);

		expect(mockAdmin.rpc).toHaveBeenCalledWith("full_sync_icuadrilla_census", {
			p_proyecto_id: "proj-1",
			p_records: [
				{
					external_id: "1",
					nombre: "Juan",
					apellidos: "García",
					apodo: "El Rubio",
					email: "juan@test.com",
					trabajadera: 3,
					rol: "PAT_D",
					rol_sec: "COR",
					puntuacion: 0,
					source: "icuadrilla",
				},
				{
					external_id: "2",
					nombre: "Pedro",
					apellidos: "López",
					apodo: "",
					email: null,
					trabajadera: 5,
					rol: "FIJ_I",
					rol_sec: "COR",
					puntuacion: 0,
					source: "icuadrilla",
				},
			],
		});
	});
});
