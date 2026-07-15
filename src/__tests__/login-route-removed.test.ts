import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import { join } from 'path'

describe('Login route removal', () => {
  it('should not have /api/auth/login/route.ts file', () => {
    const routePath = join(process.cwd(), 'src/app/api/auth/login/route.ts')
    expect(existsSync(routePath)).toBe(false)
  })

  it('should not have /api/auth/login/ directory', () => {
    const dirPath = join(process.cwd(), 'src/app/api/auth/login')
    expect(existsSync(dirPath)).toBe(false)
  })
})
