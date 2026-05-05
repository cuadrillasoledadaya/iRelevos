import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * DELETE /api/admin/delete-user
 * Body: { uid: string }
 *
 * Borra un usuario de Supabase Auth Y de la tabla profiles.
 * Requiere:
 *  1. Token de autenticación válido
 *  2. El requester debe ser superadmin
 *  3. No podés borrarte a vos mismo
 */
export async function POST(request: Request) {
  try {
    const { uid } = (await request.json()) as { uid?: string }

    if (!uid) {
      return NextResponse.json({ error: 'UID requerido' }, { status: 400 })
    }

    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()

    // 1. Verificar que el token es válido
    const { data: userData, error: userError } = await admin.auth.getUser(token)
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    // 2. Verificar que el requester es superadmin
    const { data: requesterProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()

    if (requesterProfile?.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Solo superadmins pueden eliminar usuarios' },
        { status: 403 }
      )
    }

    // 3. No podés borrarte a vos mismo
    if (uid === userData.user.id) {
      return NextResponse.json(
        { error: 'No podés eliminar tu propio perfil' },
        { status: 403 }
      )
    }

    // 4. Borrar del auth (esto es lo crítico — sin esto el usuario sigue pudiendo loguear)
    const { error: authError } = await admin.auth.admin.deleteUser(uid)
    if (authError) {
      return NextResponse.json(
        { error: `Error al borrar auth: ${authError.message}` },
        { status: 500 }
      )
    }

    // 5. Borrar de profiles
    const { error: profileError } = await admin
      .from('profiles')
      .delete()
      .eq('id', uid)

    if (profileError) {
      return NextResponse.json(
        { error: `Auth borrado, pero error en profiles: ${profileError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}
