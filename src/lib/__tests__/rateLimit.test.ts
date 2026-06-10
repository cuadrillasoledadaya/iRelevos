import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { rateLimit } from '../rateLimit'

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows first request within limit', () => {
    const result = rateLimit('test-user-1', { limit: 3, windowMs: 60_000 })
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(2)
    expect(result.limit).toBe(3)
  })

  it('tracks remaining attempts across calls', () => {
    const id = 'test-user-2'
    const opts = { limit: 3, windowMs: 60_000 }

    const r1 = rateLimit(id, opts)
    expect(r1.success).toBe(true)
    expect(r1.remaining).toBe(2)

    const r2 = rateLimit(id, opts)
    expect(r2.success).toBe(true)
    expect(r2.remaining).toBe(1)

    const r3 = rateLimit(id, opts)
    expect(r3.success).toBe(true)
    expect(r3.remaining).toBe(0)
  })

  it('rejects requests after limit is exhausted', () => {
    const id = 'test-user-3'
    const opts = { limit: 2, windowMs: 60_000 }

    rateLimit(id, opts) // 1st
    rateLimit(id, opts) // 2nd (exhausted)

    const result = rateLimit(id, opts) // 3rd — should fail
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('resets after window expires', () => {
    const id = 'test-user-4'
    const opts = { limit: 2, windowMs: 60_000 }

    rateLimit(id, opts)
    rateLimit(id, opts) // exhausted

    // Should be rejected before window expires
    const beforeReset = rateLimit(id, opts)
    expect(beforeReset.success).toBe(false)

    // Advance time past the window
    vi.advanceTimersByTime(61_000)

    // Should succeed again with fresh window
    const afterReset = rateLimit(id, opts)
    expect(afterReset.success).toBe(true)
    expect(afterReset.remaining).toBe(1)
  })

  it('uses default limit of 10 when not specified', () => {
    const result = rateLimit('test-user-5')
    expect(result.limit).toBe(10)
    expect(result.remaining).toBe(9)
  })

  it('uses default window of 60s when not specified', () => {
    const id = 'test-user-6'

    // Exhaust default limit of 10
    for (let i = 0; i < 10; i++) {
      rateLimit(id)
    }

    const rejected = rateLimit(id)
    expect(rejected.success).toBe(false)

    // Advance past default 60s window
    vi.advanceTimersByTime(61_000)

    const afterReset = rateLimit(id)
    expect(afterReset.success).toBe(true)
  })

  it('returns resetAt timestamp for client-side countdown', () => {
    const now = Date.now()
    const id = 'test-user-7'
    const windowMs = 15 * 60 * 1000 // 15 minutes

    const result = rateLimit(id, { limit: 5, windowMs })
    expect(result.resetAt).toBeGreaterThan(now)
    expect(result.resetAt).toBeLessThanOrEqual(now + windowMs)
  })

  it('isolates different identifiers', () => {
    const opts = { limit: 1, windowMs: 60_000 }

    const userA = rateLimit('user-a', opts)
    expect(userA.success).toBe(true)

    const userA2 = rateLimit('user-a', opts)
    expect(userA2.success).toBe(false) // exhausted

    const userB = rateLimit('user-b', opts)
    expect(userB.success).toBe(true) // different user, fresh limit
  })
})
