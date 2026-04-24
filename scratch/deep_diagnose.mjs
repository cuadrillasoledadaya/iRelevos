
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dkwmczswxdphqlvnlnid.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrd21jenN3eGRwaHFsdm5sbmlkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUwNDg4MCwiZXhwIjoyMDkyMDgwODgwfQ._FQj6uGXvjzXPNJWMn5wsopcfIJBPvHLfrIw2TZC9s8'

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function diagnose() {
  console.log('--- DIAGNÓSTICO PROFUNDO (ADMIN) ---')

  // 1. Usuarios en Auth
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
  if (authError) {
    console.error('Error listando usuarios auth:', authError.message)
  } else {
    console.log(`\nUsuarios en Auth (${authUsers.users.length}):`)
    authUsers.users.forEach(u => {
      console.log(`- [${u.id}] ${u.email} (Confirmado: ${u.email_confirmed_at ? 'SÍ' : 'NO'})`)
    })
  }

  // 2. Perfiles
  const { data: profiles, error: profError } = await supabase.from('profiles').select('*')
  if (profError) {
    console.error('Error listando perfiles:', profError.message)
  } else {
    console.log(`\nPerfiles en DB (${profiles.length}):`)
    profiles.forEach(p => {
      console.log(`- [${p.role}] ${p.nombre} (${p.email}) ID: ${p.id}`)
    })
  }

  // 3. Proyectos
  const { data: proyectos, error: projError } = await supabase.from('proyectos').select('id, nombre_paso')
  if (projError) {
    console.error('Error listando proyectos:', projError.message)
  } else {
    console.log(`\nProyectos encontrados (${proyectos.length}):`)
    proyectos.forEach(p => {
      console.log(`- ${p.nombre_paso} (${p.id})`)
    })
  }
}

diagnose()
