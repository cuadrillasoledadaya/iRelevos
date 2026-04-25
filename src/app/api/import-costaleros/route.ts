import { NextResponse } from 'next/server'

export async function GET() {
  const apiUrl = process.env.ICUADRILLA_API_URL
  const apiToken = process.env.ICUADRILLA_API_TOKEN

  if (!apiUrl || !apiToken) {
    return NextResponse.json(
      { error: 'Faltan variables de entorno ICUADRILLA_API_URL o ICUADRILLA_API_TOKEN' },
      { status: 500 }
    )
  }

  try {
    const res = await fetch(`${apiUrl}?select=*`, {
      headers: {
        'apikey': apiToken,
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      const errorText = await res.text()
      return NextResponse.json(
        { error: `iCuadrilla API respondió con ${res.status}: ${errorText}` },
        { status: res.status }
      )
    }

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

    const data = await res.json()
    const raw: ICuadrillaRaw[] = Array.isArray(data) ? data : [data]

    console.log(`[Import API] Recibidos ${raw.length} registros de iCuadrilla`)
    if (raw.length > 0) {
      console.log(`[Import API] Muestra del primero:`, JSON.stringify(raw[0]))
    }

    const normalized = raw.map((u: ICuadrillaRaw) => {
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

    return NextResponse.json(normalized)

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json(
      { error: `Error de conexión o procesamiento: ${msg}` },
      { status: 500 }
    )
  }
}
