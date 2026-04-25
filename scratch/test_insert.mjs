
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dkwmczswxdphqlvnlnid.supabase.co'
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrd21jenN3eGRwaHFsdm5sbmlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDQ4ODAsImV4cCI6MjA5MjA4MDg4MH0.7hqTQ7rQ7ZimgPAzPvGHzVuGWCI1dRqLzj0rnzpr-VQ'

const supabase = createClient(supabaseUrl, anonKey)

async function testInsert() {
  console.log('Intentando insertar costalero SIN EMAIL...')
  const { data, error } = await supabase
    .from('census')
    .insert([
      { 
        nombre: 'Prueba', 
        apellidos: 'Sin Email', 
        proyecto_id: '00000000-0000-0000-0000-000000000000', 
        external_id: 'test_no_email_2'
      }
    ])
  
  if (error) {
    console.log('ERROR:', error.message)
  } else {
    console.log('EXITO! Se pueden insertar sin email.')
  }
}

testInsert()
