// ⚠️ DOC-SYNC: Any changes to this file MUST be reflected in docs/core.md

let gotScrapingModule: any = null;
let gotScrapingLoaded = false;

/**
 * Lazy-load got-scraping (ESM-only module) via dynamic import.
 * Uses Function trick to prevent tsc from transforming import() to require().
 * Falls back to axios if got-scraping is unavailable.
 */
async function getGotScraping(): Promise<any> {
	if (gotScrapingLoaded) return gotScrapingModule;
	gotScrapingLoaded = true;
	try {
		// tsc compiles `import(...)` to `require(...)` in CJS mode.
		// We use Function() to generate a true runtime import() that tsc cannot touch.
		const dynamicImport = new Function("specifier", "return import(specifier)");
		gotScrapingModule = await dynamicImport("got-scraping");
		return gotScrapingModule;
	} catch {
		// Fallback: got-scraping not installed or import failed
		return null;
	}
}

export interface ExecuteResponse {
	data: any;
	newClaim?: string;
	setCookies?: string[];
}

/**
 * Execute a single request using got-scraping (preferred) or axios (fallback).
 *
 *  Layer 1: got-scraping provides Chrome TLS fingerprint impersonation
 *  Layer 2: got-scraping provides HTTP/2 with correct SETTINGS frames
 */
export async function executeRequest(
	url: string,
	method: string,
	headers: Record<string, string>,
	body?: string,
): Promise<ExecuteResponse> {
	const gotModule = await getGotScraping();

	if (gotModule) {
		// ─── Primary path: got-scraping with Chrome impersonation ───
		const { gotScraping } = gotModule;

		const options: any = {
			url,
			method: method.toUpperCase(),
			headers,
			// Use Chrome TLS fingerprint but DON'T auto-generate headers
			// (we provide our own consistent header set above)
			headerGeneratorOptions: {
				browsers: [{ name: "chrome", minVersion: 128, maxVersion: 131 }],
				operatingSystems: ["windows"],
			},
			useHeaderGenerator: false,
			timeout: { request: 30000 },
			throwHttpErrors: false,
		};

		if (body) {
			options.body = body;
		}

		const response = await gotScraping(options);

		let newClaim: string | undefined;
		// Layer 4: Capture dynamic claim token from response
		const claimHeader = response.headers["x-ig-set-www-claim"];
		if (claimHeader && typeof claimHeader === "string" && claimHeader !== "0") {
			newClaim = claimHeader;
		}

		let setCookies: string[] | undefined;
		if (Array.isArray(response.headers["set-cookie"])) {
			setCookies = response.headers["set-cookie"];
		} else if (typeof response.headers["set-cookie"] === "string") {
			setCookies = [response.headers["set-cookie"]];
		}

		if (response.statusCode >= 400) {
			const error: any = new Error(`API Error ${response.statusCode}`);
			error.statusCode = response.statusCode;
			error.headers = response.headers;
			error.body = response.body;
			throw error;
		}

		let data;
		try {
			data = JSON.parse(response.body);
		} catch {
			data = response.body;
		}

		return { data, newClaim, setCookies };
	} else {
		// ─── Fallback path: axios (no TLS impersonation) ───
		const axios = (await import("axios")).default;

		const axiosConfig: any = {
			url,
			method,
			headers,
			timeout: 30000,
		};

		if (body) {
			axiosConfig.data = body;
		}

		const response = await axios.request(axiosConfig);

		let newClaim: string | undefined;
		// Layer 4: Capture dynamic claim
		const claimHeader = response.headers["x-ig-set-www-claim"];
		if (claimHeader && typeof claimHeader === "string" && claimHeader !== "0") {
			newClaim = claimHeader;
		}

		let setCookies: string[] | undefined;
		if (Array.isArray(response.headers["set-cookie"])) {
			setCookies = response.headers["set-cookie"];
		} else if (typeof response.headers["set-cookie"] === "string") {
			setCookies = [response.headers["set-cookie"]];
		}

		return { data: response.data, newClaim, setCookies };
	}
}
