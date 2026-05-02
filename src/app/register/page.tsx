'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [apodo, setApodo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [verificandoCenso, setVerificandoCenso] = useState(false)
  const router = useRouter()

  // Verificar censo al escribir email
  const checkCenso = async (emailToCheck: string) => {
    if (!emailToCheck.includes('@') || !emailToCheck.includes('.')) return
    
    setVerificandoCenso(true)
    const { data, error } = await supabase
      .from('census')
      .select('nombre, apellidos, apodo')
      .eq('email', emailToCheck.toLowerCase().trim())
      .single()

    if (!error && data) {
      setNombre(data.nombre)
      setApellidos(data.apellidos || '')
      if (data.apodo) setApodo(data.apodo)
    }
    setVerificandoCenso(false)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 1. Crear usuario en Supabase Auth pasando los metadatos (para que no fallen los triggers)
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            email,
            nombre,
            apellidos,
            apodo,
            role: 'costalero'
          }
        }
      })

      if (authError) throw authError
      if (!data.user) throw new Error('No se pudo crear el usuario')

      // El perfil se crea automáticamente mediante el trigger de base de datos 'on_auth_user_created'
      // que configuramos previamente por SQL. Ya no es necesario el upsert manual aquí,
      // evitando así conflictos de permisos (401) innecesarios.

      router.push('/')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg)] p-4">
      <div className="w-full max-w-md p-8 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl">
        <h1 className="text-3xl font-black cinzel text-[var(--oro)] mb-2 text-center">NUEVO COSTALERO</h1>
        <p className="text-[var(--cre-o)] text-sm mb-8 text-center uppercase tracking-widest">Registro de perfil</p>
        
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div>
            <label htmlFor="register-email" className="text-[0.7rem] uppercase text-[var(--cre-o)] mb-1 block flex justify-between">
              Email
              {verificandoCenso && <span className="animate-pulse text-[var(--oro)]">Verificando...</span>}
            </label>
            <input 
              id="register-email"
              required 
              type="email" 
              className="inp w-full" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              onBlur={e => checkCenso(e.target.value)}
            />
            {nombre && !loading && (
              <p className="text-[0.6rem] text-[var(--oro)] mt-1 uppercase font-bold">✓ Email reconocido por la Hermandad</p>
            )}
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label htmlFor="register-nombre" className="text-[0.7rem] uppercase text-[var(--cre-o)] mb-1 block">Nombre</label>
              <input id="register-nombre" required className="inp w-full" value={nombre} onChange={e => setNombre(e.target.value)} />
            </div>
            <div className="flex-1">
              <label htmlFor="register-apellidos" className="text-[0.7rem] uppercase text-[var(--cre-o)] mb-1 block">Apellidos</label>
              <input id="register-apellidos" required className="inp w-full" value={apellidos} onChange={e => setApellidos(e.target.value)} />
            </div>
          </div>
          
          <div>
            <label htmlFor="register-apodo" className="text-[0.7rem] uppercase text-[var(--cre-o)] mb-1 block">Apodo / Nombre en Paso</label>
            <input id="register-apodo" className="inp w-full" value={apodo} onChange={e => setApodo(e.target.value)} />
          </div>
          
          <div>
            <label htmlFor="register-password" className="text-[0.7rem] uppercase text-[var(--cre-o)] mb-1 block">Contraseña</label>
            <input id="register-password" required type="password" title="Mínimo 6 caracteres" className="inp w-full" value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          {error && <div className="text-red-500 text-sm bg-red-500/10 p-3 border border-red-500/20 rounded">{error}</div>}

          <button disabled={loading} className="btn btn-oro w-full mt-4 h-12 text-lg">
            {loading ? 'REGISTRANDO...' : 'CREAR PERFIL'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-[var(--cre-o)]">
          ¿Ya tienes cuenta? <Link href="/login" className="text-[var(--oro)] font-bold">Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}
