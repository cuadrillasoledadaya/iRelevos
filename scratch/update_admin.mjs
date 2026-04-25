
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dkwmczswxdphqlvnlnid.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrd21jenN3eGRwaHFsdm5sbmlkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk0NzU0MCwiZXhwIjoyMDkyMDgwODgwfQ._FQj6uGXvjzXPNJWMn5wsopcfIJBPvHLfrIw2TZC9s8'

const supabase = createClient(supabaseUrl, serviceKey)

async function updateSuperadmin() {
  console.log('Actualizando nombre del Superadmin...')
  const { data, error } = await supabase
    .from('profiles')
    .update({ nombre: 'Superadmin', apodo: 'Admin' })
    .eq('id', '3c32dce0-2664-4758-b454-2b4c6f4b0a81')
    .select()

  if (error) {
    console.error('Error:', error.message)
  } else {
    console.log('¡Perfil actualizado con éxito!', data)
  }
}

updateSuperadmin()
