import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { jsonResponse } from "@/lib/apiHelpers";
import { logger } from "@/lib/logger";
import { authenticateMando, handleCorsPreflight } from "../../_auth";

export const dynamic = "force-dynamic";

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
