
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dkwmczswxdphqlvnlnid.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrd21jenN3eGRwaHFsdm5sbmlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDQ4ODAsImV4cCI6MjA5MjA4MDg4MH0.7hqTQ7rQ7ZimgPAzPvGHzVuGWCI1dRqLzj0rnzpr-VQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkData() {
  console.log('Verificando conexión a la base de datos de Relevos...')
  const { data, error } = await supabase
    .from('proyectos')
    .select('nombre_paso')
    .limit(1)
  
  if (error) {
    console.error('Error de conexión:', error.message)
  } else {
    console.log('✅ Conexión exitosa. Encontrado proyecto:', data[0]?.nombre_paso || 'Ninguno (tabla vacía)')
  }
}

checkData()
