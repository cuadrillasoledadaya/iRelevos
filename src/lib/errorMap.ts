/**
 * Maps Supabase auth error messages to generic Spanish user-facing strings.
 * Prevents email enumeration by never revealing whether an email exists.
 */
export function mapAuthError(message: string): string {
  const lower = message.toLowerCase()

  // Invalid credentials, wrong email, wrong password — all map to same generic message
  if (
    lower.includes('invalid') ||
    lower.includes('credentials') ||
    lower.includes('email') ||
    lower.includes('password')
  ) {
    return 'Email o contraseña incorrectos'
  }

  // Don't reveal email confirmation status
  if (lower.includes('confirm') || lower.includes('verify')) {
    return 'Email o contraseña incorrectos'
  }

  // Rate limiting
  if (lower.includes('too many') || lower.includes('rate limit')) {
    return 'Demasiados intentos. Esperá unos minutos.'
  }

  // Catch-all for any other auth error
  return 'Ocurrió un error. Intentá de nuevo.'
}

/**
 * Generic error message for registration — never reveals details.
 */
export function mapRegisterError(): string {
  // Registration errors never reveal specifics (duplicate email, weak password, etc.)
  return 'Ocurrió un error. Intentá de nuevo.'
}
