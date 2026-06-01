// ══════════════════════════════════════════════════════════════════
// USE ADMIN FORMS — Form state only (no Supabase, no side effects)
// ══════════════════════════════════════════════════════════════════

import { useState } from "react";
import type {
	NewCensusEntry,
	NewPasoForm,
	NewTempForm,
	CensusEditForm,
	ImportEntry,
} from "@/components/admin/types";

export function useAdminForms() {
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

	return {
		saving,
		setSaving,
		importLoading,
		setImportLoading,
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
	};
}
