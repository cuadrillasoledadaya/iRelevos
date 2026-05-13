import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

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
}

interface NormalizedCostalero {
  external_id: string;
  nombre: string;
  apellidos: string;
  apodo: string;
  email: string | null;
  trabajadera: number | null;
  source: string;
}

/**
 * Valida autenticación y autorización de admin.
 * Retorna el objeto user si es válido, o un NextResponse de error.
 */
async function authenticateAdmin(request: Request): Promise<{ id: string } | NextResponse> {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    console.error('[Import API] 401: No se recibió token en Authorization header')
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData.user) {
    console.error('[Import API] 401: Token inválido', userError?.message)
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  const { data: requesterProfile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single()

  if (profileError) {
    console.error('[Import API] 500: Error al consultar profiles', profileError.message)
    return NextResponse.json({ error: `Error DB profiles: ${profileError.message}` }, { status: 500 })
  }

  const rol = requesterProfile?.role
  if (rol !== 'superadmin' && rol !== 'capataz' && rol !== 'auxiliar') {
    console.error('[Import API] 403: Rol no autorizado:', rol)
    return NextResponse.json(
      { error: 'Solo admins pueden importar costaleros' },
      { status: 403 }
    )
  }

  return { id: userData.user.id }
}

/**
 * Fetch + normalización de costaleros desde iCuadrilla.
 * Retorna el array normalizado.
 */
async function fetchICuadrillaCostaleros(): Promise<NormalizedCostalero[]> {
  const apiUrl = process.env.ICUADRILLA_API_URL
  const apiToken = process.env.ICUADRILLA_API_TOKEN

  if (!apiUrl || !apiToken) {
    console.error('[Import API] 500: Faltan variables de entorno')
    throw new Error('Faltan variables de entorno ICUADRILLA_API_URL o ICUADRILLA_API_TOKEN')
  }

  console.log('[Import API] Fetching iCuadrilla:', apiUrl)
  const res = await fetch(`${apiUrl}?select=*`, {
    headers: {
      'apikey': apiToken,
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })
  console.log('[Import API] iCuadrilla respondió status:', res.status)

  if (!res.ok) {
    const errorText = await res.text()
    console.error('[Import API] iCuadrilla error body:', errorText.substring(0, 500))
    throw new Error(`iCuadrilla API respondió con ${res.status}: ${errorText.substring(0, 200)}`)
  }

  const data = await res.json()
  const raw: ICuadrillaRaw[] = Array.isArray(data) ? data : [data]

  console.log(`[Import API] Recibidos ${raw.length} registros de iCuadrilla`)
  if (raw.length > 0) {
    console.log(`[Import API] Muestra del primero:`, JSON.stringify(raw[0]))
  }

  return raw.map((u: ICuadrillaRaw) => {
    const cleanNombre = (u.nombre || u.first_name || u.name || 'Sin Nombre').trim()
    const cleanApellidos = (u.apellidos || u.last_name || u.surname || '').trim()
    const rawEmail = (u.email || u.correo || u.mail || '').toLowerCase().trim()
    const email = rawEmail === '' ? null : rawEmail

    return {
      external_id: String(u.id),
      nombre: cleanNombre,
      apellidos: cleanApellidos,
      apodo: (u.apodo || u.nickname || '').trim(),
      email: email,
      trabajadera: u.trabajadera || u.fila || u.altura || null,
      source: 'icuadrilla'
    }
  })
}

/**
 * GET /api/import-costaleros
 *
 * Obtiene costaleros desde la API externa de iCuadrilla.
 * Requiere autenticación y rol de admin (superadmin/capataz/auxiliar).
 */
export async function GET(request: Request) {
  try {
    const authResult = await authenticateAdmin(request)
    if (authResult instanceof NextResponse) return authResult

    const normalized = await fetchICuadrillaCostaleros()
    return NextResponse.json(normalized)

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    const stack = err instanceof Error ? err.stack : ''
    console.error('[Import API] 500: Error no controlado:', msg)
    console.error('[Import API] Stack:', stack)
    return NextResponse.json(
      { error: `Error de conexión o procesamiento: ${msg}` },
      { status: 500 }
    )
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
  try {
    const authResult = await authenticateAdmin(request)
    if (authResult instanceof NextResponse) return authResult

    const body = await request.json().catch(() => null)
    if (!body || typeof body.proyecto_id !== 'string' || body.proyecto_id.trim() === '') {
      return NextResponse.json({ error: 'proyecto_id es requerido' }, { status: 400 })
    }

    const proyectoId = body.proyecto_id.trim()
    console.log('[Import API] Iniciando full sync para proyecto:', proyectoId)

    const normalized = await fetchICuadrillaCostaleros()

    const admin = getSupabaseAdmin()
    const { data, error } = await admin.rpc('full_sync_icuadrilla_census', {
      p_proyecto_id: proyectoId,
      p_records: normalized,
    })

    if (error) {
      console.error('[Import API] Error en RPC full_sync_icuadrilla_census:', error.message)
      return NextResponse.json(
        { error: `Error en sincronización: ${error.message}` },
        { status: 500 }
      )
    }

    console.log('[Import API] Full sync exitoso:', data)
    return NextResponse.json(data)

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    const stack = err instanceof Error ? err.stack : ''
    console.error('[Import API] 500: Error no controlado en POST:', msg)
    console.error('[Import API] Stack:', stack)
    return NextResponse.json(
      { error: `Error de conexión o procesamiento: ${msg}` },
      { status: 500 }
    )
  }
}
