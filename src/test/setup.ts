import '@testing-library/jest-dom'
import { vi } from 'vitest'

const mockSupabaseQuery = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  match: vi.fn().mockReturnThis(),
  selectSingle: vi.fn().mockReturnThis(),
}

// Mock de Supabase — incluye DB y Auth
vi.mock('@/lib/supabase', () => ({
  supabase: {
    // ── DB operations ──
    from: vi.fn(() => mockSupabaseQuery),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),

    // ── Auth operations ──
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}))

export { mockSupabaseQuery }
