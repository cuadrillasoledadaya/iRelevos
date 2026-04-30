import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dkwmczswxdphqlvnlnid.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrd21jenN3eGRwaHFsdm5sbmlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDQ4ODAsImV4cCI6MjA5MjA4MDg4MH0.7hqTQ7rQ7ZimgPAzPvGHzVuGWCI1dRqLzj0rnzpr-VQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function fix() {
  console.log('Fetching projects...')
  const { data: proyectos, error: pErr } = await supabase.from('proyectos').select('id, temporada_id')
  if (pErr) { console.error(pErr); return }
  
  console.log(`Found ${proyectos.length} proyectos`)

  const projMap = {}
  for (const p of proyectos) {
    if (p.temporada_id) projMap[p.id] = p.temporada_id
  }

  console.log('Fetching census with null temporada_id...')
  const { data: census, error: cErr } = await supabase.from('census').select('id, proyecto_id').is('temporada_id', null)
  if (cErr) { console.error(cErr); return }

  console.log(`Found ${census.length} census rows to fix.`)
  
  let fixed = 0
  for (const c of census) {
    if (c.proyecto_id && projMap[c.proyecto_id]) {
      const { data, error: uErr } = await supabase.from('census').update({ temporada_id: projMap[c.proyecto_id] }).eq('id', c.id).select()
      if (uErr) console.error(`Error updating ${c.id}:`, uErr)
      else if (!data || data.length === 0) console.error(`RLS blocked update for ${c.id}`)
      else fixed++
    } else {
      console.log(`Missing projMap for ${c.proyecto_id}`)
    }
  }
  console.log(`Successfully fixed ${fixed} census rows.`)
}

fix()
