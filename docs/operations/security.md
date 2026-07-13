# Security Operations Guide

This document covers operational procedures for production security features in irelevos.

---

## 1. Session Timeout Configuration

### Supabase Session Expiry (24h Inactivity)

Session expiry is configured at the **Supabase Dashboard** level, not in application code.

**Steps to configure:**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project
2. Navigate to **Authentication** → **Settings**
3. Scroll to **JWT Settings**
4. Set **Session expiry (in seconds)** to `86400` (24 hours)
5. Click **Save**

**Behavior:**

- Sessions expire after 24 hours of inactivity
- The Supabase client SDK (`@supabase/supabase-js`) auto-refreshes tokens while the user is active
- After expiry, the user is forced to re-authenticate
- The middleware (`src/middleware.ts`) redirects expired sessions to `/login` with the original destination preserved as `?redirect=` parameter

**Verification:**

```bash
# Check session expiry via Supabase API (requires service_role key)
curl -s "https://<project-ref>.supabase.co/auth/v1/settings" \
  -H "apikey: <service_role_key>" \
  -H "Authorization: Bearer <service_role_key>"
```

---

## 2. Rate Limiting

### Current Implementation: In-Memory Map

The rate limiter (`src/lib/rateLimit.ts`) uses an in-memory `Map` to track request counts per identifier.

**Configuration:**

| Route | Limit | Window |
|-------|-------|--------|
| Login | 5 attempts | 15 minutes |
| API routes | 10 attempts | 1 minute (configurable) |

**Known Limitations:**

1. **Serverless cold start resets**: The in-memory Map is wiped on every cold start. On Vercel/Netlify, this means rate limits are not persistent across server restarts.
2. **No horizontal scaling**: Each serverless instance has its own counter. Multiple instances = multiplied rate limits.
3. **Memory growth**: Old entries are not automatically pruned. In high-traffic scenarios, the Map grows unbounded.

### Production Recommendation: Redis / Vercel KV

For production deployments, replace the in-memory rate limiter with a distributed state store:

**Option A: Vercel KV (recommended for Vercel deployments)**

```bash
npm install @vercel/kv
```

```typescript
// src/lib/rateLimit.ts (production version)
import { kv } from '@vercel/kv'

export async function rateLimit(identifier: string, options: { limit: number; windowMs: number }) {
  const key = `ratelimit:${identifier}`
  const count = await kv.incr(key)
  if (count === 1) {
    await kv.expire(key, Math.ceil(options.windowMs / 1000))
  }
  return { success: count <= options.limit, remaining: Math.max(0, options.limit - count), resetAt: Date.now() + options.windowMs }
}
```

**Option B: Redis**

```bash
npm install ioredis
```

Use the same pattern as Vercel KV but with a Redis client. Connect via `REDIS_URL` environment variable.

---

## 3. JWT Secret Rotation

Supabase generates a JWT secret automatically for your project. Rotation is a **manual operational step**.

### Why Rotate?

- If the secret is ever exposed (e.g., committed to git, leaked in logs)
- As part of a regular security rotation schedule (recommended: every 90 days)
- After a team member leaves the project

### Rotation Procedure

1. **Generate new secret** in Supabase Dashboard:
   - Go to **Project Settings** → **API** → **JWT Settings**
   - Click **Rotate JWT Secret**
   - Copy the new secret

2. **Update environment variables**:
   ```bash
   # .env.local (development)
   SUPABASE_SERVICE_ROLE_KEY=<new-service-role-key>

   # Vercel Dashboard → Project Settings → Environment Variables
   SUPABASE_SERVICE_ROLE_KEY=<new-service-role-key>
   ```

3. **Deploy** the application with the new secret:
   ```bash
   vercel --prod
   ```

4. **Verify** authentication still works:
   - Log in with a test account
   - Confirm protected routes are accessible
   - Confirm signOut works

5. **Invalidate old sessions** (optional but recommended):
   - Go to **Authentication** → **Users** in Supabase Dashboard
   - Use the **Sign out all users** option if available
   - Or wait for existing sessions to expire (24h)

### Important Notes

- The `NEXT_PUBLIC_SUPABASE_ANON_KEY` does NOT need to change during JWT rotation
- Only the `SUPABASE_SERVICE_ROLE_KEY` (server-side) is affected
- During the rotation window, users with active sessions will continue to work until their session expires or they make a request that requires server-side validation

---

## 4. Security Headers

Security headers are configured in `next.config.mjs` and applied globally.

### Current Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ...` | Restricts resource loading |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Forces HTTPS |
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer info |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Restricts browser features |

### Verification

```bash
curl -I https://your-domain.com
```

Check that all headers are present in the response.

### Tightening CSP

The current CSP allows `'unsafe-inline'` and `'unsafe-eval'` for compatibility with Next.js. To tighten:

1. Audit all inline scripts and styles
2. Move inline code to external files
3. Use CSP nonces or hashes for remaining inline scripts
4. Remove `'unsafe-inline'` and `'unsafe-eval'` from the CSP header

---

## 5. Route Protection

### Middleware (`src/middleware.ts`)

The middleware uses `@supabase/ssr` `createServerClient` to perform a server-side auth check via `getUser()`, which re-validates the JWT against Supabase (defends against tampered cookies). Unauthenticated users on protected routes are redirected to `/login` with a `?redirect=` parameter.

**Authentication mechanism**: HTTP cookies managed by `@supabase/ssr` (not localStorage). The browser client (`createBrowserClient`) writes cookies automatically on auth state changes. The server client (`createServerClient` in `src/lib/supabase/server.ts`) reads and propagates cookies via `getAll`/`setAll`.

**Public routes** (no auth required): `/login`, `/register`

**Protected routes** (auth required): `/`, `/admin/*`, `/plan/*`, `/equipo/*`, `/dashboard/*`

**Static asset bypass**: `_next/*`, `/api/*`, `/favicon*`, `/sw.js`, `/manifest.json`, `/workbox-*.js`, and files with static extensions (`.ico`, `.png`, `.jpg`, `.jpeg`, `.svg`, `.css`, `.js`, `.woff2`) skip auth checks.

### Adding New Routes

- **Public route**: Add to `PUBLIC_PATHS` array in `src/middleware.ts`
- **Protected route**: Add prefix to `PROTECTED_PREFIXES` array
- **Static asset**: Extend `isStaticAsset()` if needed (PWA assets already covered)
- **API route**: API routes are passed through by the middleware but should implement their own auth checks (see API hardening)

### Login Flow

1. User submits credentials on `/login`
2. Rate limit check via `/api/auth/login` (5 attempts per 15 minutes)
3. `supabase.auth.signInWithPassword` called directly — browser client writes session cookies automatically
4. No `setSession` call needed (localStorage migration complete)
5. Redirect to `/` with `router.refresh()` to trigger middleware re-evaluation

### SignOut Cleanup

`useAuth.signOut()` defensively removes all `sb-*` keys from localStorage (pre-migration residue) wrapped in try/catch. The Supabase SDK clears cookies automatically on `signOut({ scope: 'global' })`.

---

## 6. API Hardening

All API routes should implement the following defense chain:

1. **Body size check** (`checkBodySize`) — prevents oversized payloads
2. **Rate limiting** (`rateLimit`) — prevents abuse
3. **CORS** (`withCors`) — restricts cross-origin requests
4. **Input validation** (`isValidUUID`, etc.) — validates request data
5. **Authentication** (`authenticateAdmin` or equivalent) — verifies identity
6. **Structured logging** (`logger`) — records operations for audit
7. **Generic error messages** — never expose stack traces or internal details

### Adding a New API Route

Follow this pattern:

```typescript
import { checkBodySize, rateLimit } from '@/lib/rateLimit'
import { withCors, jsonResponse } from '@/lib/apiHelpers'
import { isValidUUID } from '@/lib/validation'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    // 1. Body size
    await checkBodySize(request, 1_000_000) // 1MB

    // 2. Rate limit
    const rl = rateLimit(request.headers.get('x-forwarded-for') ?? 'anonymous')
    if (!rl.success) return withCors(jsonResponse({ error: 'Too many requests' }, { status: 429 }), request)

    // 3. Parse & validate
    const body = await request.json()
    if (!isValidUUID(body.id)) return withCors(jsonResponse({ error: 'Invalid request' }, { status: 400 }), request)

    // 4. Operation
    // ... your logic ...

    // 5. Log
    logger.info({ event: 'operation_completed', id: body.id })

    return withCors(jsonResponse({ success: true }), request)
  } catch (err) {
    logger.error({ event: 'operation_failed', error: err instanceof Error ? err.message : 'Unknown' })
    return withCors(jsonResponse({ error: 'Internal error' }, { status: 500 }), request)
  }
}
```

---

## 7. Incident Response

### Suspected Brute Force Attack

1. Check Supabase Dashboard → **Authentication** → **Logs** for failed login attempts
2. If using Vercel, check **Logs** for 429 responses
3. Consider temporarily tightening rate limits in `src/lib/rateLimit.ts`
4. Report to Supabase if the attack is distributed

### Compromised Account

1. Sign out all sessions in Supabase Dashboard
2. Reset the user's password
3. Review audit logs for unauthorized actions
4. Notify the user

### Leaked API Key

1. Rotate the affected key immediately (see JWT rotation procedure above)
2. Check logs for unauthorized usage
3. Update all environment variables and redeploy

---

## 8. Audit Checklist

Run this checklist before each production deployment:

- [ ] All security headers present (verify with `curl -I`)
- [ ] Rate limiting active on login and API routes
- [ ] Session expiry configured at 24h in Supabase Dashboard
- [ ] No raw error messages exposed in API responses
- [ ] Middleware redirects unauthenticated users correctly
- [ ] All API routes implement the defense chain (body size → rate limit → CORS → validation → auth → logging)
- [ ] `.env.local` is in `.gitignore` and not committed
- [ ] JWT secret has not been exposed in git history
- [ ] Dependencies are up to date (`npm audit`)
