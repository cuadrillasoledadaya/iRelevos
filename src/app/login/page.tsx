'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    console.log('Intentando login en:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('Con email:', email)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    })

    if (error) {
      console.error('Error de Supabase:', error)
      setError(`Error: ${error.message}`)
      setLoading(false)
    } else {
      console.log('Login exitoso, redirigiendo...')
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg)] p-4">
      <div className="w-full max-w-sm p-8 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black cinzel text-[var(--oro)]">RELEVOS</h1>
          <p className="text-[var(--cre-o)] text-sm uppercase tracking-[0.3em] mt-1">Costaleros v5</p>
        </div>
        
        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          <div>
            <label className="text-[0.7rem] uppercase text-[var(--cre-o)] mb-2 block font-bold tracking-widest">Email</label>
            <input 
              required 
              type="email" 
              className="inp w-full h-12" 
              placeholder="tu@email.com"
              value={email} 
              onChange={e => setEmail(e.target.value)} 
            />
          </div>
          
          <div>
            <label className="text-[0.7rem] uppercase text-[var(--cre-o)] mb-2 block font-bold tracking-widest">Contraseña</label>
            <input 
              required 
              type="password" 
              className="inp w-full h-12" 
              placeholder="••••••••"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
          </div>

          {error && <div className="text-red-500 text-sm bg-red-500/10 p-3 border border-red-500/20 rounded text-center">{error}</div>}

          <button disabled={loading} className="btn btn-oro w-full h-14 text-xl cinzel font-black tracking-widest">
            {loading ? 'ACCEDIENDO...' : 'ENTRAR'}
          </button>
        </form>

        <div className="text-center mt-10 flex flex-col gap-3">
          <p className="text-sm text-[var(--cre-o)]">
            ¿No tienes cuenta?
          </p>
          <Link href="/register" className="btn btn-out h-12 flex items-center justify-center text-sm font-bold uppercase tracking-widest">
            Crear nuevo perfil
          </Link>
        </div>
      </div>
    </div>
  )
}
