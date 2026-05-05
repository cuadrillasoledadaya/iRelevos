// ══════════════════════════════════════════════════════════════════
// SAVE CLOUD — Persistencia asíncrona a Supabase con debounce + ownership.
// ══════════════════════════════════════════════════════════════════

import type { DatosPerfil } from '@/lib/types'
import { supabase } from '@/lib/supabase'

const DEBOUNCE_MS = 800
const timers = new Map<string, ReturnType<typeof setTimeout>>()
const pending = new Map<string, DatosPerfil>()

/**
 * Guarda el content del proyecto en Supabase con debounce.
 * Múltiples llamadas rápidas se agrupan en un solo request.
 *
 * No-op si no hay usuario autenticado, no hay pid, o el usuario
 * no es el dueño del proyecto.
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
): void {
  if (!targetPid) return

  // Guardar el último content recibido
  pending.set(targetPid, content)

  // Resetear timer anterior
  const existing = timers.get(targetPid)
  if (existing) clearTimeout(existing)

  // Crear nuevo timer
  const timer = setTimeout(() => {
    void doSave(targetPid)
  }, DEBOUNCE_MS)

  timers.set(targetPid, timer)
}

async function doSave(targetPid: string): Promise<void> {
  const content = pending.get(targetPid)
  pending.delete(targetPid)
  timers.delete(targetPid)

  if (!content) return

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return

  const uid = session.user.id

  // 1. Verificar ownership
  const { data: proyecto } = await supabase
    .from('proyectos')
    .select('user_id')
    .eq('id', targetPid)
    .single()

  if (proyecto?.user_id && proyecto.user_id !== uid) {
    // eslint-disable-next-line no-console
    console.error(
      `[saveCloud] Bloqueado: usuario ${uid} intento modificar proyecto ${targetPid} de ${proyecto.user_id}`,
    )
    return
  }

  // 2. Preparar payload
  const payload: Record<string, unknown> = { content }
  if (!proyecto?.user_id) {
    payload.user_id = uid
  }

  // 3. Persistir
  await supabase.from('proyectos').update(payload).eq('id', targetPid)
}
