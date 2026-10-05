// ══════════════════════════════════════════════════════════════════
// SAVE CLOUD — Persistencia asíncrona a Supabase con debounce + ownership.
// ══════════════════════════════════════════════════════════════════

import type { DatosPerfil } from "@/lib/types";
import { supabase } from "@/lib/supabase";

/**
 * Discriminated union emitted to the optional `onSaveError` callback when a
 * pending save is dropped. Lets callers branch on the failure mode without
 * coupling to string literals.
 */
export type SaveError =
	| { reason: "no-session" }
	| { reason: "no-content" }
	| { reason: "network-error"; error: unknown };

const DEBOUNCE_MS = 800;
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const pending = new Map<string, DatosPerfil>();

/**
 * Guarda el content del proyecto en Supabase con debounce.
 * Múltiples llamadas rápidas se agrupan en un solo request.
 *
 * No-op si no hay usuario autenticado, no hay pid, o el usuario
 * no es el dueño del proyecto.
 *
 * Optional `onSaveError` callback is fired (fire-and-forget) when a save is
 * dropped for any reason — sign-out during the debounce window, network
 * rejection, or empty content. The callback is invoked async and a throwing
 * hook is caught and swallowed so a buggy caller never breaks subsequent calls.
 *
 * MIGRACIÓN SQL (si no está hecha):
 *   ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
 *   DROP POLICY IF EXISTS "solo_owner_update" ON proyectos;
 *   DROP POLICY IF EXISTS "solo_owner_delete" ON proyectos;
 *   CREATE POLICY "solo_owner_update" ON proyectos FOR UPDATE USING (auth.uid() = user_id);
 *   CREATE POLICY "solo_owner_delete" ON proyectos FOR DELETE USING (auth.uid() = user_id);
 */
export function saveCloud(
	content: DatosPerfil,
	targetPid: string,
	onSaveError?: (reason: SaveError) => void,
): void {
	if (!targetPid) return;

	// Guardar el último content recibido
	pending.set(targetPid, content);

	// Resetear timer anterior
	const existing = timers.get(targetPid);
	if (existing) clearTimeout(existing);

	// Crear nuevo timer
	const timer = setTimeout(() => {
		void doSave(targetPid, onSaveError);
	}, DEBOUNCE_MS);
	timers.set(targetPid, timer);
}

async function doSave(
	targetPid: string,
	onSaveError?: (reason: SaveError) => void,
): Promise<void> {
	const content = pending.get(targetPid);
	pending.delete(targetPid);
	timers.delete(targetPid);

	if (!content) {
		invokeHook(onSaveError, { reason: "no-content" });
		return;
	}

	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (!session?.user) {
		invokeHook(onSaveError, { reason: "no-session" });
		return;
	}

	try {
		// Persistir — RLS ya verifica ownership en el servidor
		await supabase.from("proyectos").update({ content }).eq("id", targetPid);
	} catch (err) {
		invokeHook(onSaveError, { reason: "network-error", error: err });
	}
}

/**
 * Invoke a user hook defensively so a throwing callback never breaks the
 * persistence primitive. A throwing hook is the caller's problem; this
 * helper does not propagate the throw.
 */
function invokeHook(
	onSaveError: ((reason: SaveError) => void) | undefined,
	reason: SaveError,
): void {
	if (!onSaveError) return;
	try {
		onSaveError(reason);
	} catch {
		// Swallow hook exceptions — the caller chose a buggy callback.
	}
}