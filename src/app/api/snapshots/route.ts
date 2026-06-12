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
 * GET /api/snapshots?trabajadera_id=N
 * List snapshots for the authenticated user, optionally filtered by trabajadera_id.
 */
export async function GET(request: Request) {
  const preflight = handleCorsPreflight(request);
  if (preflight) return preflight;

  const authResult = await authenticateMando(request);
  if (authResult instanceof NextResponse) {
    return withCors(authResult, request);
  }

  const url = new URL(request.url);
  const trabajaderaIdParam = url.searchParams.get("trabajadera_id");
  const trabajaderaId = trabajaderaIdParam ? parseInt(trabajaderaIdParam, 10) : null;

  const admin = getSupabaseAdmin();
  let query = admin
    .from("plan_snapshots")
    .select(
      "id, nombre, creado_en, snapshot, proyectos!inner(nombre_paso), temporadas!inner(nombre)",
    )
    .eq("user_id", authResult.id);

  if (trabajaderaId !== null) {
    query = query.eq("trabajadera_id", trabajaderaId);
  }

  const { data, error } = await query.order("creado_en", { ascending: false });

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
        trabajadera_id: number;
      };
      proyectos: { nombre_paso: string };
      temporadas: { nombre: string };
    };
    return {
      id: r.id,
      nombre: r.nombre,
      created_at: r.creado_en,
      trabajadera_id: r.snapshot?.trabajadera_id ?? 1,
      plan_summary: r.snapshot?.plan_summary ?? {
        status: "incomplete",
        salidas: 0,
        tramos: 0,
      },
      proyecto_nombre: r.proyectos?.nombre_paso,
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
    typeof body.trabajadera_id !== "number" ||
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
      trabajadera_id: body.trabajadera_id,
      nombre: body.nombre.trim(),
      descripcion: body.descripcion ?? null,
      snapshot: body.snapshot,
      creado_por: authResult.id,
    })
    .select("id, nombre, creado_en, snapshot, trabajadera_id")
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
