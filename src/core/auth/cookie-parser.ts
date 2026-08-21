// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/core.md (§ auth.ts — Authentication)
//     If cookie parsing logic, format support, or exports change, update the docs.
import * as fs from "fs";

export function loadCookies(cookieSource: string = "cookies.txt"): string {
	if (cookieSource.includes("=") && !cookieSource.endsWith(".txt")) {
		// It's already a raw cookie string
		return cookieSource;
	}

	if (!fs.existsSync(cookieSource)) {
		throw new Error(
			`Cookie file '${cookieSource}' not found. Please provide valid Instagram cookies or login via 'igm auth login'.`,
		);
	}

	const content = fs.readFileSync(cookieSource, "utf8");
	const lines = content.split("\n");

	const cookies: string[] = [];

	for (const line of lines) {
		if (
			(line.startsWith("#") && !line.startsWith("#HttpOnly_")) ||
			line.trim() === ""
		)
			continue;

		const parts = line.split("\t");
		if (parts.length >= 7) {
			const name = parts[5];
			const value = parts[6].trim();
			cookies.push(`${name}=${value}`);
		}
	}

	return cookies.join("; ");
}

export function extractCsrfToken(cookieString: string): string {
	const match = cookieString.match(/csrftoken=([^;]+)/);
	return match ? match[1] : "";
}

/**
 * Merge an array of Set-Cookie headers into an existing cookie string.
 */
export function mergeCookies(
	existingCookies: string,
	setCookieHeaders: string[],
): string {
	if (!setCookieHeaders || setCookieHeaders.length === 0) {
		return existingCookies;
	}

	// Parse existing
	const cookieMap = new Map<string, string>();
	if (existingCookies) {
		const pairs = existingCookies.split(";");
		for (const pair of pairs) {
			const trimmed = pair.trim();
			if (!trimmed) continue;
			const idx = trimmed.indexOf("=");
			if (idx === -1) continue;
			const key = trimmed.substring(0, idx).trim();
			const val = trimmed.substring(idx + 1).trim();
			cookieMap.set(key, val);
		}
	}

	// Parse new
	for (const header of setCookieHeaders) {
		const parts = header.split(";");
		const primaryPair = parts[0].trim();
		const idx = primaryPair.indexOf("=");
		if (idx !== -1) {
			const key = primaryPair.substring(0, idx).trim();
			const val = primaryPair.substring(idx + 1).trim();
			
			// Handle deletion (Instagram sends Max-Age=0 or Expires in past to delete cookies)
			if (val === '""' || val === "") {
				cookieMap.delete(key);
			} else {
				cookieMap.set(key, val);
			}
		}
	}

	// Serialize back
	const merged: string[] = [];
	for (const [key, val] of cookieMap.entries()) {
		merged.push(`${key}=${val}`);
	}
	return merged.join("; ");
}
