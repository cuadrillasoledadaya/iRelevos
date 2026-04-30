import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dkwmczswxdphqlvnlnid.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrd21jenN3eGRwaHFsdm5sbmlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDQ4ODAsImV4cCI6MjA5MjA4MDg4MH0.7hqTQ7rQ7ZimgPAzPvGHzVuGWCI1dRqLzj0rnzpr-VQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  console.log('--- CENSUS DUMP ---')
  const { data: c, error: cErr } = await supabase.from('census').select('*').limit(10)
  if (cErr) console.error(cErr)
  else console.log(c)
}

check()
