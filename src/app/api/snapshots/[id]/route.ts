import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { withCors, handleCorsPreflight } from "@/lib/cors";
import { jsonResponse } from "@/lib/apiHelpers";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

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
 * GET /api/snapshots/[id]
 * Get a single snapshot by ID.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const preflight = handleCorsPreflight(request);
  if (preflight) return preflight;

  const authResult = await authenticateMando(request);
  if (authResult instanceof NextResponse) {
    return withCors(authResult, request);
  }

  const { id } = await params;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("plan_snapshots")
    .select("*")
    .eq("id", id)
    .eq("user_id", authResult.id)
    .single();

  if (error || !data) {
    return withCors(
      jsonResponse({ error: "Instantánea no encontrada." }, { status: 404 }),
      request,
    );
  }

  return withCors(jsonResponse({ snapshot: data }), request);
}

/**
 * DELETE /api/snapshots/[id]
 * Delete a snapshot by ID.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const preflight = handleCorsPreflight(request);
  if (preflight) return preflight;

  const authResult = await authenticateMando(request);
  if (authResult instanceof NextResponse) {
    return withCors(authResult, request);
  }

  const { id } = await params;

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("plan_snapshots")
    .delete()
    .eq("id", id)
    .eq("user_id", authResult.id);

  if (error) {
    logger.error("[Snapshots API] DELETE error:", error.message);
    return withCors(
      jsonResponse({ error: "Error interno. Intentá más tarde." }, { status: 500 }),
      request,
    );
  }

  return withCors(jsonResponse({ ok: true }), request);
}
