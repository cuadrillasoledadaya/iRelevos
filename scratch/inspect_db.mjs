
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dkwmczswxdphqlvnlnid.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrd21jenN3eGRwaHFsdm5sbmlkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk0NzU0MCwiZXhwIjoyMDkyMDgwODgwfQ._FQj6uGXvjzXPNJWMn5wsopcfIJBPvHLfrIw2TZC9s8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspectFunction() {
  console.log('Inspeccionando función upsert_census_from_external...')
  const { data, error } = await supabase.rpc('inspect_function', { function_name: 'upsert_census_from_external' })
  
  if (error) {
    // Si no tenemos la función inspect_function, probamos vía SQL crudo (si se puede)
    // O intentamos leer el esquema de la tabla census
    console.log('No puedo inspeccionar función directamente. Probando esquema de tabla census...')
    const { error: errCols } = await supabase.from('census').select('*').limit(0)
    if (errCols) console.log('Error:', errCols.message)
    else console.log('Esquema census leído con éxito.')
  } else {
    console.log('DEFINICIÓN:', data)
  }
}

inspectFunction()
