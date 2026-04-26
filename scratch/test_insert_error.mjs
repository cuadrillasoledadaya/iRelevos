import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const email = 'proyectosdryros@gmail.com'
  const password = 'password123'
  
  // 1. Intentar auth signup (ignora si falla por duplicado o borraremos luego)
  console.log('1. Registrando en Auth...')
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password
  })
  
  if (authError) {
    console.error('Auth error:', authError)
    if (!authError.message.includes('User already registered')) {
        return
    }
  }

  // 2. Probar insertar perfil falso
  // Si authData.user es null, significa que ya existía pero con confirmación de mail desactivada no devuelve el usuario
  let uid = authData?.user?.id
  if (!uid) {
    // Buscar UID falso para probar si la tabla profiles tiene RLS bloqueando INSERT
    uid = '00000000-0000-0000-0000-000000000000'
  }

  console.log('2. Insertando en Profiles con UID:', uid)
  const { data: profData, error: profError } = await supabase.from('profiles').insert([
    {
      id: uid,
      nombre: 'Pruebas',
      apellidos: 'Pruebas',
      apodo: 'Pruebas',
      role: 'costalero'
    }
  ])

  if (profError) {
    console.error('PROFILES INSERT ERROR:', JSON.stringify(profError, null, 2))
  } else {
    console.log('Profiles Insert O.K.', profData)
  }
}

run()
