
import { createClient } from '@supabase/supabase-js'

// Proyecto PARALELO (iCuadrilla)
const supabaseUrl = 'https://frocxbyayhyzepznkkjh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyb2N4YnlheWh5emVwem5ra2poIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk0NzU0MCwiZXhwIjoyMDgzNTIzNTQwfQ.Bbz18_c1PRZMddDIJLbTtpqEjLtY-z8tiyTzCxaNi44'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkData() {
  console.log('Verificando si los datos están en el proyecto frocxbyayhyzepznkkjh...')
  const { data, error } = await supabase
    .from('proyectos')
    .select('nombre_paso')
    .limit(1)
  
  if (error) {
    console.error('Error:', error.message)
  } else {
    console.log('🔍 RESULTADO: Encontrado proyecto:', data[0]?.nombre_paso || 'Tampoco hay nada aquí')
  }
}

checkData()
