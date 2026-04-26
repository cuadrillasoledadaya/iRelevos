import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')?.toLowerCase().trim()

  if (!email) {
    return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
  }

  const apiUrl = process.env.ICUADRILLA_API_URL
  const apiToken = process.env.ICUADRILLA_API_TOKEN

  if (!apiUrl || !apiToken) {
    return NextResponse.json({ error: 'Configuración faltante' }, { status: 500 })
  }

  try {
    // Buscamos en iCuadrilla filtrando por las posibles columnas de correo
    const encodedEmail = encodeURIComponent(email)
    const url = `${apiUrl}?select=nombre,first_name,name,apellidos,last_name,surname,apodo,nickname,email,correo,mail&or=(email.eq.${encodedEmail},correo.eq.${encodedEmail},mail.eq.${encodedEmail})`
    
    const res = await fetch(url, {
      headers: {
        'apikey': apiToken,
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Error consultando censo' }, { status: res.status })
    }

    const data = await res.json()
    if (!data || data.length === 0) {
      return NextResponse.json({ found: false })
    }

    // Tomamos el primer registro que coincida
    const u = data[0]
    const cleanNombre = (u.nombre || u.first_name || u.name || '').trim()
    const cleanApellidos = (u.apellidos || u.last_name || u.surname || '').trim()
    const cleanApodo = (u.apodo || u.nickname || '').trim()

    return NextResponse.json({
      found: true,
      nombre: cleanNombre,
      apellidos: cleanApellidos,
      apodo: cleanApodo
    })

  } catch (err) {
    return NextResponse.json(
      { error: 'Error interno verificando censo' },
      { status: 500 }
    )
  }
}
