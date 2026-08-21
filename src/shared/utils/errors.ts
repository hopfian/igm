import pino from "pino";
import { clearActiveSpinner } from "../../shared/ui/spinner.js";

// Setup centralized logger
export const logger = pino({
	level: process.env.LOG_LEVEL || "info",
	transport: {
		target: "pino-pretty",
		options: {
			colorize: true,
			ignore: "pid,hostname",
		},
	},
});

/**
 * Centralized error handler for commands.
 * Clears any active spinner, logs the error, and exits.
 */
export function handleError(e: any): never {
	clearActiveSpinner();
	if (e instanceof InstagramAuthError) {
		logger.error(`Authentication Failed: ${e.message}`);
	} else if (e instanceof InstagramRateLimitError) {
		logger.error(
			`Rate Limited: ${e.message}. Retry after: ${e.resetAt || "unknown"}`,
		);
	} else if (e.name === "ZodError") {
		logger.error(
			`Validation Error: API payload did not match expected schema.`,
		);
		logger.debug(e);
	} else {
		logger.fatal(`Fatal: ${e.message}`);
	}
	process.exit(1);
}

/**
 * Custom error classes for igm API interactions.
 */

export class InstagramAuthError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "InstagramAuthError";
	}
}

export class InstagramRateLimitError extends Error {
	public resetAt?: number;
	constructor(message: string, resetAt?: number) {
		super(message);
		this.name = "InstagramRateLimitError";
		this.resetAt = resetAt;
	}
}

export class InstagramParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "InstagramParseError";
	}
}
