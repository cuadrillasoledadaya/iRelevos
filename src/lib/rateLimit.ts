interface RateLimitEntry {
	count: number;
	resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
	success: boolean;
	limit: number;
	remaining: number;
	resetAt: number;
}

/**
 * Simple in-memory rate limiter.
 * For multi-instance deployments (Vercel, etc.), replace with Redis/Vercel KV.
 */
export function rateLimit(
	identifier: string,
	options: { limit?: number; windowMs?: number } = {},
): RateLimitResult {
	const limit = options.limit ?? 10;
	const windowMs = options.windowMs ?? 60_000; // 1 minute
	const now = Date.now();
	const entry = store.get(identifier);

	if (!entry || now > entry.resetAt) {
		// New window
		const newEntry: RateLimitEntry = { count: 1, resetAt: now + windowMs };
		store.set(identifier, newEntry);
		return {
			success: true,
			limit,
			remaining: limit - 1,
			resetAt: newEntry.resetAt,
		};
	}

	if (entry.count >= limit) {
		return { success: false, limit, remaining: 0, resetAt: entry.resetAt };
	}

	entry.count += 1;
	return {
		success: true,
		limit,
		remaining: limit - entry.count,
		resetAt: entry.resetAt,
	};
}

/** Clean up expired entries periodically to prevent memory leaks */
setInterval(() => {
	const now = Date.now();
	store.forEach((entry, key) => {
		if (now > entry.resetAt) {
			store.delete(key);
		}
	});
}, 60_000);
