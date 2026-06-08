// ══════════════════════════════════════════════════════════════════
// USE ADMIN MUTATIONS — Thin orchestrator (UI + service calls)
// ══════════════════════════════════════════════════════════════════

import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { PasoDB } from "@/lib/types";
import type { UserRole } from "@/hooks/useAuth";
import type {
	CensusEntry,
	NewTempForm,
} from "@/components/admin/types";
import { useAdminForms } from "@/hooks/useAdminForms";
import * as adminService from "@/services/adminService";
import { projectStore } from "@/stores";

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
	const forms = useAdminForms();

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

			const result = await adminService.deleteUser(uid, session.access_token);
			if (result.error) {
				alert("Error al eliminar: " + result.error);
				return;
			}

			setUsuarios((prev) => prev.filter((u) => u.id !== uid));
		},
		[setUsuarios],
	);

	const cambiarRol = useCallback(
		async (uid: string, nuevoRol: UserRole) => {
			const result = await adminService.updateUserRole(uid, nuevoRol);
			if (!result.error) {
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

			forms.setSaving(true);
			const result = await adminService.updateUserProfile(uid, {
				nombre: nuevoNombre.trim(),
				apellidos: nuevosApellidos.trim(),
				apodo: nuevoApodo.trim(),
			});

			if (!result.error) {
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
				alert(result.error);
			}
			forms.setSaving(false);
		},
		[setUsuarios, forms],
	);

	// ═════════════════════════════════════════════════════════════════
	// PASOS
	// ═════════════════════════════════════════════════════════════════

	const addPaso = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			if (!forms.newPaso.nombre_paso || !activeTemporadaId) return;
			forms.setSaving(true);

			const {
				data: { session },
			} = await supabase.auth.getSession();

			const result = await adminService.createPaso(
				forms.newPaso,
				activeTemporadaId,
				session?.user?.id ?? null,
			);

			if (!result.error) {
				forms.setNewPaso({
					nombre_paso: "",
					nombre_cuadrilla: "",
					num_trabajaderas: 6,
				});
				fetchPasos();
			} else {
				alert(result.error);
			}
			forms.setSaving(false);
		},
		[forms, activeTemporadaId, fetchPasos],
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

			const result = await adminService.deletePaso(id);
			if (result.error) {
				alert(result.error);
				return;
			}

			if (result.data?.user_id && result.data.user_id !== session?.user?.id) {
				// Re-insert if ownership check failed (deletePaso already deleted)
				// Actually deletePaso checks ownership BEFORE delete, so this path
				// means it already returned an error. This is defensive only.
			}

			fetchPasos();
		},
		[fetchPasos],
	);

	// ═════════════════════════════════════════════════════════════════
	// CENSO
	// ═════════════════════════════════════════════════════════════════

	const syncCostaleroToProject = useCallback(
		async (proyectoId: string, trabajaderaId: number, displayName: string) => {
			const {
				data: { session },
			} = await supabase.auth.getSession();

			const result = await adminService.syncCostaleroToProject(
				proyectoId,
				trabajaderaId,
				displayName,
				session?.user?.id ?? null,
			);

			if (result.error) {
				// eslint-disable-next-line no-console
				console.error("syncCostalero:", result.error);
				alert(
					`⚠️ No se pudo actualizar la cuadrilla: ${result.error}.\nUsá el botón "🔄 Sincronizar Cuadrilla" manualmente.`,
				);
			}
		},
		[],
	);

	const addToCensus = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			if (!forms.newEntry.nombre) return;
			forms.setSaving(true);

			const trabajaderaNum = forms.newEntry.trabajadera
				? parseInt(forms.newEntry.trabajadera)
				: null;

			const result = await adminService.addToCensus(
				forms.newEntry,
				activeTemporadaId,
			);

			if (!result.error && result.data) {
				setCensus((prev) => [result.data!, ...prev]);
				forms.setNewEntry({
					email: "",
					nombre: "",
					apellidos: "",
					apodo: "",
					telefono: "",
					trabajadera: "",
					altura: "",
					proyecto_id: forms.newEntry.proyecto_id,
				});

				if (trabajaderaNum && forms.newEntry.proyecto_id) {
					const displayName =
						forms.newEntry.apodo?.trim() ||
						`${forms.newEntry.nombre} ${forms.newEntry.apellidos}`.trim();
					await syncCostaleroToProject(
						forms.newEntry.proyecto_id,
						trabajaderaNum,
						displayName,
					);
				}
			} else {
				alert(result.error || "Error al añadir al censo");
			}
			forms.setSaving(false);
		},
		[forms, activeTemporadaId, setCensus, syncCostaleroToProject],
	);

	const deleteFromCensus = useCallback(
		async (id: string) => {
			if (!confirm("¿Seguro que quieres borrar a este costalero del censo?"))
				return;
			const result = await adminService.deleteFromCensus(id);
			if (!result.error) setCensus((prev) => prev.filter((c) => c.id !== id));
		},
		[setCensus],
	);

	const saveEdit = useCallback(
		async (id: string) => {
			forms.setSaving(true);
			const result = await adminService.saveCensusEdit(id, forms.editForm);

			if (!result.error) {
				setCensus((prev) =>
					prev.map((c) => (c.id === id ? { ...c, ...forms.editForm } : c)),
				);
				forms.setEditingId(null);
			} else {
				alert(result.error);
			}
			forms.setSaving(false);
		},
		[forms, setCensus],
	);

	const reconstruirCensoCompleto = useCallback(async () => {
		if (!activeTemporadaId) return;
		if (
			!confirm(
				"Esto buscará en TODOS los proyectos de esta temporada y creará las fichas de censo para cada nombre que encuentre. ¿Continuar?",
			)
		)
			return;

		forms.setSaving(true);
		try {
			const result = await adminService.rebuildCensusComplete(activeTemporadaId);
			if (result.error) {
				alert(result.error);
				return;
			}
			alert(
				`✅ Sincronización completa. Se han creado ${result.data!.totalNuevos} nuevas fichas de censo.`,
			);
			fetchCensus();
		} catch (err) {
			// eslint-disable-next-line no-console
			console.error(err);
			alert("Error durante la reconstrucción.");
		} finally {
			forms.setSaving(false);
		}
	}, [activeTemporadaId, fetchCensus, forms]);

	// ═════════════════════════════════════════════════════════════════
	// SYNC CENSO ↔ PROYECTO
	// ═════════════════════════════════════════════════════════════════

	const syncTodoCenso = useCallback(
		async (proyectoId: string) => {
			forms.setSaving(true);

			const result = await adminService.syncTodoCenso(proyectoId);

			if (result.error) {
				alert(result.error);
				forms.setSaving(false);
				return;
			}

			alert("✅ Cuadrilla sincronizada desde el censo.");
			forms.setSaving(false);
			onSyncComplete?.(proyectoId, result.data?.content);
		},
		[onSyncComplete, forms],
	);

	const syncCensoDesdeProyecto = useCallback(
		async (proyectoId: string) => {
			if (
				!confirm(
					"⚠️ Esto buscará todos los nombres en el diseño de la cuadrilla y los añadirá al Censo de esta temporada si no existen. ¿Continuar?",
				)
			)
				return;
			forms.setSaving(true);

			const result = await adminService.syncProjectToCensus(
				proyectoId,
				activeTemporadaId,
			);

			if (result.error) {
				alert(result.error);
			} else if (result.data!.inserted === 0) {
				alert(
					"ℹ️ Todos los costaleros de la cuadrilla ya estaban en el censo (o estaban vacíos).",
				);
			} else {
				alert(`✅ Se han añadido ${result.data!.inserted} costaleros al censo.`);
			}
			forms.setSaving(false);
			fetchCensus();
		},
		[activeTemporadaId, fetchCensus, forms],
	);

	// ═════════════════════════════════════════════════════════════════
	// IMPORTACIÓN ICUADRILLA
	// ═════════════════════════════════════════════════════════════════

	const fetchFromICuadrilla = useCallback(
		async (defaultPid: string) => {
			forms.setImportLoading(true);
			try {
				const {
					data: { session },
				} = await supabase.auth.getSession();
				const result = await adminService.fetchICuadrillaData(
					session?.access_token ?? "",
				);

				if (result.error) {
					throw new Error(result.error);
				}

				const importEntries = result.data!;

				const { data: existing } = await supabase
					.from("census")
					.select("email, external_id");
				const existingEmails = new Set(
					(existing ?? []).map((e) => e.email?.toLowerCase()),
				);
				const existingIds = new Set((existing ?? []).map((e) => e.external_id));

				const preview = importEntries.map((c) => ({
					...c,
					selected: true,
					_status:
						(c.email && existingEmails.has(c.email.toLowerCase())) ||
						(c.external_id && existingIds.has(c.external_id))
							? "exists" as const
							: "new" as const,
				}));

				forms.setImportPreview(preview);
				if (defaultPid && !forms.importPid) forms.setImportPid(defaultPid);
			} catch (err) {
				alert(
					`❌ Error al conectar con iCuadrilla:\n${err instanceof Error ? err.message : "desconocido"}`,
				);
			}
			forms.setImportLoading(false);
		},
		[forms],
	);

	const ejecutarImportacion = useCallback(async () => {
		if (!forms.importPid) {
			alert("Selecciona un paso para sincronizar.");
			return;
		}
		if (!forms.importPreview) {
			alert("Primero obtené el preview de iCuadrilla.");
			return;
		}
		forms.setSaving(true);

		try {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			const result = await adminService.executeImport(
				forms.importPid,
				session?.access_token ?? "",
			);

			if (result.error) {
				throw new Error(result.error);
			}

			await syncTodoCenso(forms.importPid);
			await projectStore.getState().refetchPasos();
			forms.setImportPreview(null);
			alert(
				`✅ Sincronización completa (full sync):\n` +
					`- ${result.data?.deleted ?? "?"} registros eliminados del censo local\n` +
					`- ${result.data?.inserted ?? "?"} costaleros importados desde iCuadrilla\n` +
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
			forms.setSaving(false);
			fetchCensus();
		}
	}, [forms, syncTodoCenso, fetchCensus]);

	const sincronizacionTotal = useCallback(async () => {
		if (!forms.importPid) {
			alert("Selecciona un paso para sincronizar.");
			return;
		}

		if (
			!confirm(
				"⚠️ ATENCIÓN: Esto buscará costaleros en tu App que ya no existen en iCuadrilla y los borrará de tu Censo Local. ¿Proceder?",
			)
		)
			return;

		forms.setSaving(true);
		try {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			const result = await adminService.fullSyncCheck(
				forms.importPid,
				session?.access_token ?? "",
			);

			if (result.error) {
				throw new Error(result.error);
			}

			const aBorrar = result.data!.aBorrar;

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
						await adminService.deleteCensusEntry(item.id);
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
			forms.setSaving(false);
			fetchCensus();
		}
	}, [forms, fetchCensus]);

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
			forms.setSaving(true);
			try {
				const result = await adminService.deleteTemporada(id);

				if (result.error) {
					throw new Error(result.error);
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
				forms.setSaving(false);
			}
		},
		[forms],
	);

	const crearTemporada = useCallback(
		async (form: NewTempForm, onSuccess?: () => void) => {
			if (!form.nombre) return;
			forms.setSaving(true);

			try {
				const result = await adminService.createTemporada(form);

				if (result.error) {
					alert(result.error);
					forms.setSaving(false);
					return;
				}

				alert("Temporada creada con éxito");
				onSuccess?.();
			} finally {
				forms.setSaving(false);
			}
		},
		[forms],
	);

	return {
		// Estado
		saving: forms.saving,
		importLoading: forms.importLoading,
		newEntry: forms.newEntry,
		setNewEntry: forms.setNewEntry,
		newPaso: forms.newPaso,
		setNewPaso: forms.setNewPaso,
		newTemp: forms.newTemp,
		setNewTemp: forms.setNewTemp,
		editingId: forms.editingId,
		setEditingId: forms.setEditingId,
		editForm: forms.editForm,
		setEditForm: forms.setEditForm,
		importPid: forms.importPid,
		setImportPid: forms.setImportPid,
		importPreview: forms.importPreview,
		setImportPreview: forms.setImportPreview,

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
