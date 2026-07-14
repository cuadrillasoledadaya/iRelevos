import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('middleware.ts: no next/headers import (REQ-16)', () => {
  it('does NOT import from next/headers in middleware.ts', () => {
    const middlewarePath = resolve(process.cwd(), 'src/middleware.ts')
    const content = readFileSync(middlewarePath, 'utf-8')
    const lines = content.split('\n')

    const offendingLines: number[] = []
    for (let i = 0; i < lines.length; i++) {
      if (/from\s+['"]next\/headers['"]/.test(lines[i])) {
        offendingLines.push(i + 1) // 1-indexed
      }
    }

    expect(offendingLines).toEqual([])
  })
})
