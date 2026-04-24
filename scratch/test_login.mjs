
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dkwmczswxdphqlvnlnid.supabase.co'
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrd21jenN3eGRwaHFsdm5sbmlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDQ4ODAsImV4cCI6MjA5MjA4MDg4MH0.7hqTQ7rQ7ZimgPAzPvGHzVuGWCI1dRqLzj0rnzpr-VQ'

const supabase = createClient(supabaseUrl, anonKey)

async function testLogin() {
  console.log('Intentando login para alarmdryros@gmail.com...')
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'alarmdryros@gmail.com',
    password: 'Chiqui'
  })

  if (error) {
    console.error('❌ ERROR DE LOGIN:', error.message)
    console.log('Status:', error.status)
  } else {
    console.log('✅ ¡LOGIN EXITOSO!')
    console.log('Usuario ID:', data.user.id)
  }
}

testLogin()
