
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dkwmczswxdphqlvnlnid.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrd21jenN3eGRwaHFsdm5sbmlkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUwNDg4MCwiZXhwIjoyMDkyMDgwODgwfQ._FQj6uGXvjzXPNJWMn5wsopcfIJBPvHLfrIw2TZC9s8'

const supabase = createClient(supabaseUrl, serviceKey)

async function test() {
  console.log('Probando NUEVA Service Role Key...')
  const { data, error } = await supabase.from('profiles').select('nombre').eq('id', '3c32dce0-2664-4758-b454-2b4c6f4b0a81').single()
  
  if (error) {
    console.log('Error:', error.message)
  } else {
    console.log('¡CONEXIÓN EXITOSA!', data)
  }
}

test()
