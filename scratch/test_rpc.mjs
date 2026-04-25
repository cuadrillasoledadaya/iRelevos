
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dkwmczswxdphqlvnlnid.supabase.co'
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrd21jenN3eGRwaHFsdm5sbmlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDQ4ODAsImV4cCI6MjA5MjA4MDg4MH0.7hqTQ7rQ7ZimgPAzPvGHzVuGWCI1dRqLzj0rnzpr-VQ'

const supabase = createClient(supabaseUrl, anonKey)

async function testRpc() {
  console.log('Probando RPC upsert_census_from_external con EMAIL NULO...')
  const { data, error } = await supabase.rpc('upsert_census_from_external', {
    p_external_id: 'test_rpc_no_email',
    p_nombre: 'Test RPC',
    p_apellidos: 'Sin Email',
    p_apodo: 'testrpc',
    p_email: null,
    p_trabajadera: 1,
    p_proyecto_id: '861a156e-826c-4861-a010-9f6b95b867c2', // Algún ID
    p_source: 'icuadrilla'
  })
  
  if (error) {
    console.log('ERROR RPC:', error.message)
    console.log('DETALLE:', error.details || 'sin detalles')
  } else {
    console.log('EXITO! El RPC acepta emails nulos.')
  }
}

testRpc()
