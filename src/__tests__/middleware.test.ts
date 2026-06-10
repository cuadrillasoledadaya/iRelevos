import { describe, it, expect } from 'vitest'
import { isProtectedRoute, isPublicRoute, isStaticAsset } from '@/middleware'

describe('isProtectedRoute', () => {
  it('returns true for home path', () => {
    expect(isProtectedRoute('/')).toBe(true)
  })

  it('returns true for admin routes', () => {
    expect(isProtectedRoute('/admin')).toBe(true)
    expect(isProtectedRoute('/admin/')).toBe(true)
    expect(isProtectedRoute('/admin/users')).toBe(true)
    expect(isProtectedRoute('/admin/settings/general')).toBe(true)
  })

  it('returns true for plan routes', () => {
    expect(isProtectedRoute('/plan')).toBe(true)
    expect(isProtectedRoute('/plan/2024')).toBe(true)
  })

  it('returns true for equipo routes', () => {
    expect(isProtectedRoute('/equipo')).toBe(true)
    expect(isProtectedRoute('/equipo/list')).toBe(true)
  })

  it('returns true for dashboard routes', () => {
    expect(isProtectedRoute('/dashboard')).toBe(true)
    expect(isProtectedRoute('/dashboard/stats')).toBe(true)
  })

  it('returns false for login', () => {
    expect(isProtectedRoute('/login')).toBe(false)
  })

  it('returns false for register', () => {
    expect(isProtectedRoute('/register')).toBe(false)
  })

  it('returns false for unknown paths', () => {
    expect(isProtectedRoute('/about')).toBe(false)
    expect(isProtectedRoute('/contact')).toBe(false)
  })
})

describe('isPublicRoute', () => {
  it('returns true for login', () => {
    expect(isPublicRoute('/login')).toBe(true)
  })

  it('returns true for register', () => {
    expect(isPublicRoute('/register')).toBe(true)
  })

  it('returns false for protected routes', () => {
    expect(isPublicRoute('/')).toBe(false)
    expect(isPublicRoute('/admin')).toBe(false)
    expect(isPublicRoute('/dashboard')).toBe(false)
  })
})

describe('isStaticAsset', () => {
  it('returns true for _next paths', () => {
    expect(isStaticAsset('/_next/static/chunks/main.js')).toBe(true)
    expect(isStaticAsset('/_next/image')).toBe(true)
  })

  it('returns true for api paths', () => {
    expect(isStaticAsset('/api/auth/login')).toBe(true)
    expect(isStaticAsset('/api/admin/delete-user')).toBe(true)
  })

  it('returns true for favicon', () => {
    expect(isStaticAsset('/favicon.ico')).toBe(true)
  })

  it('returns true for static file extensions', () => {
    expect(isStaticAsset('/logo.png')).toBe(true)
    expect(isStaticAsset('/styles.css')).toBe(true)
    expect(isStaticAsset('/app.js')).toBe(true)
    expect(isStaticAsset('/font.woff2')).toBe(true)
  })

  it('returns false for page routes', () => {
    expect(isStaticAsset('/')).toBe(false)
    expect(isStaticAsset('/login')).toBe(false)
    expect(isStaticAsset('/admin/users')).toBe(false)
  })
})
