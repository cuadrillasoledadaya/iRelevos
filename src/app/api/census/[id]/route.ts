import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { jsonResponse } from "@/lib/apiHelpers";
import { logger } from "@/lib/logger";
import { isValidUUID } from "@/lib/validation";
import { authenticateMando, handleCorsPreflight } from "../_auth";

export const dynamic = "force-dynamic";

interface CensusEditBody {
	nombre?: string | null;
	apellidos?: string | null;
	email?: string | null;
	apodo?: string | null;
	telefono?: string | null;
	trabajadera?: number | null;
	altura?: number | null;
}

function texto(v: unknown): string | null {
	if (v === undefined || v === null) return null;
	const s = String(v).trim();
	return s === "" ? null : s;
}

function numero(v: unknown): number | null {
	if (v === undefined || v === null || v === "") return null;
	const n = typeof v === "number" ? v : Number(v);
	return Number.isFinite(n) ? n : null;
}

/**
 * PATCH /api/census/[id]
 * Edita una entrada del censo (nombre, apellidos, apodo, contacto…).
 *
 * Se hace con el service role para no depender de las políticas RLS:
 * el censo importado desde iCuadrilla tiene `temporada_id = NULL` y
 * algunas políticas lo dejaban fuera del alcance del cliente.
 */
export async function PATCH(
	request: Request,
	{ params }: { params: { id: string } },
) {
	const preflight = handleCorsPreflight(request);
	if (preflight) return preflight;

	const authResult = await authenticateMando(request);
	if (authResult instanceof NextResponse) return authResult;

	if (!isValidUUID(params.id)) {
		return jsonResponse({ error: "Datos inválidos." }, { status: 400 });
	}

	try {
		const body = (await request.json()) as CensusEditBody;

		const patch: Record<string, unknown> = {};
		if (body.nombre !== undefined) patch.nombre = texto(body.nombre);
		if (body.apellidos !== undefined) patch.apellidos = texto(body.apellidos);
		if (body.email !== undefined) patch.email = texto(body.email);
		if (body.apodo !== undefined) patch.apodo = texto(body.apodo);
		if (body.telefono !== undefined) patch.telefono = texto(body.telefono);
		if (body.trabajadera !== undefined) {
			const t = numero(body.trabajadera);
			patch.trabajadera = t === null ? null : Math.trunc(t);
		}
		if (body.altura !== undefined) patch.altura = numero(body.altura);

		if (Object.keys(patch).length === 0) {
			return jsonResponse({ error: "No hay nada que actualizar." }, { status: 400 });
		}

		const admin = getSupabaseAdmin();
		const { data, error } = await admin
			.from("census")
			.update(patch)
			.eq("id", params.id)
			.select("id, nombre, apellidos, apodo")
			.single();

		if (error) {
			logger.error("[Census API] Error updating entry", error.message);
			return jsonResponse({ error: "Error al actualizar la entrada" }, { status: 500 });
		}

		return jsonResponse({ ok: true, entry: data });
	} catch (err: unknown) {
		logger.error(
			"[Census API] Unexpected error",
			err instanceof Error ? err.message : "unknown",
		);
		return jsonResponse({ error: "Error inesperado" }, { status: 500 });
	}
}
