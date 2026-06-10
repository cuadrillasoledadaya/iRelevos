import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
}))

// Mock supabase is already mocked in test/setup.ts
// We need to override getSession to return a resolved promise
function mockSession() {
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: null },
    error: null,
  })
  vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  } as any)
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

describe('useAuth signOut', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession()
    mockPush.mockClear()
  })

  it('calls supabase.auth.signOut with global scope', async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.signOut()
    })

    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'global' })
  })

  it('clears session, user, and profile state after signOut', async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.signOut()
    })

    expect(result.current.session).toBeNull()
    expect(result.current.user).toBeNull()
    expect(result.current.profile).toBeNull()
  })

  it('redirects to /login after signOut', async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.signOut()
    })

    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  it('clears state and redirects even if signOut throws an error', async () => {
    const networkError = new Error('Network error')
    vi.mocked(supabase.auth.signOut).mockRejectedValue(networkError)

    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.signOut()
    })

    expect(consoleSpy).toHaveBeenCalledWith('SignOut error:', networkError)
    expect(result.current.session).toBeNull()
    expect(result.current.user).toBeNull()
    expect(result.current.profile).toBeNull()
    expect(mockPush).toHaveBeenCalledWith('/login')

    consoleSpy.mockRestore()
  })
})
