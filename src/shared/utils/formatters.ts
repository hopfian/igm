// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/utils.md (§ parsers.ts — Formatting & Parsing)
//     If parsing/formatting utilities are added or signatures change, update the method tables.
/**
 * Time and formatting utilities.
 */

/**
 * Convert a Unix timestamp into a human-readable relative time string.
 */
export function timeAgo(unixTs: number): string {
	const now = Math.floor(Date.now() / 1000);
	const diff = now - unixTs;

	if (diff < 60) return `${diff}s ago`;
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
	if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
	if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
	if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;

	return new Date(unixTs * 1000).toLocaleDateString();
}

/**
 * Format a large number with commas for display.
 */
export function formatNumber(n: number): string {
	if (n >= 1_000_000)
		return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
	if (n >= 10_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
	return n.toLocaleString();
}

/**
 * Sanitize an Instagram post URL or shortcode into a clean shortcode.
 */
export function sanitizeInput(input: string): string {
	if (/^\d{15,}$/.test(input)) return input;

	const match = input.match(/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
	if (match) return match[1];

	return input;
}

/**
 * Convert an Instagram shortcode to a numeric media ID.
 */
export function shortcodeToId(shortcode: string): string {
	const alphabet =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
	let id = 0n;
	for (let i = 0; i < shortcode.length; i++) {
		id = id * 64n + BigInt(alphabet.indexOf(shortcode[i]));
	}
	return id.toString();
}

/**
 * Truncate a string to a max length with ellipsis.
 */
export function truncate(str: string, maxLen: number): string {
	if (str.length <= maxLen) return str;
	return str.substring(0, maxLen - 3) + "...";
}

/**
 * Get the terminal width, with a safe fallback.
 */
export function termWidth(): number {
	return process.stdout.columns || 80;
}

/**
 * Map IG media_type number to a human-readable label.
 */
export function mediaTypeLabel(type?: number): string {
	switch (type) {
		case 1:
			return "🖼️ Photo";
		case 2:
			return "🎬 Video";
		case 8:
			return "📸 Carousel";
		default:
			return "📎 Media";
	}
}
