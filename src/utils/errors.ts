import chalk from 'chalk';
import { clearActiveSpinner } from '../ui/spinner';

/**
 * Centralized error handler for commands.
 * Clears any active spinner, prints a styled error, and exits.
 */
export function handleError(e: any): never {
    clearActiveSpinner();
    console.error(`  ${chalk.red('✗')} ${chalk.red(`fatal: ${e.message}`)}`);
    process.exit(1);
}

/**
 * Custom error classes for igm.
 */

export class AuthError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthError';
    }
}

export class RateLimitError extends Error {
    public resetAt?: number;
    constructor(message: string, resetAt?: number) {
        super(message);
        this.name = 'RateLimitError';
        this.resetAt = resetAt;
    }
}

export class ParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ParseError';
    }
}
