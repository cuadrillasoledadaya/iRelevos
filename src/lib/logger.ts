/**
 * Production-safe logger.
 * All log calls are stripped in production builds.
 * Migrate existing console.log/console.error calls to these helpers.
 */
const isDev = process.env.NODE_ENV !== "production";

export const logger = {
	log: (...args: unknown[]) => {
		if (isDev) console.log(...args);
	},
	error: (...args: unknown[]) => {
		if (isDev) console.error(...args);
	},
	warn: (...args: unknown[]) => {
		if (isDev) console.warn(...args);
	},
	info: (...args: unknown[]) => {
		if (isDev) console.info(...args);
	},
};
