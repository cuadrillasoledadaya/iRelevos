// ══════════════════════════════════════════════════════════════════
// SAVE CLOUD — Extracto de useEstado.tsx (Phase 1.4)
// Persistencia asíncrona a Supabase para el content del proyecto.
// ══════════════════════════════════════════════════════════════════

import type { DatosPerfil } from '@/lib/types'
import { supabase } from '@/lib/supabase'

/**
 * Guarda el content del proyecto en Supabase.
 * No-op si no hay usuario autenticado o no hay pid.
 */
export async function saveCloud(
  content: DatosPerfil,
  targetPid: string,
): Promise<void> {
  if (!targetPid) return

  // Verificamos si hay sesión activa antes de persistir
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return

  await supabase
    .from('proyectos')
    .update({ content })
    .eq('id', targetPid)
}
