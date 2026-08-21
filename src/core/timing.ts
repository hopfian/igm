// ⚠️ DOC-SYNC: Any changes to this file MUST be reflected in docs/core.md

/**
 * Generate a random delay drawn from a log-normal distribution.
 * Simulates human "bursty" behavior: many short pauses, occasional long ones.
 *
 * @param median  The median delay in ms (default 800)
 * @param sigma   Spread factor (higher = more variance, default 0.6)
 */
export function humanDelay(median: number = 800, sigma: number = 0.6): number {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    // Log-normal: exp(mu + sigma * z), where mu = ln(median)
    const mu = Math.log(median);
    const delay = Math.exp(mu + sigma * z);

    // Clamp to reasonable range: 200ms – 5000ms
    return Math.max(200, Math.min(5000, Math.round(delay)));
}
