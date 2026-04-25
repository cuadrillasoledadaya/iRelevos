
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dkwmczswxdphqlvnlnid.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrd21jenN3eGRwaHFsdm5sbmlkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk0NzU0MCwiZXhwIjoyMDkyMDgwODgwfQ._FQj6uGXvjzXPNJWMn5wsopcfIJBPvHLfrIw2TZC9s8'

const supabase = createClient(supabaseUrl, serviceKey)

async function getPids() {
  const { data, error } = await supabase.from('proyectos').select('id, nombre_paso')
  if (error) console.log(error.message)
  else console.log(data)
}
getPids()
