import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapPuestoToRolCode } from "@/lib/roles";
import type { RolCode } from "@/lib/types";
import { rateLimit } from "@/lib/rateLimit";
import { withCors, handleCorsPreflight } from "@/lib/cors";
import { checkBodySize, jsonResponse } from "@/lib/apiHelpers";
import { isValidUUID } from "@/lib/validation";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const IMPORT_RATE_LIMIT = { limit: 5, windowMs: 60_000 }; // 5 per minute
const IMPORT_MAX_BODY_SIZE = 5 * 1024 * 1024; // 5 MB

interface ICuadrillaRaw {
	id?: string | number;
	nombre?: string;
	first_name?: string;
	name?: string;
	apellidos?: string;
	last_name?: string;
	surname?: string;
	apodo?: string;
	nickname?: string;
	email?: string;
	correo?: string;
	mail?: string;
	trabajadera?: number;
	fila?: number;
	altura?: number;
	estado?: string;
	puesto?: string;
	rol?: string;
	role?: string;
	posicion?: string;
	puesto_secundario?: string;
	puntuacion_total?: number;
	puntuacion?: number;
	score?: number;
}

interface NormalizedCostalero {
	external_id: string;
	nombre: string;
	apellidos: string;
	apodo: string;
	email: string | null;
	trabajadera: number | null;
	rol: RolCode;
	rol_sec: RolCode;
	puntuacion: number;
	source: string;
}

/**
 * Valida autenticación y autorización de admin.
 * Retorna el objeto user si es válido, o un NextResponse de error.
 */
async function authenticateAdmin(
	request: Request,
): Promise<{ id: string } | NextResponse> {
	const authHeader = request.headers.get("Authorization");
	const token = authHeader?.replace("Bearer ", "");

	if (!token) {
		logger.error("[Import API] 401: No token in Authorization header");
		return NextResponse.json(
			{ error: "No autenticado." },
			{ status: 401 },
		);
	}

	const admin = getSupabaseAdmin();
	const { data: userData, error: userError } = await admin.auth.getUser(token);
	if (userError || !userData.user) {
		logger.error("[Import API] 401: Invalid token", userError?.message);
		return NextResponse.json(
			{ error: "No autenticado." },
			{ status: 401 },
		);
	}

	const { data: requesterProfile, error: profileError } = await admin
		.from("profiles")
		.select("role")
		.eq("id", userData.user.id)
		.single();

	if (profileError) {
		logger.error(
			"[Import API] 500: Error querying profiles",
			profileError.message,
		);
		return NextResponse.json(
			{ error: "Error interno. Intentá más tarde." },
			{ status: 500 },
		);
	}

	const rol = requesterProfile?.role;
	if (rol !== "superadmin" && rol !== "capataz" && rol !== "auxiliar") {
		logger.warn("[Import API] 403: Insufficient role:", rol);
		return NextResponse.json(
			{ error: "No autorizado." },
			{ status: 403 },
		);
	}

	return { id: userData.user.id };
}

/**
 * Fetch + normalización de costaleros desde iCuadrilla.
 * Retorna el array normalizado.
 */
async function fetchICuadrillaCostaleros(): Promise<NormalizedCostalero[]> {
	const apiUrl = process.env.ICUADRILLA_API_URL;
	const apiToken = process.env.ICUADRILLA_API_TOKEN;

	if (!apiUrl || !apiToken) {
		logger.error("[Import API] 500: Missing environment variables");
		throw new Error("Error interno. Intentá más tarde.");
	}

	logger.log("[Import API] Fetching iCuadrilla:", apiUrl);
	const res = await fetch(`${apiUrl}?select=*`, {
		headers: {
			apikey: apiToken,
			Authorization: `Bearer ${apiToken}`,
			"Content-Type": "application/json",
		},
		cache: "no-store",
	});
	logger.log("[Import API] iCuadrilla responded status:", res.status);

	if (!res.ok) {
		const errorText = await res.text();
		logger.error(
			"[Import API] iCuadrilla error:",
			res.status,
			errorText.substring(0, 200),
		);
		throw new Error("Error al obtener datos externos.");
	}

	const data = await res.json();
	const raw: ICuadrillaRaw[] = Array.isArray(data) ? data : [data];

	const activos = raw.filter((u) => u.estado !== "baja");
	const filtrados = raw.length - activos.length;

	logger.log(
		`[Import API] Received ${raw.length} records — active: ${activos.length}, filtered (baja): ${filtrados}`,
	);

	return activos.map((u: ICuadrillaRaw) => {
		const cleanNombre = (
			u.nombre ||
			u.first_name ||
			u.name ||
			"Sin Nombre"
		).trim();
		const cleanApellidos = (
			u.apellidos ||
			u.last_name ||
			u.surname ||
			""
		).trim();
		const rawEmail = (u.email || u.correo || u.mail || "").toLowerCase().trim();
		const email = rawEmail === "" ? null : rawEmail;

		const puesto = u.puesto || u.rol || u.role || u.posicion || null;
		const rolCostalero = mapPuestoToRolCode(puesto);

		const puestoSec = u.puesto_secundario || null;
		const rolSecCostalero = mapPuestoToRolCode(puestoSec);

		const rawPuntuacion =
			u.puntuacion_total ?? u.puntuacion ?? u.score ?? 0;
		const puntuacion =
			typeof rawPuntuacion === "string"
				? parseFloat(rawPuntuacion) || 0
				: Number(rawPuntuacion);

		return {
			external_id: String(u.id),
			nombre: cleanNombre,
			apellidos: cleanApellidos,
			apodo: (u.apodo || u.nickname || "").trim(),
			email: email,
			trabajadera: u.trabajadera || u.fila || u.altura || null,
			rol: rolCostalero,
			rol_sec: rolSecCostalero,
			puntuacion: Number(puntuacion),
			source: "icuadrilla",
		};
	});
}

/**
 * GET /api/import-costaleros
 *
 * Obtiene costaleros desde la API externa de iCuadrilla.
 * Requiere autenticación y rol de admin (superadmin/capataz/auxiliar).
 */
export async function GET(request: Request) {
	// Handle CORS preflight
	const preflight = handleCorsPreflight(request);
	if (preflight) return preflight;

	const startTime = Date.now();
	const route = "/api/import-costaleros";

	// Rate limit
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const rateResult = rateLimit(ip, IMPORT_RATE_LIMIT);
	if (!rateResult.success) {
		logger.warn(`${route} 429: rate limit exceeded for ${ip}`);
		return withCors(
			jsonResponse(
				{ error: "Demasiados intentos. Intentá de nuevo." },
				{ status: 429 },
			),
			request,
		);
	}

	try {
		const authResult = await authenticateAdmin(request);
		if (authResult instanceof NextResponse) {
			return withCors(authResult, request);
		}

		const normalized = await fetchICuadrillaCostaleros();

		const duration = Date.now() - startTime;
		logger.log(
			`${route} 200: import fetched`,
			JSON.stringify({
				timestamp: new Date().toISOString(),
				route,
				method: "GET",
				user_id: authResult.id,
				action: "import-costaleros-get",
				outcome: "success",
				duration_ms: duration,
			}),
		);

		return withCors(jsonResponse(normalized), request);
	} catch (err) {
		const duration = Date.now() - startTime;
		logger.error(
			`${route} 500: unexpected error`,
			err instanceof Error ? err.message : "unknown",
			JSON.stringify({
				timestamp: new Date().toISOString(),
				route,
				method: "GET",
				action: "import-costaleros-get",
				outcome: "error",
				duration_ms: duration,
			}),
		);
		const detail = err instanceof Error ? err.message : "Error desconocido";
		return withCors(
			jsonResponse(
				{ error: `Error inesperado: ${detail}` },
				{ status: 500 },
			),
			request,
		);
	}
}

/**
 * POST /api/import-costaleros
 *
 * Sincronización completa (full sync) transaccional:
 * 1. Obtiene costaleros desde iCuadrilla.
 * 2. Borra TODOS los costaleros existentes del proyecto indicado.
 * 3. Inserta la lista completa recibida como registros nuevos.
 *
 * Body: { proyecto_id: string }
 */
export async function POST(request: Request) {
	// Handle CORS preflight
	const preflight = handleCorsPreflight(request);
	if (preflight) return preflight;

	const startTime = Date.now();
	const route = "/api/import-costaleros";

	// Body size check (5MB for import)
	const sizeCheck = checkBodySize(request, IMPORT_MAX_BODY_SIZE);
	if (sizeCheck) {
		logger.error(`${route} 413: body too large`);
		return withCors(sizeCheck, request);
	}

	// Rate limit
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const rateResult = rateLimit(ip, IMPORT_RATE_LIMIT);
	if (!rateResult.success) {
		logger.warn(`${route} 429: rate limit exceeded for ${ip}`);
		return withCors(
			jsonResponse(
				{ error: "Demasiados intentos. Intentá de nuevo." },
				{ status: 429 },
			),
			request,
		);
	}

	try {
		const authResult = await authenticateAdmin(request);
		if (authResult instanceof NextResponse) {
			return withCors(authResult, request);
		}

		const body = await request.json().catch(() => null);
		if (
			!body ||
			typeof body.proyecto_id !== "string" ||
			body.proyecto_id.trim() === ""
		) {
			return withCors(
				jsonResponse({ error: "Datos inválidos." }, { status: 400 }),
				request,
			);
		}

		const proyectoId = body.proyecto_id.trim();

		// UUID validation on proyecto_id
		if (!isValidUUID(proyectoId)) {
			logger.warn(`${route} 400: invalid proyecto_id UUID format`);
			return withCors(
				jsonResponse({ error: "Datos inválidos." }, { status: 400 }),
				request,
			);
		}

		logger.log(`${route}: Starting full sync for project`, proyectoId);

		const normalized = await fetchICuadrillaCostaleros();

		const admin = getSupabaseAdmin();
		const { data, error } = await admin.rpc("full_sync_icuadrilla_census", {
			p_proyecto_id: proyectoId,
			p_records: normalized,
		});

		if (error) {
			logger.error(
				`${route} 500: RPC full_sync_icuadrilla_census failed`,
				error.message,
			);
			return withCors(
				jsonResponse(
					{
						error: `Error al sincronizar el censo: ${error.message}`,
					},
					{ status: 500 },
				),
				request,
			);
		}

		const duration = Date.now() - startTime;
		logger.log(
			`${route} 200: full sync completed`,
			JSON.stringify({
				timestamp: new Date().toISOString(),
				route,
				method: "POST",
				user_id: authResult.id,
				action: "import-costaleros-post",
				outcome: "success",
				duration_ms: duration,
			}),
		);

		return withCors(jsonResponse(data), request);
	} catch (err) {
		const duration = Date.now() - startTime;
		logger.error(
			`${route} 500: unexpected error in POST`,
			err instanceof Error ? err.message : "unknown",
			JSON.stringify({
				timestamp: new Date().toISOString(),
				route,
				method: "POST",
				action: "import-costaleros-post",
				outcome: "error",
				duration_ms: duration,
			}),
		);
		const detail = err instanceof Error ? err.message : "Error desconocido";
		return withCors(
			jsonResponse(
				{ error: `Error inesperado: ${detail}` },
				{ status: 500 },
			),
			request,
		);
	}
}
