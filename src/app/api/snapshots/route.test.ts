import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET, POST } from "./route";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import * as corsModule from "@/lib/cors";

vi.mock("@/lib/supabaseAdmin");

const mockAdmin = vi.mocked(getSupabaseAdmin);

describe("GET /api/snapshots", () => {
  const mockSelect = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockOrder = vi.fn();
  const mockSingle = vi.fn();
  const mockFrom = vi.fn();

  const mockAdminInstance = {
    auth: { getUser: vi.fn() },
    from: mockFrom,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAdmin.mockReturnValue(mockAdminInstance as never);
    vi.spyOn(corsModule, "withCors").mockImplementation((r) => r as never);

    // Default: from returns chainable for auth query
    mockFrom.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      single: mockSingle,
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setupAuth(role = "capataz") {
    mockAdminInstance.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockSingle.mockResolvedValue({ data: { role }, error: null });
  }

  it("should return 401 when no Authorization header", async () => {
    const req = new Request("http://localhost/api/snapshots");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("No autenticado.");
  });

  it("should return 403 when user is not esMando (costalero)", async () => {
    setupAuth("costalero");

    const req = new Request("http://localhost/api/snapshots", {
      headers: { Authorization: "Bearer valid-token" },
    });
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe("No autorizado.");
  });

  it("should return snapshots sorted by created_at DESC for capataz", async () => {
    setupAuth("capataz");

    const mockSnapshots = [
      {
        id: "snap-2",
        nombre: "Trabajadera 1 — 11/06/2026",
        creado_en: "2026-06-11T10:00:00Z",
        snapshot: {
          plan_summary: { status: "ok" },
          trabajadera_count: 1,
        },
        proyectos: { nombre: "Paso Test" },
        temporadas: { nombre: "2026" },
      },
      {
        id: "snap-1",
        nombre: "Trabajadera 1 — 10/06/2026",
        creado_en: "2026-06-10T10:00:00Z",
        snapshot: {
          plan_summary: { status: "incomplete" },
          trabajadera_count: 1,
        },
        proyectos: { nombre: "Paso Test" },
        temporadas: { nombre: "2026" },
      },
    ];

    // The second from() call (main query) should return the list
    mockOrder.mockResolvedValue({ data: mockSnapshots, error: null });

    const req = new Request("http://localhost/api/snapshots", {
      headers: { Authorization: "Bearer valid-token" },
    });
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.snapshots).toHaveLength(2);
    expect(json.snapshots[0].id).toBe("snap-2");
    expect(json.snapshots[1].id).toBe("snap-1");
  });

  it("should return empty array when no snapshots exist", async () => {
    setupAuth("capataz");

    mockOrder.mockResolvedValue({ data: [], error: null });

    const req = new Request("http://localhost/api/snapshots", {
      headers: { Authorization: "Bearer valid-token" },
    });
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.snapshots).toEqual([]);
  });
});

describe("POST /api/snapshots", () => {
  const mockSelect = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockInsert = vi.fn().mockReturnThis();
  const mockSingle = vi.fn();
  const mockFrom = vi.fn();
  let singleCallCount = 0;

  const mockAdminInstance = {
    auth: { getUser: vi.fn() },
    from: mockFrom,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    singleCallCount = 0;
    mockAdmin.mockReturnValue(mockAdminInstance as never);
    vi.spyOn(corsModule, "withCors").mockImplementation((r) => r as never);

    mockFrom.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      insert: mockInsert,
      single: mockSingle,
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setupAuth(role = "capataz") {
    mockAdminInstance.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockSingle.mockResolvedValue({ data: { role }, error: null });
  }

  it("should return 403 when user is not esMando", async () => {
    setupAuth("costalero");

    const req = new Request("http://localhost/api/snapshots", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        proyecto_id: "550e8400-e29b-41d4-a716-446655440000",
        temporada_id: "550e8400-e29b-41d4-a716-446655440001",
        nombre: "Test snapshot",
        snapshot: { banco: [], planes: [], trabajaderas: [] },
      }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe("No autorizado.");
  });

  it("should return 400 when body is missing required fields", async () => {
    setupAuth("capataz");

    const req = new Request("http://localhost/api/snapshots", {
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

  it("should create snapshot and return it", async () => {
    setupAuth("capataz");

    const createdSnapshot = {
      id: "snap-new",
      nombre: "Trabajadera 1 — 11/06/2026",
      creado_en: "2026-06-11T10:00:00Z",
      snapshot: {
        plan_summary: { status: "ok" },
        trabajadera_count: 1,
      },
    };

    let callCount = 0;
    mockSingle.mockImplementation(async () => {
      callCount++;
      // First single() is auth → return role
      if (callCount === 1) return { data: { role: "capataz" }, error: null };
      // Second single() is insert result
      return { data: createdSnapshot, error: null };
    });

    const req = new Request("http://localhost/api/snapshots", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        proyecto_id: "550e8400-e29b-41d4-a716-446655440000",
        temporada_id: "550e8400-e29b-41d4-a716-446655440001",
        nombre: "Trabajadera 1 — 11/06/2026",
        snapshot: { banco: [], planes: [], trabajaderas: [] },
      }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.snapshot.id).toBe("snap-new");
  });
});
