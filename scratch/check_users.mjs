
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dkwmczswxdphqlvnlnid.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrd21jenN3eGRwaHFsdm5sbmlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDQ4ODAsImV4cCI6MjA5MjA4MDg4MH0.7hqTQ7rQ7ZimgPAzPvGHzVuGWCI1dRqLzj0rnzpr-VQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role, nombre')
  
  if (error) {
    console.error('Error al leer perfiles:', error.message)
    return
  }

  console.log('--- PERFILES ENCONTRADOS ---')
  data.forEach(p => {
    console.log(`- [${p.role}] ${p.nombre} (${p.email})`)
  })
}

checkProfiles()
