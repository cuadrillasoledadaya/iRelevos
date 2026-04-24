
import { createClient } from '@supabase/supabase-js'

// Proyecto PARALELO (iCuadrilla)
const supabaseUrl = 'https://frocxbyayhyzepznkkjh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyb2N4YnlheWh5emVwem5ra2poIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk0NzU0MCwiZXhwIjoyMDgzNTIzNTQwfQ.Bbz18_c1PRZMddDIJLbTtpqEjLtY-z8tiyTzCxaNi44'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkProfiles() {
  console.log('Chequeando proyecto paralelo: frocxbyayhyzepznkkjh...')
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role, nombre')
  
  if (error) {
    console.error('Error:', error.message)
    return
  }

  console.log('--- PERFILES ENCONTRADOS EN PROYECTO PARALELO ---')
  if (data.length === 0) console.log('No hay perfiles.')
  data.forEach(p => {
    console.log(`- [${p.role}] ${p.nombre} (${p.email})`)
  })
}

checkProfiles()
