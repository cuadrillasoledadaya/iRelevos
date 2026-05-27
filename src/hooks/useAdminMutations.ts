// ══════════════════════════════════════════════════════════════════
// USE ADMIN MUTATIONS — Hook de mutaciones para el panel de admin
// ══════════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/hooks/useAuth";
import type { PasoDB, Trabajadera } from "@/lib/types";
import type {
	CensusEntry,
	ImportEntry,
	NewCensusEntry,
	NewPasoForm,
	NewTempForm,
	CensusEditForm,
} from "@/components/admin/types";

export function useAdminMutations(
	activeTemporadaId: string,
	_pasos: PasoDB[],
	setCensus: React.Dispatch<React.SetStateAction<CensusEntry[]>>,
	setUsuarios: React.Dispatch<
		React.SetStateAction<import("@/hooks/useAuth").Profile[]>
	>,
	_setPasos: React.Dispatch<React.SetStateAction<PasoDB[]>>,
	fetchCensus: (filterPid?: string) => Promise<void>,
	fetchPasos: () => Promise<void>,
	onSyncComplete?: (proyectoId: string, updatedContent?: unknown) => void,
) {
	const [saving, setSaving] = useState(false);
	const [importLoading, setImportLoading] = useState(false);

	// ── Form states ──────────────────────────────────────────────────

	const [newEntry, setNewEntry] = useState<NewCensusEntry>({
		email: "",
		nombre: "",
		apellidos: "",
		apodo: "",
		telefono: "",
		trabajadera: "",
		altura: "",
		proyecto_id: "",
	});
	const [newPaso, setNewPaso] = useState<NewPasoForm>({
		nombre_paso: "",
		nombre_cuadrilla: "",
		num_trabajaderas: 6,
	});
	const [newTemp, setNewTemp] = useState<NewTempForm>({
		nombre: "",
		clonarCenso: true,
		clonarPasos: true,
		sourceTempId: "",
	});
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editForm, setEditForm] = useState<CensusEditForm>({
		email: "",
		nombre: "",
		apellidos: "",
		apodo: "",
		telefono: "",
		trabajadera: 0,
		altura: 0,
	});

	// ── Import state ─────────────────────────────────────────────────

	const [importPid, setImportPid] = useState("");
	const [importPreview, setImportPreview] = useState<ImportEntry[] | null>(
		null,
	);

	// ═════════════════════════════════════════════════════════════════
	// USUARIOS
	// ═════════════════════════════════════════════════════════════════

	const eliminarUsuario = useCallback(
		async (uid: string) => {
			if (
				!confirm(
					"¿Seguro que quieres eliminar este perfil activo? Perderá el acceso.",
				)
			)
				return;

			const {
				data: { session },
			} = await supabase.auth.getSession();
			if (!session) {
				alert("No estás autenticado");
				return;
			}

			const res = await fetch("/api/admin/delete-user", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session.access_token}`,
				},
				body: JSON.stringify({ uid }),
			});

			if (!res.ok) {
				const data = (await res.json()) as { error?: string };
				alert("Error al eliminar: " + (data.error ?? "desconocido"));
				return;
			}

			setUsuarios((prev) => prev.filter((u) => u.id !== uid));
		},
		[setUsuarios],
	);

	const cambiarRol = useCallback(
		async (uid: string, nuevoRol: UserRole) => {
			const { error } = await supabase
				.from("profiles")
				.update({ role: nuevoRol })
				.eq("id", uid);

			if (!error) {
				setUsuarios((prev) =>
					prev.map((u) => (u.id === uid ? { ...u, role: nuevoRol } : u)),
				);
			}
		},
		[setUsuarios],
	);

	const editarPerfil = useCallback(
		async (uid: string, usuarios: import("@/hooks/useAuth").Profile[]) => {
			const u = usuarios.find((x) => x.id === uid);
			if (!u) return;

			const nuevoNombre = prompt("Nuevo Nombre:", u.nombre || "");
			if (nuevoNombre === null) return;
			const nuevosApellidos = prompt("Apellidos:", u.apellidos || "");
			if (nuevosApellidos === null) return;
			const nuevoApodo = prompt("Apodo:", u.apodo || "");
			if (nuevoApodo === null) return;

			setSaving(true);
			const { error } = await supabase
				.from("profiles")
				.update({
					nombre: nuevoNombre.trim(),
					apellidos: nuevosApellidos.trim(),
					apodo: nuevoApodo.trim(),
				})
				.eq("id", uid);

			if (!error) {
				setUsuarios((prev) =>
					prev.map((x) =>
						x.id === uid
							? {
									...x,
									nombre: nuevoNombre.trim(),
									apellidos: nuevosApellidos.trim(),
									apodo: nuevoApodo.trim(),
								}
							: x,
					),
				);
			} else {
				alert(error.message);
			}
			setSaving(false);
		},
		[setUsuarios],
	);

	// ═════════════════════════════════════════════════════════════════
	// PASOS
	// ═════════════════════════════════════════════════════════════════

	const addPaso = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			if (!newPaso.nombre_paso || !activeTemporadaId) return;
			setSaving(true);

			const {
				data: { session },
			} = await supabase.auth.getSession();

			const { error } = await supabase.from("proyectos").insert([
				{
					...newPaso,
					content: {
						banco: [],
						trabajaderas: Array.from(
							{ length: newPaso.num_trabajaderas },
							(_, i) => ({
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
							}),
						),
					},
					temporada_id: activeTemporadaId,
					user_id: session?.user?.id ?? null,
				},
			]);

			if (!error) {
				setNewPaso({
					nombre_paso: "",
					nombre_cuadrilla: "",
					num_trabajaderas: 6,
				});
				fetchPasos();
			} else {
				alert(error.message);
			}
			setSaving(false);
		},
		[newPaso, activeTemporadaId, fetchPasos],
	);

	const eliminarPaso = useCallback(
		async (id: string) => {
			if (
				!confirm(
					"¿Seguro que quieres borrar este Paso? Se perderán todos sus relevos.",
				)
			)
				return;

			const {
				data: { session },
			} = await supabase.auth.getSession();
			const { data: proyecto } = await supabase
				.from("proyectos")
				.select("user_id")
				.eq("id", id)
				.single();

			if (proyecto?.user_id && proyecto.user_id !== session?.user?.id) {
				alert("No tenes permiso para borrar este paso.");
				return;
			}

			const { error } = await supabase.from("proyectos").delete().eq("id", id);
			if (!error) fetchPasos();
		},
		[fetchPasos],
	);

	// ═════════════════════════════════════════════════════════════════
	// CENSO - syncCostaleroToProject debe estar antes que addToCensus
	// ═════════════════════════════════════════════════════════════════

	const syncCostaleroToProject = useCallback(
		async (proyectoId: string, trabajaderaId: number, displayName: string) => {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			const { data: proj, error: fetchErr } = await supabase
				.from("proyectos")
				.select("content, user_id")
				.eq("id", proyectoId)
				.single();

			if (fetchErr || !proj) {
				// eslint-disable-next-line no-console
				console.error("syncCostalero: no se pudo leer el proyecto", fetchErr);
				return;
			}

			if (proj.user_id && proj.user_id !== session?.user?.id) {
				alert("No tenes permiso para modificar este proyecto.");
				return;
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
				// eslint-disable-next-line no-console
				console.error(
					`syncCostalero: no existe trabajadera ${trabajaderaId} en el proyecto`,
				);
				return;
			}

			const slotIdx = trab.nombres.findIndex((n) => /^Costalero \d+$/.test(n));
			if (slotIdx === -1) {
				trab.nombres.push(displayName);
				if (trab.roles) trab.roles.push({ pri: "COR", sec: "FIJ_I" });
			} else {
				trab.nombres[slotIdx] = displayName;
			}

			const updatePayload: Record<string, unknown> = { content };
			if (!proj.user_id) updatePayload.user_id = session?.user?.id;

			const { error: updateErr } = await supabase
				.from("proyectos")
				.update(updatePayload)
				.eq("id", proyectoId);

			if (updateErr) {
				// eslint-disable-next-line no-console
				console.error(
					"syncCostalero: error al actualizar el proyecto",
					updateErr,
				);
				alert(
					`⚠️ No se pudo actualizar la cuadrilla: ${updateErr.message}.\nUsá el botón "🔄 Sincronizar Cuadrilla" manualmente.`,
				);
			}
		},
		[],
	);

	const addToCensus = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			if (!newEntry.nombre) return;
			setSaving(true);

			const trabajaderaNum = newEntry.trabajadera
				? parseInt(newEntry.trabajadera)
				: null;
			const alturaNum = newEntry.altura ? parseFloat(newEntry.altura) : null;

			const payload = {
				...newEntry,
				trabajadera: trabajaderaNum || null,
				altura: alturaNum || null,
				temporada_id: activeTemporadaId,
			};

			const { data, error } = await supabase
				.from("census")
				.insert([payload])
				.select();

			if (!error && data) {
				setCensus((prev) => [data[0], ...prev]);
				setNewEntry({
					email: "",
					nombre: "",
					apellidos: "",
					apodo: "",
					telefono: "",
					trabajadera: "",
					altura: "",
					proyecto_id: newEntry.proyecto_id,
				});

				if (trabajaderaNum && newEntry.proyecto_id) {
					const displayName =
						newEntry.apodo?.trim() ||
						`${newEntry.nombre} ${newEntry.apellidos}`.trim();
					await syncCostaleroToProject(
						newEntry.proyecto_id,
						trabajaderaNum,
						displayName,
					);
				}
			} else {
				alert(error?.message || "Error al añadir al censo");
			}
			setSaving(false);
		},
		[newEntry, activeTemporadaId, setCensus, syncCostaleroToProject],
	);

	const deleteFromCensus = useCallback(
		async (id: string) => {
			if (!confirm("¿Seguro que quieres borrar a este costalero del censo?"))
				return;
			const { error } = await supabase.from("census").delete().eq("id", id);
			if (!error) setCensus((prev) => prev.filter((c) => c.id !== id));
		},
		[setCensus],
	);

	const saveEdit = useCallback(
		async (id: string) => {
			setSaving(true);
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

			if (!error) {
				setCensus((prev) =>
					prev.map((c) => (c.id === id ? { ...c, ...editForm } : c)),
				);
				setEditingId(null);
			} else {
				alert(error.message);
			}
			setSaving(false);
		},
		[editForm, setCensus],
	);

	const reconstruirCensoCompleto = useCallback(async () => {
		if (!activeTemporadaId) return;
		if (
			!confirm(
				"Esto buscará en TODOS los proyectos de esta temporada y creará las fichas de censo para cada nombre que encuentre. ¿Continuar?",
			)
		)
			return;

		setSaving(true);
		try {
			const { data: projects } = await supabase
				.from("proyectos")
				.select("*")
				.eq("temporada_id", activeTemporadaId);
			if (!projects || projects.length === 0) {
				alert("No hay proyectos en esta temporada.");
				return;
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
					await supabase.from("census").insert(toInsert);
					totalNuevos += toInsert.length;
				}
			}

			alert(
				`✅ Sincronización completa. Se han creado ${totalNuevos} nuevas fichas de censo.`,
			);
			fetchCensus();
		} catch (err) {
			// eslint-disable-next-line no-console
			console.error(err);
			alert("Error durante la reconstrucción.");
		} finally {
			setSaving(false);
		}
	}, [activeTemporadaId, fetchCensus]);

	// ═════════════════════════════════════════════════════════════════
	// SYNC CENSO ↔ PROYECTO
	// ═════════════════════════════════════════════════════════════════

	const syncTodoCenso = useCallback(
		async (proyectoId: string) => {
			setSaving(true);

			const { data: censusData } = await supabase
				.from("census")
				.select("nombre, apellidos, apodo, trabajadera")
				.eq("proyecto_id", proyectoId)
				.not("trabajadera", "is", null)
				.order("trabajadera", { ascending: true });

			if (!censusData || censusData.length === 0) {
				alert("No hay costaleros con trabajadera asignada en el censo.");
				setSaving(false);
				return;
			}

			const { data: proj, error } = await supabase
				.from("proyectos")
				.select("content")
				.eq("id", proyectoId)
				.single();

			if (error || !proj) {
				setSaving(false);
				return;
			}

			const content = proj.content as {
				trabajaderas: { id: number; nombres: string[] }[];
			};

			content.trabajaderas.forEach((t) => {
				t.nombres = Array(6)
					.fill("")
					.map((_, i) => `Costalero ${i + 1}`);
			});

			const byTrab: Record<number, string[]> = {};
			censusData.forEach((c) => {
				const tid = c.trabajadera as number;
				const name = c.apodo?.trim() || `${c.nombre} ${c.apellidos}`.trim();
				if (!byTrab[tid]) byTrab[tid] = [];
				byTrab[tid].push(name);
			});

			Object.entries(byTrab).forEach(([tidStr, names]) => {
				const tid = parseInt(tidStr);
				const trab = content.trabajaderas.find((t) => t.id === tid);
				if (!trab) return;

				names.forEach((name, i) => {
					if (i < trab.nombres.length) {
						trab.nombres[i] = name;
					} else {
						trab.nombres.push(name);
					}
				});
			});

			const { error: updateErr } = await supabase
				.from("proyectos")
				.update({ content })
				.eq("id", proyectoId);

			if (updateErr) {
				alert("Error al guardar: " + updateErr.message);
				setSaving(false);
				return;
			}

			// Leer el proyecto actualizado para asegurar datos frescos
			const { data: updatedProj } = await supabase
				.from("proyectos")
				.select("content")
				.eq("id", proyectoId)
				.single();

			alert("✅ Cuadrilla sincronizada desde el censo.");
			setSaving(false);
			onSyncComplete?.(proyectoId, updatedProj?.content);
		},
		[onSyncComplete],
	);

	const syncCensoDesdeProyecto = useCallback(
		async (proyectoId: string) => {
			if (
				!confirm(
					"⚠️ Esto buscará todos los nombres en el diseño de la cuadrilla y los añadirá al Censo de esta temporada si no existen. ¿Continuar?",
				)
			)
				return;
			setSaving(true);

			const { data: proj } = await supabase
				.from("proyectos")
				.select("content")
				.eq("id", proyectoId)
				.single();
			if (!proj) {
				setSaving(false);
				return;
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

			if (newEntries.length > 0) {
				const { error } = await supabase.from("census").insert(newEntries);
				if (error) {
					alert("Error al insertar en el censo: " + error.message);
				} else {
					alert(`✅ Se han añadido ${newEntries.length} costaleros al censo.`);
				}
			} else {
				alert(
					"ℹ️ Todos los costaleros de la cuadrilla ya estaban en el censo (o estaban vacíos).",
				);
			}
			setSaving(false);
			fetchCensus();
		},
		[activeTemporadaId, fetchCensus],
	);

	// ═════════════════════════════════════════════════════════════════
	// IMPORTACIÓN ICUADRILLA
	// ═════════════════════════════════════════════════════════════════

	const fetchFromICuadrilla = useCallback(
		async (defaultPid: string) => {
			setImportLoading(true);
			try {
				const {
					data: { session },
				} = await supabase.auth.getSession();
				const res = await fetch("/api/import-costaleros", {
					headers: {
						Authorization: `Bearer ${session?.access_token ?? ""}`,
					},
				});

				if (!res.ok) {
					const errorText = await res.text();
					throw new Error(errorText || `Error ${res.status} al obtener datos`);
				}

				const data = await res.json();

				const importEntries: ImportEntry[] = data;

				const { data: existing } = await supabase
					.from("census")
					.select("email, external_id");
				const existingEmails = new Set(
					(existing ?? []).map((e) => e.email?.toLowerCase()),
				);
				const existingIds = new Set((existing ?? []).map((e) => e.external_id));

				const preview: ImportEntry[] = importEntries.map((c: ImportEntry) => ({
					...c,
					selected: true,
					_status:
						(c.email && existingEmails.has(c.email.toLowerCase())) ||
						(c.external_id && existingIds.has(c.external_id))
							? "exists"
							: "new",
				}));

				setImportPreview(preview);
				if (defaultPid && !importPid) setImportPid(defaultPid);
			} catch (err) {
				alert(
					`❌ Error al conectar con iCuadrilla:\n${err instanceof Error ? err.message : "desconocido"}`,
				);
			}
			setImportLoading(false);
		},
		[importPid],
	);

	const ejecutarImportacion = useCallback(async () => {
		if (!importPid) {
			alert("Selecciona un paso para sincronizar.");
			return;
		}
		if (!importPreview) {
			alert("Primero obtené el preview de iCuadrilla.");
			return;
		}
		setSaving(true);

		try {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			const res = await fetch("/api/import-costaleros", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.access_token ?? ""}`,
				},
				body: JSON.stringify({ proyecto_id: importPid }),
			});

			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				throw new Error(errorData.error || `Error ${res.status}`);
			}

			const result = await res.json();

			await syncTodoCenso(importPid);
			setImportPreview(null);
			alert(
				`✅ Sincronización completa (full sync):\n` +
					`- ${result.deleted ?? "?"} registros eliminados del censo local\n` +
					`- ${result.inserted ?? "?"} costaleros importados desde iCuadrilla\n` +
					`- Cuadrilla sincronizada.`,
			);
		} catch (err) {
			// eslint-disable-next-line no-console
			console.error(err);
			alert(
				"❌ Error durante la sincronización: " +
					(err instanceof Error ? err.message : "desconocido"),
			);
		} finally {
			setSaving(false);
			fetchCensus();
		}
	}, [importPid, importPreview, syncTodoCenso, fetchCensus]);

	const sincronizacionTotal = useCallback(async () => {
		if (!importPid) {
			alert("Selecciona un paso para sincronizar.");
			return;
		}

		if (
			!confirm(
				"⚠️ ATENCIÓN: Esto buscará costaleros en tu App que ya no existen en iCuadrilla y los borrará de tu Censo Local. ¿Proceder?",
			)
		)
			return;

		setSaving(true);
		try {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			const res = await fetch("/api/import-costaleros", {
				headers: {
					Authorization: `Bearer ${session?.access_token ?? ""}`,
				},
			});

			if (!res.ok) {
				const errorText = await res.text();
				throw new Error(errorText || `Error ${res.status} al sincronizar`);
			}

			const remoteData: ImportEntry[] = await res.json();
			const remoteIds = new Set(remoteData.map((r) => r.external_id));

			const { data: localData } = await supabase
				.from("census")
				.select("id, external_id, nombre, apellidos")
				.eq("proyecto_id", importPid)
				.eq("source", "icuadrilla")
				.not("external_id", "is", null);

			if (!localData) return;

			const aBorrar = localData.filter((l) => !remoteIds.has(l.external_id));

			if (aBorrar.length === 0) {
				alert(
					"✅ Tu censo ya está perfectamente sincronizado. No hay bajas detectadas.",
				);
			} else {
				if (
					confirm(
						`Se han detectado ${aBorrar.length} bajas (gente que ya no está en iCuadrilla).\n\n¿Quieres borrarlos de tu App?`,
					)
				) {
					for (const item of aBorrar) {
						await supabase.from("census").delete().eq("id", item.id);
					}
					alert(
						`✅ Se han eliminado ${aBorrar.length} registros del censo local.`,
					);
				}
			}
		} catch (err) {
			// eslint-disable-next-line no-console
			console.error(err);
			alert("❌ Error durante la sincronización total.");
		} finally {
			setSaving(false);
			fetchCensus();
		}
	}, [importPid, fetchCensus]);

	// ═════════════════════════════════════════════════════════════════
	// TEMPORADAS
	// ═════════════════════════════════════════════════════════════════

	const eliminarTemporada = useCallback(
		async (id: string, onDeleted?: () => void) => {
			if (
				!confirm(
					"⚠️ ¿Seguro que quieres borrar esta temporada? Se borrarán todos los proyectos y el censo asociado de forma irreversible.",
				)
			)
				return;
			setSaving(true);
			try {
				const { data: projects } = await supabase
					.from("proyectos")
					.select("id")
					.eq("temporada_id", id);

				if (projects && projects.length > 0) {
					const projectIds = projects.map((p) => p.id);
					const { data: cDel, error: cErr } = await supabase
						.from("census")
						.delete()
						.in("proyecto_id", projectIds)
						.select();
					if (cErr) {
						// eslint-disable-next-line no-console
						console.warn("Error borrando censo por proyecto_id:", cErr.message);
					} else {
						// eslint-disable-next-line no-console
						console.log(
							`Censo borrado (vía proyectos): ${cDel?.length || 0} registros`,
						);
					}
				}

				await supabase.from("census").delete().eq("temporada_id", id);

				const { data: pDeleted, error: pErr } = await supabase
					.from("proyectos")
					.delete()
					.eq("temporada_id", id)
					.select();
				if (pErr) {
					// eslint-disable-next-line no-console
					console.warn("Error borrando proyectos:", pErr.message);
				} else {
					// eslint-disable-next-line no-console
					console.log(`Proyectos borrados: ${pDeleted?.length || 0} registros`);
				}

				const { data, error } = await supabase
					.from("temporadas")
					.delete()
					.eq("id", id)
					.select();

				if (error) {
					throw new Error(`Error en la base de datos: ${error.message}`);
				}

				if (!data || data.length === 0) {
					throw new Error(
						"No se pudo borrar la fila de la temporada. Verificá si tenés permisos de borrado (RLS) en Supabase.",
					);
				}

				alert("✅ Temporada eliminada con éxito");
				onDeleted?.();
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error(err);
				alert(
					`❌ ${err instanceof Error ? err.message : "Error desconocido al eliminar"}`,
				);
			} finally {
				setSaving(false);
			}
		},
		[],
	);

	const crearTemporada = useCallback(
		async (form: NewTempForm, onSuccess?: () => void) => {
			if (!form.nombre) return;
			setSaving(true);

			try {
				const { data: nTemp, error: tErr } = await supabase
					.from("temporadas")
					.insert([{ nombre: form.nombre, activa: false }])
					.select()
					.single();

				if (tErr || !nTemp) {
					alert("Error al crear temporada");
					setSaving(false);
					return;
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
									.insert([
										{ ...rest, content: cleanContent, temporada_id: newId },
									])
									.select()
									.single();

								if (pErr) {
									// eslint-disable-next-line no-console
									console.error("Error al clonar paso:", pErr);
									alert("Error al clonar uno de los pasos: " + pErr.message);
									setSaving(false);
									return;
								}
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
						if (cFetchErr) {
							// eslint-disable-next-line no-console
							console.error("Error al leer censo original:", cFetchErr);
							alert("Error al leer el censo de la temporada origen");
						} else if (oldC && oldC.length > 0) {
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
							const { error: cInsErr } = await supabase
								.from("census")
								.insert(newC);
							if (cInsErr) {
								// eslint-disable-next-line no-console
								console.error("Error al insertar nuevo censo:", cInsErr);
								alert("Error al clonar el censo: " + cInsErr.message);
							}
						}
					}
				}

				alert("Temporada creada con éxito");
				onSuccess?.();
			} finally {
				setSaving(false);
			}
		},
		[],
	);

	return {
		// Estado
		saving,
		importLoading,
		newEntry,
		setNewEntry,
		newPaso,
		setNewPaso,
		newTemp,
		setNewTemp,
		editingId,
		setEditingId,
		editForm,
		setEditForm,
		importPid,
		setImportPid,
		importPreview,
		setImportPreview,

		// Acciones
		eliminarUsuario,
		cambiarRol,
		editarPerfil,
		addPaso,
		eliminarPaso,
		addToCensus,
		deleteFromCensus,
		saveEdit,
		syncCostaleroToProject,
		syncTodoCenso,
		syncCensoDesdeProyecto,
		reconstruirCensoCompleto,
		fetchFromICuadrilla,
		ejecutarImportacion,
		sincronizacionTotal,
		eliminarTemporada,
		crearTemporada,
	};
}
