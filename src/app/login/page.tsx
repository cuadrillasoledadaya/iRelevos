'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null)
  const router = useRouter()

  const isRateLimited = remainingAttempts === 0

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Step 1: Check rate limit via API route
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      const data = await res.json()

      if (data.remaining !== undefined) {
        setRemainingAttempts(data.remaining)
      }

      if (!res.ok) {
        setError(data.error ?? 'Error desconocido')
        return
      }

      // Step 2: Sign in directly — browser client writes cookies automatically
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        setError('Credenciales incorrectas')
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('Ocurrió un error. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg)] p-4">
      <div className="w-full max-w-sm p-8 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black cinzel text-[var(--oro)]">i-Relevos</h1>
          <p className="text-[var(--cre-o)] text-sm uppercase tracking-[0.2em] mt-1 font-semibold">Gestión de Costaleros</p>
        </div>
        
        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          <div>
            <label htmlFor="login-email" className="text-[0.7rem] uppercase text-[var(--cre-o)] mb-2 block font-bold tracking-widest">Email</label>
            <input 
              id="login-email"
              required 
              type="email" 
              className="inp w-full h-12" 
              placeholder="tu@email.com"
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              disabled={isRateLimited}
            />
          </div>
          
          <div>
            <label htmlFor="login-password" className="text-[0.7rem] uppercase text-[var(--cre-o)] mb-2 block font-bold tracking-widest">Contraseña</label>
            <div className="relative">
              <input 
                id="login-password"
                required 
                type={showPassword ? "text" : "password"} 
                className="inp w-full h-12 pr-10" 
                placeholder="••••••••"
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                disabled={isRateLimited}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xl opacity-50 hover:opacity-100 transition-opacity"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isRateLimited}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {remainingAttempts !== null && remainingAttempts > 0 && (
            <p className="text-xs text-yellow-600 text-center">
              Intentos restantes: {remainingAttempts}
            </p>
          )}

          {isRateLimited && (
            <div className="text-red-500 text-sm bg-red-500/10 p-3 border border-red-500/20 rounded text-center">
              Demasiados intentos. Esperá unos minutos.
            </div>
          )}

          {error && !isRateLimited && (
            <div className="text-red-500 text-sm bg-red-500/10 p-3 border border-red-500/20 rounded text-center">{error}</div>
          )}

          <button disabled={loading || isRateLimited} className="btn btn-oro w-full h-14 text-xl cinzel font-black tracking-widest">
            {loading ? 'ACCEDIENDO...' : isRateLimited ? 'BLOQUEADO' : 'ENTRAR'}
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
