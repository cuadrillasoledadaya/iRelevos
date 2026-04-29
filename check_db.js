import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dkwmczswxdphqlvnlnid.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrd21jenN3eGRwaHFsdm5sbmlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDQ4ODAsImV4cCI6MjA5MjA4MDg4MH0.7hqTQ7rQ7ZimgPAzPvGHzVuGWCI1dRqLzj0rnzpr-VQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  console.log('--- TEMPORADAS ---')
  const { data: temps, error: tErr } = await supabase.from('temporadas').select('*')
  if (tErr) console.error(tErr)
  else console.log(temps)

  console.log('\n--- CENSUS COUNT PER TEMPORADA ---')
  if (temps) {
    for (const t of temps) {
      const { data: c, error: cErr } = await supabase.from('census').select('id, proyecto_id, email, external_id', { count: 'exact' }).eq('temporada_id', t.id)
      if (cErr) console.error(cErr)
      else {
        console.log(`Temporada ${t.nombre} (${t.id}): ${c.length} costaleros`)
        if (c.length > 0) {
          console.log(`  Sample:`, c.slice(0, 2))
        }
      }
    }
  }
}

check()
