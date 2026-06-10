import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET, POST } from "./route";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import * as rateLimitModule from "@/lib/rateLimit";
import * as corsModule from "@/lib/cors";

vi.mock("@/lib/supabaseAdmin");

// Valid UUID v4 format
const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

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
		vi.spyOn(rateLimitModule, "rateLimit").mockReturnValue({
			success: true,
			limit: 5,
			remaining: 4,
			resetAt: Date.now() + 60_000,
		});
		vi.spyOn(corsModule, "withCors").mockImplementation(
			(response) => response,
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	function setupAuth(role = "superadmin") {
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

	it("should return 401 when no Authorization header", async () => {
		const req = new Request("http://localhost/api/import-costaleros");
		const res = await GET(req);
		const json = await res.json();

		expect(res.status).toBe(401);
		expect(json.error).toBe("No autenticado.");
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
		expect(json.error).toBe("No autenticado.");
	});

	it("should return 403 when user is not admin", async () => {
		setupAuth("costalero");

		const req = new Request("http://localhost/api/import-costaleros", {
			headers: { Authorization: "Bearer valid-token" },
		});
		const res = await GET(req);
		const json = await res.json();

		expect(res.status).toBe(403);
		expect(json.error).toBe("No autorizado.");
	});

	it("should return 429 when rate limit is exceeded", async () => {
		vi.mocked(rateLimitModule.rateLimit).mockReturnValue({
			success: false,
			limit: 5,
			remaining: 0,
			resetAt: Date.now() + 60_000,
		});

		const req = new Request("http://localhost/api/import-costaleros", {
			headers: {
				Authorization: "Bearer valid-token",
			},
		});
		const res = await GET(req);
		const json = await res.json();

		expect(res.status).toBe(429);
		expect(json.error).toBe("Demasiados intentos. Intentá de nuevo.");
	});

	it("should return 500 with generic error when env vars are missing", async () => {
		setupAuth("superadmin");

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
		expect(json.error).toBe("Error interno. Intentá más tarde.");

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
		vi.spyOn(rateLimitModule, "rateLimit").mockReturnValue({
			success: true,
			limit: 5,
			remaining: 4,
			resetAt: Date.now() + 60_000,
		});
		vi.spyOn(corsModule, "withCors").mockImplementation(
			(response) => response,
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	function setupAuth(role = "superadmin") {
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

	// ── Body size ──

	it("should return 413 when body exceeds 5MB", async () => {
		setupAuth();

		const req = new Request("http://localhost/api/import-costaleros", {
			method: "POST",
			headers: {
				Authorization: "Bearer valid-token",
				"Content-Type": "application/json",
				"Content-Length": String(6 * 1024 * 1024),
			},
			body: JSON.stringify({ proyecto_id: VALID_UUID }),
		});
		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(413);
		expect(json.error).toContain("demasiado grande");
	});

	// ── Rate limiting ──

	it("should return 429 when rate limit is exceeded", async () => {
		vi.mocked(rateLimitModule.rateLimit).mockReturnValue({
			success: false,
			limit: 5,
			remaining: 0,
			resetAt: Date.now() + 60_000,
		});

		const req = new Request("http://localhost/api/import-costaleros", {
			method: "POST",
			headers: {
				Authorization: "Bearer valid-token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ proyecto_id: VALID_UUID }),
		});
		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(429);
		expect(json.error).toBe("Demasiados intentos. Intentá de nuevo.");
	});

	// ── Validation ──

	it("should return 400 when proyecto_id is missing", async () => {
		setupAuth();

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
		expect(json.error).toBe("Datos inválidos.");
	});

	it("should return 400 when proyecto_id is not a valid UUID", async () => {
		setupAuth();

		const req = new Request("http://localhost/api/import-costaleros", {
			method: "POST",
			headers: {
				Authorization: "Bearer valid-token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ proyecto_id: "not-a-uuid" }),
		});
		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(400);
		expect(json.error).toBe("Datos inválidos.");
	});

	// ── iCuadrilla API errors ──

	it("should return generic error when iCuadrilla API fails", async () => {
		setupAuth();
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
			body: JSON.stringify({ proyecto_id: VALID_UUID }),
		});
		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(500);
		expect(json.error).toBe("Error interno. Intentá más tarde.");
	});

	it("should return generic error when RPC fails", async () => {
		setupAuth();
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
			body: JSON.stringify({ proyecto_id: VALID_UUID }),
		});
		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(500);
		expect(json.error).toBe("Error interno. Intentá más tarde.");
	});

	it("should perform full sync successfully", async () => {
		setupAuth();
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
			body: JSON.stringify({ proyecto_id: VALID_UUID }),
		});
		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.deleted).toBe(3);
		expect(json.inserted).toBe(2);

		expect(mockAdmin.rpc).toHaveBeenCalledWith("full_sync_icuadrilla_census", {
			p_proyecto_id: VALID_UUID,
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

	// ── CORS ──

	it("should call withCors on response", async () => {
		setupAuth();
		process.env.ICUADRILLA_API_URL = "https://api.icuadrilla.test";
		process.env.ICUADRILLA_API_TOKEN = "test-token";

		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => [],
		});

		mockAdmin.rpc.mockResolvedValue({
			data: { deleted: 0, inserted: 0 },
			error: null,
		});

		const req = new Request("http://localhost/api/import-costaleros", {
			method: "POST",
			headers: {
				Authorization: "Bearer valid-token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ proyecto_id: VALID_UUID }),
		});
		await POST(req);

		expect(corsModule.withCors).toHaveBeenCalled();
	});
});
