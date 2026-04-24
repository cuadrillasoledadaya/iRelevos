
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://frocxbyayhyzepznkkjh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyb2N4YnlheWh5emVwem5ra2poIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk0NzU0MCwiZXhwIjoyMDgzNTIzNTQwfQ.Bbz18_c1PRZMddDIJLbTtpqEjLtY-z8tiyTzCxaNi44'

const supabase = createClient(supabaseUrl, supabaseKey)

async function listTables() {
  console.log('Listando tablas en frocxbyayhyzepznkkjh...')
  const { data, error } = await supabase
    .from('pg_tables')
    .select('tablename')
    .eq('schemaname', 'public')
  
  if (error) {
    // Si no tenemos permiso para pg_tables, probamos una por una las comunes
    console.log('No tengo permiso para pg_tables. Probando tablas conocidas...')
    const tables = ['profiles', 'proyectos', 'costaleros', 'census', 'trabajaderas']
    for (const t of tables) {
      const { error: e } = await supabase.from(t).select('count').limit(1)
      console.log(`- Tabla ${t}: ${e ? '❌ No existe o error' : '✅ EXISTE'}`)
    }
    return
  }

  console.log('--- TABLAS ENCONTRADAS ---')
  data.forEach(t => console.log(`- ${t.tablename}`))
}

listTables()
