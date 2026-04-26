import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Manual .env.local parsing
const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const env: Record<string, string> = {}
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=')
  if (key && value) {
    env[key.trim()] = value.join('=').trim()
  }
})

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testProfiles() {
  console.log('Using URL:', env.NEXT_PUBLIC_SUPABASE_URL)
  const { data, error } = await supabase.from('profiles').select('*').limit(1)
  console.log('--- PROFILES TABLE INFO ---')
  if (error) {
    console.log('Error:', error)
  } else {
    if (data && data.length > 0) {
      console.log('Columns in profiles:', Object.keys(data[0]))
      console.log('Sample data:', data[0])
    } else {
      console.log('Table is empty, trying to get columns via rpc or just listing common ones')
      // If table is empty, we can't easily get keys from select '*' via anon key if no rows.
    }
  }
}

testProfiles()
