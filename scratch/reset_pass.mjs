
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dkwmczswxdphqlvnlnid.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrd21jenN3eGRwaHFsdm5sbmlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDQ4ODAsImV4cCI6MjA5MjA4MDg4MH0.7hqTQ7rQ7ZimgPAzPvGHzVuGWCI1dRqLzj0rnzpr-VQ'

const supabase = createClient(supabaseUrl, serviceKey)

async function resetPassword() {
  const userId = '3c32dce0-2664-4758-b454-2b4c6f4b0a81'
  const newPassword = 'Chiqui'

  console.log(`Reseteando contraseña para alarmdryros@gmail.com...`)
  
  const { data, error } = await supabase.auth.admin.updateUserById(
    userId,
    { password: newPassword }
  )

  if (error) {
    console.error('Error al resetear contraseña:', error.message)
  } else {
    console.log('✅ ¡CONTRASEÑA RESETEADA CON ÉXITO!')
    console.log('Ahora intentá entrar con:')
    console.log('Email: alarmdryros@gmail.com')
    console.log('Password: Chiqui')
  }
}

resetPassword()
