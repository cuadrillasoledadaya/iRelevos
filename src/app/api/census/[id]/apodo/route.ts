import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { handleCorsPreflight } from "@/lib/cors";
import { jsonResponse } from "@/lib/apiHelpers";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const MANDO_ROLES = ["superadmin", "capataz", "auxiliar"];

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
    logger.error("[Census Apodo API] 500: Error querying profiles", profileError.message);
    return jsonResponse({ error: "Error interno. Intentá más tarde." }, { status: 500 });
  }

  if (!profile || !MANDO_ROLES.includes(profile.role)) {
    return jsonResponse({ error: "No autorizado." }, { status: 403 });
  }

  return { id: userData.user.id };
}

/**
 * PATCH /api/census/[id]/apodo
 * Actualiza el apodo de una entrada del censo.
 * Body: { apodo: string }
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const preflight = handleCorsPreflight(request);
  if (preflight) return preflight;

  const authResult = await authenticateMando(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { apodo } = await request.json();

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("census")
      .update({ apodo: apodo || null })
      .eq("id", params.id)
      .select("id, nombre, apellidos, apodo")
      .single();

    if (error) {
      logger.error("[Census Apodo API] Error updating apodo", error.message);
      return jsonResponse({ error: "Error al actualizar el apodo" }, { status: 500 });
    }

    return jsonResponse({ ok: true, apodo: data.apodo });
  } catch (err: unknown) {
    logger.error("[Census Apodo API] Unexpected error", err instanceof Error ? err.message : "unknown");
    return jsonResponse({ error: "Error inesperado" }, { status: 500 });
  }
}
