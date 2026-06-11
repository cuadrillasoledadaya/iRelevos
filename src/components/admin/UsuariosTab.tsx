'use client'

import type { Profile, UserRole } from '@/hooks/useAuth'

interface UsuariosTabProps {
  usuarios: Profile[]
  loading: boolean
  onEliminar: (uid: string) => void
  onCambiarRol: (uid: string, rol: UserRole) => void
  onEditar: (uid: string) => void
}

export default function UsuariosTab({
  usuarios, loading, onEliminar, onCambiarRol, onEditar,
}: UsuariosTabProps) {
  if (loading) {
    return (
      <div className="p-8 text-center cinzel text-[var(--oro)] animate-pulse">
        Cargando usuarios...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {usuarios.map((u: Profile) => (
        <div key={u.id} className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-lg flex flex-col gap-3 relative">
          <div className="absolute top-2 right-2 flex items-center">
            <button
              onClick={() => onEditar(u.id)}
              className="text-blue-500 opacity-30 hover:opacity-100 p-2"
              title="Editar nombre/apodo"
            >
              ✏️
            </button>
            <button
              onClick={() => onEliminar(u.id)}
              className="text-red-500 opacity-30 hover:opacity-100 p-2"
              title="Eliminar perfil"
            >
              🗑️
            </button>
          </div>
          <div className="flex justify-between items-start pr-20">
            <div>
              <h3 className="font-bold text-[var(--cre)]">{u.nombre} {u.apellidos}</h3>
              <p className="text-xs text-[var(--oro)] font-bold uppercase tracking-widest">@{u.apodo || 'sin-apodo'}</p>
            </div>
            <span className={`text-[0.6rem] px-2 py-1 rounded font-black uppercase ${
              u.role === 'superadmin' ? 'bg-red-500/20 text-red-500' :
              u.role === 'capataz' ? 'bg-blue-500/20 text-blue-500' :
              'bg-green-500/20 text-green-500'
            }`}>
              {u.role}
            </span>
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1">
            {(['superadmin', 'capataz', 'auxiliar', 'costalero'] as UserRole[]).map(r => (
              <button
                key={r}
                onClick={() => onCambiarRol(u.id, r)}
                className={`text-[0.6rem] px-3 py-1.5 rounded border transition-all uppercase font-bold whitespace-nowrap ${
                  u.role === r
                    ? 'border-[var(--oro)] bg-[var(--oro)] text-black'
                    : 'border-[var(--border)] text-[var(--cre-o)] hover:border-[var(--oro)]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
