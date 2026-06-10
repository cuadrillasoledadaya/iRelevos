import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import * as rateLimitModule from "@/lib/rateLimit";
import * as corsModule from "@/lib/cors";

vi.mock("@/lib/supabaseAdmin");

// Valid UUID v4 format
const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const ANOTHER_UUID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

describe("POST /api/admin/delete-user", () => {
	const mockAdmin = {
		auth: {
			getUser: vi.fn(),
			admin: {
				deleteUser: vi.fn(),
			},
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
			limit: 10,
			remaining: 9,
			resetAt: Date.now() + 60_000,
		});
		vi.spyOn(corsModule, "withCors").mockImplementation(
			(response) => response,
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	/**
	 * Set up auth mocks. The from() chain is shared for both
	 * the auth check (select) and the delete operation.
	 */
	function setupAuth(role = "superadmin", profileError = false, deleteError = false) {
		mockAdmin.auth.getUser.mockResolvedValue({
			data: { user: { id: "admin-1" } },
			error: null,
		});

		// Create a chain that works for both select and delete patterns
		const chain = {
			select: vi.fn().mockReturnThis(),
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue(
				profileError
					? { data: null, error: { message: "Profile not found" } }
					: { data: { role }, error: null },
			),
		};

		// For delete operations, override eq to return the delete result
		const deleteEqResult = deleteError
			? { data: null, error: { message: "Profile delete failed" } }
			: { data: null, error: null };

		// Make eq return different results based on call order
		// First eq call is for auth (select chain), second is for delete
		let eqCallCount = 0;
		chain.eq.mockImplementation(() => {
			eqCallCount++;
			if (eqCallCount === 1) {
				// Auth check eq -> returns chain for single()
				return chain;
			}
			// Delete eq -> returns the delete result
			return Promise.resolve(deleteEqResult);
		});

		mockAdmin.from.mockReturnValue(chain);
	}

	// ── Body size ──

	it("should return 413 when body is too large", async () => {
		const req = new Request("http://localhost/api/admin/delete-user", {
			method: "POST",
			headers: {
				"Content-Length": String(2 * 1024 * 1024),
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ uid: VALID_UUID }),
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
			limit: 10,
			remaining: 0,
			resetAt: Date.now() + 60_000,
		});

		const req = new Request("http://localhost/api/admin/delete-user", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ uid: VALID_UUID }),
		});
		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(429);
		expect(json.error).toBe("Demasiados intentos. Intentá de nuevo.");
	});

	// ── Validation ──

	it("should return 400 when body is missing", async () => {
		setupAuth();

		const req = new Request("http://localhost/api/admin/delete-user", {
			method: "POST",
			headers: {
				Authorization: "Bearer valid-token",
				"Content-Type": "application/json",
			},
			body: "not-json",
		});
		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(400);
		expect(json.error).toBe("Datos inválidos.");
	});

	it("should return 400 when uid is empty", async () => {
		setupAuth();

		const req = new Request("http://localhost/api/admin/delete-user", {
			method: "POST",
			headers: {
				Authorization: "Bearer valid-token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ uid: "" }),
		});
		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(400);
		expect(json.error).toBe("Datos inválidos.");
	});

	it("should return 400 when uid is not a valid UUID", async () => {
		setupAuth();

		const req = new Request("http://localhost/api/admin/delete-user", {
			method: "POST",
			headers: {
				Authorization: "Bearer valid-token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ uid: "not-a-uuid" }),
		});
		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(400);
		expect(json.error).toBe("Datos inválidos.");
	});

	// ── Auth ──

	it("should return 401 when no Authorization header", async () => {
		const req = new Request("http://localhost/api/admin/delete-user", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ uid: VALID_UUID }),
		});
		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(401);
		expect(json.error).toBe("No autenticado.");
	});

	it("should return 401 when token is invalid", async () => {
		mockAdmin.auth.getUser.mockResolvedValue({
			data: { user: null },
			error: new Error("invalid"),
		});

		const req = new Request("http://localhost/api/admin/delete-user", {
			method: "POST",
			headers: {
				Authorization: "Bearer bad-token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ uid: VALID_UUID }),
		});
		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(401);
		expect(json.error).toBe("No autenticado.");
	});

	it("should return 403 when user is not superadmin", async () => {
		setupAuth("costalero");

		const req = new Request("http://localhost/api/admin/delete-user", {
			method: "POST",
			headers: {
				Authorization: "Bearer valid-token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ uid: VALID_UUID }),
		});
		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(403);
		expect(json.error).toBe("No autorizado.");
	});

	it("should return 403 when trying to delete yourself", async () => {
		mockAdmin.auth.getUser.mockResolvedValue({
			data: { user: { id: VALID_UUID } },
			error: null,
		});
		mockAdmin.from.mockReturnValue({
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { role: "superadmin" },
				error: null,
			}),
		});

		const req = new Request("http://localhost/api/admin/delete-user", {
			method: "POST",
			headers: {
				Authorization: "Bearer valid-token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ uid: VALID_UUID }),
		});
		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(403);
		expect(json.error).toBe("No autorizado.");
	});

	// ── Success ──

	it("should successfully delete a user", async () => {
		setupAuth();
		mockAdmin.auth.admin.deleteUser.mockResolvedValue({ error: null });

		const req = new Request("http://localhost/api/admin/delete-user", {
			method: "POST",
			headers: {
				Authorization: "Bearer valid-token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ uid: ANOTHER_UUID }),
		});
		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.success).toBe(true);
	});

	// ── Generic errors ──

	it("should return generic error when Supabase auth delete fails", async () => {
		setupAuth();
		mockAdmin.auth.admin.deleteUser.mockResolvedValue({
			error: { message: "User not found", status: 404 },
		});

		const req = new Request("http://localhost/api/admin/delete-user", {
			method: "POST",
			headers: {
				Authorization: "Bearer valid-token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ uid: ANOTHER_UUID }),
		});
		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(500);
		expect(json.error).toBe("Error interno. Intentá más tarde.");
	});

	it("should return generic error when profile delete fails", async () => {
		setupAuth("superadmin", false, true);
		mockAdmin.auth.admin.deleteUser.mockResolvedValue({ error: null });

		const req = new Request("http://localhost/api/admin/delete-user", {
			method: "POST",
			headers: {
				Authorization: "Bearer valid-token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ uid: ANOTHER_UUID }),
		});
		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(500);
		expect(json.error).toBe("Error interno. Intentá más tarde.");
	});

	// ── CORS ──

	it("should call withCors on response", async () => {
		setupAuth();
		mockAdmin.auth.admin.deleteUser.mockResolvedValue({ error: null });

		const req = new Request("http://localhost/api/admin/delete-user", {
			method: "POST",
			headers: {
				Authorization: "Bearer valid-token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ uid: ANOTHER_UUID }),
		});
		await POST(req);

		expect(corsModule.withCors).toHaveBeenCalled();
	});
});
