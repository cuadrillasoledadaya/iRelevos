// ══════════════════════════════════════════════════════════════════
// ADMIN SERVICE — Pure Supabase/data operations (no React, no UI)
// ══════════════════════════════════════════════════════════════════

import { supabase } from "@/lib/supabase";
import type { Trabajadera, RolCode } from "@/lib/types";
import type { UserRole } from "@/hooks/useAuth";
import { defaultRoles } from "@/lib/roles";
import type {
	CensusEntry,
	ImportEntry,
	NewCensusEntry,
	NewPasoForm,
	NewTempForm,
	CensusEditForm,
} from "@/components/admin/types";

// ── Result types ────────────────────────────────────────────────────

export interface ServiceResult<T = void> {
	data?: T;
	error?: string;
}

// ════════════════════════════════════════════════════════════════════
// USUARIOS
// ════════════════════════════════════════════════════════════════════

export async function deleteUser(
	uid: string,
	accessToken: string,
): Promise<ServiceResult> {
	const res = await fetch("/api/admin/delete-user", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${accessToken}`,
		},
		body: JSON.stringify({ uid }),
	});

	if (!res.ok) {
		const data = (await res.json()) as { error?: string };
		return { error: data.error ?? "desconocido" };
	}
	return {};
}

export async function updateUserRole(
	uid: string,
	nuevoRol: UserRole,
): Promise<ServiceResult> {
	const { error } = await supabase
		.from("profiles")
		.update({ role: nuevoRol })
		.eq("id", uid);

	return error ? { error: error.message } : {};
}

export async function updateUserProfile(
	uid: string,
	fields: { nombre: string; apellidos: string; apodo: string },
): Promise<ServiceResult> {
	const { error } = await supabase
		.from("profiles")
		.update(fields)
		.eq("id", uid);

	return error ? { error: error.message } : {};
}

// ════════════════════════════════════════════════════════════════════
// PASOS
// ════════════════════════════════════════════════════════════════════

export async function createPaso(
	form: NewPasoForm,
	activeTemporadaId: string,
	userId: string | null,
): Promise<ServiceResult> {
	const { error } = await supabase.from("proyectos").insert([
		{
			...form,
			content: {
				banco: [],
				trabajaderas: Array.from({ length: form.num_trabajaderas }, (_, i) => ({
					id: i + 1,
					nombres: [],
					roles: [],
					salidas: 1,
					tramos: ["Inicio", "Final"],
					bajas: [],
					regla5costaleros: false,
					plan: null,
					obj: {},
					analisis: null,
					pinned: null,
					puntuaciones: {},
					tramosClaves: [],
				})),
			},
			temporada_id: activeTemporadaId,
			user_id: userId,
		},
	]);

	return error ? { error: error.message } : {};
}

export async function deletePaso(
	id: string,
): Promise<ServiceResult<{ user_id: string | null }>> {
	const { data: proyecto, error: fetchErr } = await supabase
		.from("proyectos")
		.select("user_id")
		.eq("id", id)
		.single();

	if (fetchErr || !proyecto) {
		return { error: fetchErr?.message ?? "Proyecto no encontrado" };
	}

	const { error } = await supabase.from("proyectos").delete().eq("id", id);
	if (error) return { error: error.message };

	return { data: { user_id: proyecto.user_id } };
}

// ════════════════════════════════════════════════════════════════════
// CENSO
// ════════════════════════════════════════════════════════════════════

export async function syncCostaleroToProject(
	proyectoId: string,
	trabajaderaId: number,
	displayName: string,
	currentUserId: string | null,
): Promise<ServiceResult> {
	const { data: proj, error: fetchErr } = await supabase
		.from("proyectos")
		.select("content, user_id")
		.eq("id", proyectoId)
		.single();

	if (fetchErr || !proj) {
		return { error: fetchErr?.message ?? "Proyecto no encontrado" };
	}

	if (proj.user_id && proj.user_id !== currentUserId) {
		return { error: "No tenes permiso para modificar este proyecto." };
	}

	const content = proj.content as {
		trabajaderas: {
			id: number;
			nombres: string[];
			roles?: { pri: string; sec: string }[];
		}[];
	};
	const trab = content.trabajaderas.find((t) => t.id === trabajaderaId);
	if (!trab) {
		return { error: `No existe trabajadera ${trabajaderaId} en el proyecto` };
	}

	const slotIdx = trab.nombres.findIndex((n) => /^Costalero \d+$/.test(n));
	if (slotIdx === -1) {
		trab.nombres.push(displayName);
		if (trab.roles) trab.roles.push({ pri: "COR", sec: "FIJ_I" });
	} else {
		trab.nombres[slotIdx] = displayName;
	}

	const updatePayload: Record<string, unknown> = { content };
	if (!proj.user_id) updatePayload.user_id = currentUserId;

	const { error: updateErr } = await supabase
		.from("proyectos")
		.update(updatePayload)
		.eq("id", proyectoId);

	return updateErr ? { error: updateErr.message } : {};
}

export async function addToCensus(
	entry: NewCensusEntry,
	activeTemporadaId: string,
): Promise<ServiceResult<CensusEntry>> {
	const trabajaderaNum = entry.trabajadera
		? parseInt(entry.trabajadera)
		: null;
	const alturaNum = entry.altura ? parseFloat(entry.altura) : null;

	const payload = {
		...entry,
		trabajadera: trabajaderaNum || null,
		altura: alturaNum || null,
		temporada_id: activeTemporadaId,
	};

	const { data, error } = await supabase
		.from("census")
		.insert([payload])
		.select();

	if (error) return { error: error.message };
	if (!data || data.length === 0) return { error: "Error al añadir al censo" };

	return { data: data[0] as CensusEntry };
}

export async function deleteFromCensus(id: string): Promise<ServiceResult> {
	const { error } = await supabase.from("census").delete().eq("id", id);
	return error ? { error: error.message } : {};
}

export async function saveCensusEdit(
	id: string,
	editForm: CensusEditForm,
): Promise<ServiceResult> {
	const { error } = await supabase
		.from("census")
		.update({
			...editForm,
			trabajadera: editForm.trabajadera
				? parseInt(String(editForm.trabajadera))
				: null,
			altura: editForm.altura ? parseFloat(String(editForm.altura)) : null,
		})
		.eq("id", id);

	return error ? { error: error.message } : {};
}

export async function rebuildCensusComplete(
	activeTemporadaId: string,
): Promise<ServiceResult<{ totalNuevos: number }>> {
	const { data: projects } = await supabase
		.from("proyectos")
		.select("*")
		.eq("temporada_id", activeTemporadaId);

	if (!projects || projects.length === 0) {
		return { error: "No hay proyectos en esta temporada." };
	}

	let totalNuevos = 0;

	for (const p of projects) {
		const { data: existing } = await supabase
			.from("census")
			.select("nombre, apellidos, apodo")
			.eq("proyecto_id", p.id);
		const existingNames = new Set(
			(existing || []).map((c) =>
				(c.apodo || `${c.nombre} ${c.apellidos}`).trim().toLowerCase(),
			),
		);

		const content = p.content as {
			trabajaderas: { id: number; nombres: string[] }[];
		};
		const toInsert: Partial<CensusEntry>[] = [];

		content.trabajaderas.forEach((t) => {
			t.nombres.forEach((n) => {
				const name = n.trim();
				if (!name || name.startsWith("Costalero ")) return;
				if (!existingNames.has(name.toLowerCase())) {
					toInsert.push({
						temporada_id: activeTemporadaId,
						proyecto_id: p.id,
						nombre: name,
						apellidos: "",
						apodo: name,
						trabajadera: t.id,
					});
					existingNames.add(name.toLowerCase());
				}
			});
		});

		if (toInsert.length > 0) {
			const { error } = await supabase.from("census").insert(toInsert);
			if (error) return { error: error.message };
			totalNuevos += toInsert.length;
		}
	}

	return { data: { totalNuevos } };
}

// Role mapping helpers for syncTodoCenso
const rolesValidos = ["PAT_D", "PAT_I", "COS_D", "COS_I", "FIJ_D", "FIJ_I", "COR"];

function mapRol(
	rol: string | null | undefined,
	_esPrimero: boolean,
	fallback: RolCode,
): RolCode {
	// Validate and preserve the actual role from iCuadrilla.
	// Do NOT filter by position type — the census stores what the person IS,
	// not what position they fit in. Position compatibility is handled
	// later during role assignment (asignarRolesTramo).
	if (!rol || !rolesValidos.includes(rol)) return fallback;
	return rol as RolCode;
}

export async function syncTodoCenso(
	proyectoId: string,
): Promise<ServiceResult<{ content: unknown }>> {
	const { data: censusData } = await supabase
		.from("census")
		.select("nombre, apellidos, apodo, trabajadera, rol, rol_sec, puntuacion, boquilla")
		.eq("proyecto_id", proyectoId)
		.not("trabajadera", "is", null)
		.order("trabajadera", { ascending: true });

	if (!censusData || censusData.length === 0) {
		return { error: "No hay costaleros con trabajadera asignada en el censo." };
	}

	const { data: proj, error } = await supabase
		.from("proyectos")
		.select("content")
		.eq("id", proyectoId)
		.single();

	if (error || !proj) {
		return { error: error?.message ?? "Proyecto no encontrado" };
	}

	const content = proj.content as {
		trabajaderas: {
			id: number;
			nombres: string[];
			roles?: { pri: string; sec: string }[];
			puntuaciones?: Record<string, number>;
			boquilla?: Record<string, boolean>;
		}[];
	};

	// Reset nombres to placeholders AND roles to defaults (clean slate)
	content.trabajaderas.forEach((t) => {
		const n = Math.max(t.nombres.length, 6);
		t.nombres = Array(n)
			.fill("")
			.map((_, i) => `Costalero ${i + 1}`);
		// Reset roles to defaults for this trabajadera — prevents stale role contamination
		t.roles = defaultRoles(n, t.id);
		// Reset puntuaciones and boquilla
		t.puntuaciones = {};
		t.boquilla = {};
	});

	// Group by trabajadera
	const byTrab: Record<
		number,
		{ name: string; rol?: string | null; rol_sec?: string | null; puntuacion?: number; boquilla?: boolean }[]
	> = {};
	censusData.forEach((c) => {
		const tid = c.trabajadera as number;
		const name = c.apodo?.trim() || `${c.nombre} ${c.apellidos}`.trim();
		if (!byTrab[tid]) byTrab[tid] = [];
		byTrab[tid].push({ name, rol: c.rol, rol_sec: c.rol_sec, puntuacion: c.puntuacion ?? 0, boquilla: c.boquilla ?? false });
	});

	Object.entries(byTrab).forEach(([tidStr, entries]) => {
		const tid = parseInt(tidStr);
		const trab = content.trabajaderas.find((t) => t.id === tid);
		if (!trab) return;

		const esPrimero = tid === 1 || tid === 7;

		entries.forEach((entry, i) => {
			const rolCompatible = mapRol(entry.rol, esPrimero, "COR");
			const secCompatible = mapRol(entry.rol_sec, esPrimero, "FIJ_I");

			if (i < trab.nombres.length) {
				trab.nombres[i] = entry.name;
				trab.roles![i] = { pri: rolCompatible, sec: secCompatible };
			} else {
				trab.nombres.push(entry.name);
				trab.roles!.push({ pri: rolCompatible, sec: secCompatible });
			}

			// Store puntuacion keyed by name
			if (entry.puntuacion && entry.puntuacion > 0) {
				trab.puntuaciones![entry.name] = entry.puntuacion;
			}

			// Store boquilla keyed by name
			if (entry.boquilla) {
				trab.boquilla![entry.name] = true;
			}
		});
	});

	const { error: updateErr } = await supabase
		.from("proyectos")
		.update({ content })
		.eq("id", proyectoId);

	if (updateErr) {
		return { error: updateErr.message };
	}

	// Read back fresh content
	const { data: updatedProj } = await supabase
		.from("proyectos")
		.select("content")
		.eq("id", proyectoId)
		.single();

	return { data: { content: updatedProj?.content } };
}

export async function syncProjectToCensus(
	proyectoId: string,
	activeTemporadaId: string,
): Promise<ServiceResult<{ inserted: number }>> {
	const { data: proj } = await supabase
		.from("proyectos")
		.select("content")
		.eq("id", proyectoId)
		.single();

	if (!proj) {
		return { error: "Proyecto no encontrado" };
	}

	const { data: existingCensus } = await supabase
		.from("census")
		.select("nombre, apellidos, apodo")
		.eq("proyecto_id", proyectoId);

	const existingNames = new Set(
		(existingCensus || []).map((c) =>
			(c.apodo || `${c.nombre} ${c.apellidos}`).trim().toLowerCase(),
		),
	);

	const content = proj.content as {
		trabajaderas: { id: number; nombres: string[] }[];
	};
	const newEntries: Record<string, unknown>[] = [];

	content.trabajaderas.forEach((t) => {
		t.nombres.forEach((n) => {
			const name = n.trim();
			if (!name || name.startsWith("Costalero ")) return;

			if (!existingNames.has(name.toLowerCase())) {
				newEntries.push({
					temporada_id: activeTemporadaId,
					proyecto_id: proyectoId,
					nombre: name,
					apellidos: "",
					apodo: name,
					trabajadera: t.id,
				});
				existingNames.add(name.toLowerCase());
			}
		});
	});

	if (newEntries.length === 0) {
		return { data: { inserted: 0 } };
	}

	const { error } = await supabase.from("census").insert(newEntries);
	if (error) return { error: error.message };

	return { data: { inserted: newEntries.length } };
}

// ════════════════════════════════════════════════════════════════════
// IMPORTACIÓN ICUADRILLA
// ════════════════════════════════════════════════════════════════════

export async function fetchICuadrillaData(
	accessToken: string,
): Promise<ServiceResult<ImportEntry[]>> {
	const res = await fetch("/api/import-costaleros", {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!res.ok) {
		const errorText = await res.text();
		return { error: errorText || `Error ${res.status} al obtener datos` };
	}

	const data = await res.json();
	return { data: data as ImportEntry[] };
}

export async function executeImport(
	proyectoId: string,
	accessToken: string,
): Promise<ServiceResult<{ deleted?: number; inserted?: number }>> {
	const res = await fetch("/api/import-costaleros", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${accessToken}`,
		},
		body: JSON.stringify({ proyecto_id: proyectoId }),
	});

	if (!res.ok) {
		const errorData = await res.json().catch(() => ({}));
		return { error: errorData.error || `Error ${res.status}` };
	}

	const result = await res.json();
	return { data: result as { deleted?: number; inserted?: number } };
}

export async function fullSyncCheck(
	proyectoId: string,
	accessToken: string,
): Promise<
	ServiceResult<{
		aBorrar: { id: string; external_id: string; nombre: string; apellidos: string }[];
	}>
> {
	const res = await fetch("/api/import-costaleros", {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!res.ok) {
		const errorText = await res.text();
		return { error: errorText || `Error ${res.status} al sincronizar` };
	}

	const remoteData: ImportEntry[] = await res.json();
	const remoteIds = new Set(remoteData.map((r) => r.external_id));

	const { data: localData } = await supabase
		.from("census")
		.select("id, external_id, nombre, apellidos")
		.eq("proyecto_id", proyectoId)
		.eq("source", "icuadrilla")
		.not("external_id", "is", null);

	if (!localData) return { data: { aBorrar: [] } };

	const aBorrar = localData.filter((l) => !remoteIds.has(l.external_id));
	return { data: { aBorrar: aBorrar as { id: string; external_id: string; nombre: string; apellidos: string }[] } };
}

export async function deleteCensusEntry(id: string): Promise<ServiceResult> {
	const { error } = await supabase.from("census").delete().eq("id", id);
	return error ? { error: error.message } : {};
}

export async function toggleCensusBoquilla(
	id: string,
	value: boolean,
): Promise<ServiceResult> {
	const { error } = await supabase
		.from("census")
		.update({ boquilla: value })
		.eq("id", id);
	return error ? { error: error.message } : {};
}

// ════════════════════════════════════════════════════════════════════
// TEMPORADAS
// ════════════════════════════════════════════════════════════════════

export async function deleteTemporada(
	id: string,
): Promise<ServiceResult> {
	// Delete census by proyecto_id
	const { data: projects } = await supabase
		.from("proyectos")
		.select("id")
		.eq("temporada_id", id);

	if (projects && projects.length > 0) {
		const projectIds = projects.map((p) => p.id);
		await supabase.from("census").delete().in("proyecto_id", projectIds);
	}

	// Delete census by temporada_id
	await supabase.from("census").delete().eq("temporada_id", id);

	// Delete proyectos
	const { error: pErr } = await supabase
		.from("proyectos")
		.delete()
		.eq("temporada_id", id);

	if (pErr) return { error: pErr.message };

	// Delete temporada
	const { data, error } = await supabase
		.from("temporadas")
		.delete()
		.eq("id", id)
		.select();

	if (error) return { error: error.message };
	if (!data || data.length === 0) {
		return {
			error: "No se pudo borrar la fila de la temporada. Verificá si tenés permisos de borrado (RLS) en Supabase.",
		};
	}

	return {};
}

export async function createTemporada(
	form: NewTempForm,
): Promise<ServiceResult> {
	const { data: nTemp, error: tErr } = await supabase
		.from("temporadas")
		.insert([{ nombre: form.nombre, activa: false }])
		.select()
		.single();

	if (tErr || !nTemp) {
		return { error: "Error al crear temporada" };
	}

	const newId = nTemp.id;
	const projectIdMap: Record<string, string> = {};

	if (form.sourceTempId) {
		if (form.clonarPasos) {
			const { data: oldP } = await supabase
				.from("proyectos")
				.select("*")
				.eq("temporada_id", form.sourceTempId);

			if (oldP && oldP.length > 0) {
				for (const p of oldP) {
					const oldPid = p.id;
					const rest: Record<string, unknown> = { ...p };
					delete rest.id;
					delete rest.created_at;
					const cleanContent = JSON.parse(JSON.stringify(rest.content));

					cleanContent.trabajaderas.forEach((t: Trabajadera) => {
						if (!form.clonarCenso) t.nombres = [];
						t.plan = null;
						t.obj = {};
						t.analisis = null;
						t.pinned = null;
						t.bajas = [];
					});

					const { data: nP, error: pErr } = await supabase
						.from("proyectos")
						.insert([{ ...rest, content: cleanContent, temporada_id: newId }])
						.select()
						.single();

					if (pErr) return { error: pErr.message };
					if (nP) {
						projectIdMap[oldPid] = nP.id;
					}
				}
			}
		}

		if (form.clonarCenso) {
			const { data: oldC, error: cFetchErr } = await supabase
				.from("census")
				.select("*")
				.eq("temporada_id", form.sourceTempId);

			if (cFetchErr) return { error: "Error al leer el censo de la temporada origen" };

			if (oldC && oldC.length > 0) {
				const newC = oldC.map((c) => {
					const rest: Record<string, unknown> = { ...c };
					delete rest.id;
					delete rest.created_at;
					return {
						...rest,
						temporada_id: newId,
						proyecto_id: projectIdMap[c.proyecto_id] || null,
					};
				});
				const { error: cInsErr } = await supabase.from("census").insert(newC);
				if (cInsErr) return { error: cInsErr.message };
			}
		}
	}

	return {};
}
