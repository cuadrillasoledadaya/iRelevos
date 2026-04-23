import { NextResponse } from 'next/server'

// Tipado del costalero que devuelve iCuadrilla
interface ICuadrillaEntry {
  nombre: string
  apellidos: string
  apodo?: string
  trabajadera?: string | number
  email: string
}

export async function GET() {
  const apiUrl = process.env.ICUADRILLA_API_URL
  const apiToken = process.env.ICUADRILLA_API_TOKEN

  if (!apiUrl || !apiToken) {
    return NextResponse.json(
      { error: 'Variables de entorno de iCuadrilla no configuradas.' },
      { status: 500 }
    )
  }

  try {
    const res = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      const body = await res.text()
      return NextResponse.json(
        { error: `iCuadrilla API respondió con ${res.status}: ${body}` },
        { status: res.status }
      )
    }

    const raw: ICuadrillaEntry[] = await res.json()

    // Normalizar los datos para que el cliente los pueda usar directamente
    const normalizado = raw.map((c) => ({
      nombre: c.nombre?.trim() ?? '',
      apellidos: c.apellidos?.trim() ?? '',
      apodo: c.apodo?.trim() ?? '',
      email: c.email?.trim().toLowerCase() ?? '',
      // trabajadera puede venir como número o string numérico
      trabajadera_sugerida: c.trabajadera
        ? parseInt(String(c.trabajadera), 10) || null
        : null,
    }))

    return NextResponse.json(normalizado)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'desconocido'
    return NextResponse.json(
      { error: `Error de conexión con iCuadrilla: ${msg}` },
      { status: 500 }
    )
  }
}
