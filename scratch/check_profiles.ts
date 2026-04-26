import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testProfiles() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1)
  console.log('--- PROFILES TABLE INFO ---')
  if (error) {
    console.log('Error:', error)
  } else {
    console.log('Columns in profiles:', data[0] ? Object.keys(data[0]) : 'Table is empty, cannot infer columns')
  }
}

testProfiles()
