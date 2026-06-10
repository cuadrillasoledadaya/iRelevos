import { describe, it, expect } from 'vitest'
import { mapAuthError, mapRegisterError } from '../errorMap'

describe('mapAuthError', () => {
  it('maps invalid credentials to generic message', () => {
    expect(mapAuthError('Invalid login credentials')).toBe(
      'Email o contraseña incorrectos',
    )
  })

  it('maps invalid email to generic message', () => {
    expect(mapAuthError('Invalid email')).toBe('Email o contraseña incorrectos')
  })

  it('maps wrong password to generic message', () => {
    expect(mapAuthError('Invalid password')).toBe(
      'Email o contraseña incorrectos',
    )
  })

  it('maps invalid credentials variant to generic message', () => {
    expect(mapAuthError('Invalid login credentials.')).toBe(
      'Email o contraseña incorrectos',
    )
  })

  it('maps email not confirmed to generic message (no enumeration)', () => {
    expect(mapAuthError('Email not confirmed')).toBe(
      'Email o contraseña incorrectos',
    )
  })

  it('maps email verification required to generic message', () => {
    expect(mapAuthError('Email not verified')).toBe(
      'Email o contraseña incorrectos',
    )
  })

  it('maps too many requests to rate limit message', () => {
    expect(mapAuthError('Too many requests')).toBe(
      'Demasiados intentos. Esperá unos minutos.',
    )
  })

  it('maps rate limit exceeded to rate limit message', () => {
    expect(mapAuthError('Rate limit exceeded')).toBe(
      'Demasiados intentos. Esperá unos minutos.',
    )
  })

  it('maps unknown errors to catch-all message', () => {
    expect(mapAuthError('Something went wrong')).toBe(
      'Ocurrió un error. Intentá de nuevo.',
    )
  })

  it('maps empty string to catch-all message', () => {
    expect(mapAuthError('')).toBe('Ocurrió un error. Intentá de nuevo.')
  })

  it('is case-insensitive', () => {
    expect(mapAuthError('INVALID LOGIN CREDENTIALS')).toBe(
      'Email o contraseña incorrectos',
    )
    expect(mapAuthError('TOO MANY REQUESTS')).toBe(
      'Demasiados intentos. Esperá unos minutos.',
    )
  })
})

describe('mapRegisterError', () => {
  it('always returns generic message regardless of error', () => {
    expect(mapRegisterError('User already registered')).toBe(
      'Ocurrió un error. Intentá de nuevo.',
    )
    expect(mapRegisterError('Password is too weak')).toBe(
      'Ocurrió un error. Intentá de nuevo.',
    )
    expect(mapRegisterError('Email already exists')).toBe(
      'Ocurrió un error. Intentá de nuevo.',
    )
    expect(mapRegisterError('Any error message')).toBe(
      'Ocurrió un error. Intentá de nuevo.',
    )
  })
})
