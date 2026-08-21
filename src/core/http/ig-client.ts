// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/core.md (§ client.ts — HTTP Client)
//     If retry logic, headers, rate-limit handling, or constructor params change, update the docs.

import chalk from "chalk";
import { clearActiveSpinner } from "../../shared/ui/spinner";
import {
	extractCsrfToken,
	loadCookies,
	mergeCookies,
} from "../auth/cookie-parser";
import { type IGMConfig, loadConfig } from "../config/config-manager";
import { humanDelay } from "../timing/human-delay";
import { fetchRolloutHash } from "./headers";
import { executeRequest } from "./request";

// ─── Main Client ─────────────────────────────────────────────────────────────

export class IGClient {
	private cookieString: string;
	private csrfToken: string;
	private retryAttempts: number;
	private retryDelayMs: number;
	private config: IGMConfig;

	// Layer 3: Dynamic values (refreshed on first call)
	private rolloutHash: string = "1039665806";
	private asbdId: string = "198387";
	private wwwClaim: string = "0";
	private rolloutRefreshed: boolean = false;

	// Layer 5: Timing state
	private lastRequestTime: number = 0;
	private requestCount: number = 0;
	private sessionStart: number = Date.now();

	constructor(profileOverride?: string) {
		this.config = loadConfig();

		const profileName = profileOverride || this.config.activeProfile;
		let cookieSource = this.config.cookieFile;
		if (profileName !== "local" && this.config.profiles[profileName]) {
			cookieSource = this.config.profiles[profileName];
		}

		try {
			this.cookieString = loadCookies(cookieSource);
		} catch (_e) {
			this.cookieString = "";
		}

		this.csrfToken = extractCsrfToken(this.cookieString);
		this.retryAttempts = this.config.retryAttempts;
		this.retryDelayMs = this.config.retryDelayMs;
	}

	public getCookies(): string {
		return this.cookieString;
	}

	public updateCookies(setCookies: string[]): void {
		this.cookieString = mergeCookies(this.cookieString, setCookies);
		const newCsrf = extractCsrfToken(this.cookieString);
		if (newCsrf) this.csrfToken = newCsrf;
	}

	/**
	 * Layer 3: Refresh dynamic rollout values from Instagram homepage.
	 * Only runs once per session (first API call).
	 */
	private async refreshRollout(): Promise<void> {
		if (this.rolloutRefreshed) return;
		this.rolloutRefreshed = true;

		const values = await fetchRolloutHash();
		if (values) {
			this.rolloutHash = values.rolloutHash;
			this.asbdId = values.asbdId;
		}
	}

	/**
	 * Layer 3: Build the full header set for a Chrome-like request.
	 * Includes Sec-CH-UA Client Hints, Sec-Fetch-* metadata, and dynamic rollout values.
	 */
	private buildHeaders(
		_method: string,
		isPost: boolean,
	): Record<string, string> {
		const headers: Record<string, string> = {
			// ─── Standard browser headers ───
			Accept: "*/*",
			"Accept-Language": "en-US,en;q=0.9",
			Referer: "https://www.instagram.com/",

			// ─── Chrome Client Hints (Layer 3) ───
			"Sec-CH-UA":
				'"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
			"Sec-CH-UA-Mobile": "?0",
			"Sec-CH-UA-Platform": '"Windows"',

			// ─── Fetch Metadata (Layer 3) ───
			"Sec-Fetch-Site": "same-origin",
			"Sec-Fetch-Mode": "cors",
			"Sec-Fetch-Dest": "empty",

			// ─── Browser identity ───
			"User-Agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",

			// ─── Instagram-specific headers ───
			"X-CSRFToken": this.csrfToken,
			"X-IG-App-ID": "936619743392459",
			"X-ASBD-ID": this.asbdId,
			"X-IG-WWW-Claim": this.wwwClaim,
			"X-Instagram-AJAX": this.rolloutHash,
			"X-Requested-With": "XMLHttpRequest",

			// ─── Session ───
			Cookie: this.cookieString,
		};

		if (isPost) {
			headers["Content-Type"] = "application/x-www-form-urlencoded";
		}

		return headers;
	}

	/**
	 * Layer 5: Enforce human-like timing between requests.
	 * Uses log-normal distribution — many short waits, occasional longer ones.
	 */
	private async enforceHumanTiming(): Promise<void> {
		if (this.lastRequestTime === 0) {
			this.lastRequestTime = Date.now();
			return;
		}

		const elapsed = Date.now() - this.lastRequestTime;
		const delay = humanDelay(800, 0.6);

		if (elapsed < delay) {
			const wait = delay - elapsed;
			await this.sleep(wait);
		}

		this.lastRequestTime = Date.now();
		this.requestCount++;

		// Layer 5: Velocity check — warn if approaching rate limits
		const sessionMinutes = (Date.now() - this.sessionStart) / 60000;
		const rpm = this.requestCount / Math.max(1, sessionMinutes);
		if (rpm > 40) {
			clearActiveSpinner();
			console.error(
				chalk.yellow(
					`  ⚠ High request rate (${rpm.toFixed(0)} req/min). Adding cooldown...`,
				),
			);
			await this.sleep(3000 + Math.random() * 2000);
		}
	}

	/**
	 * Make an API call with all 7 layers of hardening:
	 *  L1: Chrome TLS impersonation (got-scraping)
	 *  L2: HTTP/2 (got-scraping)
	 *  L3: Full header suite + dynamic rollout values
	 *  L4: Real session cookies (unchanged)
	 *  L5: Human-like timing with log-normal delays
	 *  L6: N/A (human-driven CLI)
	 *  L7: N/A (account-dependent)
	 */
	public async apiCall(
		endpoint: string,
		method: string = "GET",
		data?: any,
		params?: any,
	): Promise<any> {
		// Layer 3: Ensure we have fresh rollout values
		await this.refreshRollout();

		// Layer 5: Human-like inter-request delay
		await this.enforceHumanTiming();

		const isPost = method.toUpperCase() === "POST";
		const headers = this.buildHeaders(method, isPost);

		// Resolve full URL
		let url: string;
		if (endpoint.startsWith("http")) {
			url = endpoint;
		} else {
			url = `https://www.instagram.com/api/v1/${endpoint.replace(/^\/+/, "")}`;
		}

		// Build query string for GET params
		if (params) {
			const qs = new URLSearchParams(params).toString();
			url += (url.includes("?") ? "&" : "?") + qs;
		}

		// Build body for POST
		let body: string | undefined;
		if (isPost && data) {
			body = new URLSearchParams(data).toString();
		}

		let lastError: Error | null = null;

		for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
			try {
				const response = await executeRequest(url, method, headers, body);

				// Update claim if provided
				if (response.newClaim) {
					this.wwwClaim = response.newClaim;
				}

				if (response.setCookies && response.setCookies.length > 0) {
					this.updateCookies(response.setCookies);
				}

				return response.data;
			} catch (error: any) {
				lastError = error;

				const status = error.statusCode || error.response?.status;

				// Auth failure — don't retry
				if (status === 401 || status === 403) {
					clearActiveSpinner();
					throw new Error(
						`Authentication failed (${status}). Re-export your cookies.`,
					);
				}

				// Challenge required — special Instagram defense
				if (
					error.body?.includes?.("challenge_required") ||
					error.message?.includes?.("challenge_required")
				) {
					clearActiveSpinner();
					throw new Error(
						"Instagram challenge required. Open Instagram in your browser, complete the challenge, then re-export cookies.",
					);
				}

				// Rate limited — wait and retry
				if (status === 429) {
					const retryAfter = parseInt(
						error.headers?.["retry-after"] || "60",
						10,
					);
					if (attempt < this.retryAttempts) {
						clearActiveSpinner();
						console.error(
							chalk.yellow(
								`  ⚠ Rate limited. Waiting ${retryAfter}s... (attempt ${attempt}/${this.retryAttempts})`,
							),
						);
						await this.sleep(retryAfter * 1000);
						continue;
					}
					throw new Error(`Rate limited by Instagram. Try again later.`);
				}

				// Server error — retry with backoff + jitter
				if (status && status >= 500 && attempt < this.retryAttempts) {
					const backoff = this.retryDelayMs * attempt + Math.random() * 1000;
					await this.sleep(backoff);
					continue;
				}

				// Network error — retry
				if (
					error.code === "ECONNRESET" ||
					error.code === "ETIMEDOUT" ||
					error.code === "ENOTFOUND"
				) {
					if (attempt < this.retryAttempts) {
						await this.sleep(this.retryDelayMs * attempt);
						continue;
					}
				}

				throw error;
			}
		}

		throw lastError || new Error("Request failed after all retry attempts.");
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
