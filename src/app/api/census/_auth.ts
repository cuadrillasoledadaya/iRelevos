import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { handleCorsPreflight } from "@/lib/cors";
import { jsonResponse } from "@/lib/apiHelpers";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const MANDO_ROLES = ["superadmin", "capataz", "auxiliar"];

/**
 * Autenticación + autorización de mando (superadmin/capataz/auxiliar).
 * Devuelve `{ id }` si OK, o un NextResponse de error.
 *
 * Vive aparte para que todas las rutas del censo compartan la misma
 * lógica (antes estaba duplicada dentro de /apodo).
 */
export async function authenticateMando(
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
		logger.error(
			"[Census API] 500: Error querying profiles",
			profileError.message,
		);
		return jsonResponse(
			{ error: "Error interno. Intentá más tarde." },
			{ status: 500 },
		);
	}

	if (!profile || !MANDO_ROLES.includes(profile.role)) {
		return jsonResponse({ error: "No autorizado." }, { status: 403 });
	}

	return { id: userData.user.id };
}

export { MANDO_ROLES, handleCorsPreflight };
