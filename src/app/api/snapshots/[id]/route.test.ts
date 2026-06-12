import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET, DELETE } from "./route";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import * as corsModule from "@/lib/cors";

vi.mock("@/lib/supabaseAdmin");

const mockAdmin = vi.mocked(getSupabaseAdmin);

const SNAP_ID = "snap-123";

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/snapshots/[id]", () => {
  const mockSelect = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
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

    mockFrom.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
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

  it("should return 401 when not authenticated", async () => {
    const res = await GET(
      new Request("http://localhost/api/snapshots/snap-123"),
      makeCtx(SNAP_ID),
    );
    expect(res.status).toBe(401);
  });

  it("should return 403 when user is not esMando", async () => {
    setupAuth("costalero");
    const res = await GET(
      new Request("http://localhost/api/snapshots/snap-123", {
        headers: { Authorization: "Bearer valid-token" },
      }),
      makeCtx(SNAP_ID),
    );
    expect(res.status).toBe(403);
  });

  it("should return 404 when snapshot not found", async () => {
    setupAuth("capataz");

    // First single() is auth, second is the snapshot query
    let callCount = 0;
    mockSingle.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return { data: { role: "capataz" }, error: null };
      return { data: null, error: null };
    });

    const res = await GET(
      new Request("http://localhost/api/snapshots/snap-123", {
        headers: { Authorization: "Bearer valid-token" },
      }),
      makeCtx(SNAP_ID),
    );
    expect(res.status).toBe(404);
  });

  it("should return snapshot detail for authorized user", async () => {
    setupAuth("capataz");

    const mockSnapshot = {
      id: SNAP_ID,
      nombre: "Trabajadera 1 — 11/06/2026",
      creado_en: "2026-06-11T10:00:00Z",
      snapshot: {
        banco: [],
        planes: [],
        trabajaderas: [],
        plan_summary: { status: "ok" },
        trabajadera_count: 1,
      },
    };

    let callCount = 0;
    mockSingle.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return { data: { role: "capataz" }, error: null };
      return { data: mockSnapshot, error: null };
    });

    const res = await GET(
      new Request("http://localhost/api/snapshots/snap-123", {
        headers: { Authorization: "Bearer valid-token" },
      }),
      makeCtx(SNAP_ID),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.snapshot.id).toBe(SNAP_ID);
  });
});

describe("DELETE /api/snapshots/[id]", () => {
  const mockFrom = vi.fn();

  const mockAdminInstance = {
    auth: { getUser: vi.fn() },
    from: mockFrom,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAdmin.mockReturnValue(mockAdminInstance as never);
    vi.spyOn(corsModule, "withCors").mockImplementation((r) => r as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setupAuth(role = "capataz") {
    mockAdminInstance.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    // from() returns chainable for both auth and delete queries
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: { role }, error: null });
    const mockDelete = vi.fn().mockReturnThis();

    mockFrom.mockImplementation(() => ({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
      delete: mockDelete,
    }));

    // The delete chain: delete().eq().eq() should resolve
    mockDelete.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
  }

  it("should return 401 when not authenticated", async () => {
    const res = await DELETE(
      new Request("http://localhost/api/snapshots/snap-123", { method: "DELETE" }),
      makeCtx(SNAP_ID),
    );
    expect(res.status).toBe(401);
  });

  it("should return 403 when user is not esMando", async () => {
    setupAuth("costalero");
    const res = await DELETE(
      new Request("http://localhost/api/snapshots/snap-123", {
        method: "DELETE",
        headers: { Authorization: "Bearer valid-token" },
      }),
      makeCtx(SNAP_ID),
    );
    expect(res.status).toBe(403);
  });

  it("should delete snapshot and return 200", async () => {
    setupAuth("capataz");

    const res = await DELETE(
      new Request("http://localhost/api/snapshots/snap-123", {
        method: "DELETE",
        headers: { Authorization: "Bearer valid-token" },
      }),
      makeCtx(SNAP_ID),
    );

    expect(res.status).toBe(200);
  });
});
