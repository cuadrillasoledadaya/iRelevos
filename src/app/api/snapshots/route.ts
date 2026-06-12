import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { withCors, handleCorsPreflight } from "@/lib/cors";
import { checkBodySize, jsonResponse } from "@/lib/apiHelpers";
import { isValidUUID } from "@/lib/validation";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const SNAPSHOTS_MAX_BODY_SIZE = 2 * 1024 * 1024; // 2 MB

const MANDO_ROLES = ["superadmin", "capataz", "auxiliar"];

/**
 * Validate auth and esMando permission.
 * Returns user object or a NextResponse error.
 */
async function authenticateMando(
  request: Request,
): Promise<{ id: string } | NextResponse> {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return jsonResponse({ error: "No autenticado." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    return jsonResponse({ error: "No autenticado." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profileError) {
    logger.error("[Snapshots API] 500: Error querying profiles", profileError.message);
    return jsonResponse({ error: "Error interno. Intentá más tarde." }, { status: 500 });
  }

  if (!profile || !MANDO_ROLES.includes(profile.role)) {
    return jsonResponse({ error: "No autorizado." }, { status: 403 });
  }

  return { id: userData.user.id };
}

/**
 * GET /api/snapshots
 * List all snapshots for the authenticated user, sorted by created_at DESC.
 */
export async function GET(request: Request) {
  const preflight = handleCorsPreflight(request);
  if (preflight) return preflight;

  const authResult = await authenticateMando(request);
  if (authResult instanceof NextResponse) {
    return withCors(authResult, request);
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("plan_snapshots")
    .select(
      "id, nombre, creado_en, snapshot, proyectos!inner(nombre), temporadas!inner(nombre)",
    )
    .eq("user_id", authResult.id)
    .order("creado_en", { ascending: false });

  if (error) {
    logger.error("[Snapshots API] GET error:", error.message);
    return withCors(
      jsonResponse({ error: "Error interno. Intentá más tarde." }, { status: 500 }),
      request,
    );
  }

  const snapshots = (data ?? []).map((row: Record<string, unknown>) => {
    const r = row as {
      id: string;
      nombre: string;
      creado_en: string;
      snapshot: {
        plan_summary: unknown;
        trabajadera_count: number;
      };
      proyectos: { nombre: string };
      temporadas: { nombre: string };
    };
    return {
      id: r.id,
      nombre: r.nombre,
      created_at: r.creado_en,
      trabajadera_count: r.snapshot?.trabajadera_count ?? 0,
      plan_summary: r.snapshot?.plan_summary ?? {
        status: "incomplete",
        salidas_por_trab: [],
        tramos_por_trab: [],
      },
      proyecto_nombre: r.proyectos?.nombre,
      temporada_nombre: r.temporadas?.nombre,
    };
  });

  return withCors(jsonResponse({ snapshots }), request);
}

/**
 * POST /api/snapshots
 * Create a new plan snapshot. user_id is derived server-side.
 */
export async function POST(request: Request) {
  const preflight = handleCorsPreflight(request);
  if (preflight) return preflight;

  const sizeCheck = checkBodySize(request, SNAPSHOTS_MAX_BODY_SIZE);
  if (sizeCheck) {
    return withCors(sizeCheck, request);
  }

  const authResult = await authenticateMando(request);
  if (authResult instanceof NextResponse) {
    return withCors(authResult, request);
  }

  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.proyecto_id !== "string" ||
    typeof body.temporada_id !== "string" ||
    typeof body.nombre !== "string" ||
    !body.snapshot ||
    typeof body.snapshot !== "object"
  ) {
    return withCors(
      jsonResponse({ error: "Datos inválidos." }, { status: 400 }),
      request,
    );
  }

  if (!isValidUUID(body.proyecto_id) || !isValidUUID(body.temporada_id)) {
    return withCors(
      jsonResponse({ error: "Datos inválidos." }, { status: 400 }),
      request,
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("plan_snapshots")
    .insert({
      proyecto_id: body.proyecto_id.trim(),
      temporada_id: body.temporada_id.trim(),
      user_id: authResult.id,
      nombre: body.nombre.trim(),
      descripcion: body.descripcion ?? null,
      snapshot: body.snapshot,
      creado_por: authResult.id,
    })
    .select("id, nombre, creado_en, snapshot")
    .single();

  if (error) {
    logger.error("[Snapshots API] POST insert error:", error.message);
    return withCors(
      jsonResponse({ error: "Error interno. Intentá más tarde." }, { status: 500 }),
      request,
    );
  }

  return withCors(jsonResponse({ snapshot: data }, { status: 201 }), request);
}
