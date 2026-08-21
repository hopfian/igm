import * as fs from "fs";
import * as path from "path";

export interface UnsendConfig {
	headless?: boolean;
	slowMo?: number;
	delayMs?: number;
	maxFailures?: number;
	onProgress?: (text: string) => void;
	topFirst?: boolean;
}

export async function runUnsendPlaywright(
	cookieString: string,
	threadId: string,
	config: UnsendConfig = {},
): Promise<number> {
	const threadUrl = `https://www.instagram.com/direct/t/${threadId}/`;

	// Parse the cookie string to Playwright format
	const cookies = cookieString
		.split(";")
		.map((c) => c.trim())
		.filter((c) => c)
		.map((c) => {
			const [name, ...valueParts] = c.split("=");
			return {
				name: name,
				value: valueParts.join("="),
				domain: ".instagram.com",
				path: "/",
				secure: true,
				httpOnly: false,
				sameSite: "Lax" as const,
			};
		});

	const possiblePaths = [
		path.join(__dirname, "assets", "idmu.user.js"),
		path.join(__dirname, "..", "..", "assets", "idmu.user.js"),
		path.join(process.cwd(), "dist", "assets", "idmu.user.js"),
		path.join(path.dirname(process.execPath), "dist", "assets", "idmu.user.js")
	];
	
	let userscriptPath = "";
	for (const p of possiblePaths) {
		if (fs.existsSync(p)) {
			userscriptPath = p;
			break;
		}
	}

	if (!userscriptPath) {
		throw new Error(
			`Userscript not found. Searched in:\n${possiblePaths.join('\n')}\nPlease build it first.`,
		);
	}

	const userscriptCode = fs.readFileSync(userscriptPath, "utf8");
	const scriptBody = userscriptCode
		.replace(/^\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\s*/m, "")
		.trim();

	let chromium;
	try {
		try {
			const playwright = require("playwright");
			chromium = playwright.chromium;
		} catch (e1) {
			const { createRequire } = require("module");
			try {
				chromium = createRequire(process.cwd() + "/index.js")("playwright").chromium;
			} catch (e2) {
				chromium = createRequire(process.execPath)("playwright").chromium;
			}
		}
	} catch (err) {
		throw new Error(
			"Playwright is not installed. Please install it globally or locally (npm install playwright) to use the unsend automation feature.",
		);
	}

	const browser = await chromium.launch({
		headless: config.headless !== false,
		slowMo: config.slowMo || 0,
		args: [
			"--no-sandbox",
			"--disable-blink-features=AutomationControlled",
			"--start-maximized"
		],
	});

	let totalUnsent = 0;
	try {
		const context = await browser.newContext({
			viewport: null, // Allow viewport to resize to window
			userAgent:
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
			locale: "en-US",
		});

		// Remove automation fingerprint and inject UI pink glow
		await context.addInitScript(() => {
			Object.defineProperty(navigator, "webdriver", { get: () => undefined });
			Object.defineProperty(navigator, "plugins", {
				get: () => [1, 2, 3, 4, 5],
			});
			(window as any).chrome = { runtime: {} };
			
			// Inject animated UI and Dynamic Island
			window.addEventListener("DOMContentLoaded", () => {
				const style = document.createElement("style");
				style.textContent = `
					@keyframes idmuPulse {
						0% { box-shadow: inset 0 0 40px 10px rgba(255, 20, 147, 0.5); }
						50% { box-shadow: inset 0 0 80px 20px rgba(255, 20, 147, 0.9); }
						100% { box-shadow: inset 0 0 40px 10px rgba(255, 20, 147, 0.5); }
					}
					#idmu-overlay {
						position: fixed;
						top: 0; left: 0; width: 100vw; height: 100vh;
						box-sizing: border-box;
						pointer-events: all;
						background: rgba(255, 20, 147, 0.03);
						z-index: 2147483646;
						animation: idmuPulse 2s infinite ease-in-out;
					}
					#idmu-island {
						position: fixed;
						bottom: 40px;
						left: 50%;
						transform: translateX(-50%);
						background: #000;
						color: #fff;
						padding: 12px 24px;
						border-radius: 30px;
						font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
						font-size: 14px;
						font-weight: 600;
						box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 0 2px rgba(255, 20, 147, 0.5);
						z-index: 2147483647;
						transition: all 0.3s ease;
						pointer-events: none;
						text-align: center;
						min-width: 300px;
						display: flex;
						align-items: center;
						justify-content: center;
						gap: 12px;
					}
					.idmu-dot {
						width: 12px; height: 12px;
						border-radius: 50%;
						background-color: #FF1493;
						box-shadow: 0 0 12px #FF1493, 0 0 20px #FF1493;
						animation: idmuPulseDot 1.2s infinite alternate ease-in-out;
						flex-shrink: 0;
					}
					@keyframes idmuPulseDot {
						0% { opacity: 0.3; transform: scale(0.7); box-shadow: 0 0 4px #FF1493; }
						100% { opacity: 1; transform: scale(1.3); box-shadow: 0 0 16px #FF1493, 0 0 24px #FF1493; }
					}
				`;
				document.head.appendChild(style);

				const overlay = document.createElement("div");
				overlay.id = "idmu-overlay";
				document.body.appendChild(overlay);

				const island = document.createElement("div");
				island.id = "idmu-island";
				island.innerHTML = `<div class="idmu-dot"></div><span id="idmu-island-text">IDMU: Initializing...</span>`;
				document.body.appendChild(island);
			});
		});

		await context.addInitScript(scriptBody);
		await context.addCookies(cookies);

		const page = await context.newPage();

		if (config.onProgress) {
			await page.exposeFunction("onIDMUStatus", (text: string) => {
				config.onProgress!(text);
			});
			// Hook the exposeFunction into the page to also update the island
			await page.addInitScript(() => {
				const originalOnIDMUStatus = (window as any).onIDMUStatus;
				(window as any).onIDMUStatus = async (text: string) => {
					const islandText = document.getElementById("idmu-island-text");
					if (islandText) islandText.textContent = text;
					if (originalOnIDMUStatus) await originalOnIDMUStatus(text);
				};
			});
		}

		console.log(`\n🌐  Navigating to thread ${threadUrl}...`);
		await page.goto(threadUrl, {
			waitUntil: "domcontentloaded",
			timeout: 30000,
		});

		// Dismiss blocking modals
		await page.waitForTimeout(2000);
		const url = page.url();
		if (url.includes("login") || url.includes("accounts")) {
			throw new Error(
				"Redirected to login page. Your cookies may be expired or invalid.",
			);
		}

		await page.evaluate(() => {
			const notNow = [...document.querySelectorAll("button")].find(
				(b) =>
					b.textContent?.trim() === "Not Now" ||
					b.textContent?.trim() === "Not now",
			);
			if (notNow) notNow.click();
		});
		await page.waitForTimeout(1000);

		// Verify IDMU injection
		await page.waitForTimeout(2000);
		let hasEngine = await page.evaluate(
			() => typeof window.idmuEngine !== "undefined",
		);
		if (!hasEngine) {
			console.log("⚠️  IDMU engine not found — retrying injection...");
			await page.evaluate(scriptBody);
			await page.waitForTimeout(2000);
			hasEngine = await page.evaluate(
				() => typeof window.idmuEngine !== "undefined",
			);
		}

		if (!hasEngine) {
			throw new Error(
				"IDMU engine not found after injection. Page structure may have changed.",
			);
		}

		if (config.onProgress)
			config.onProgress("✅  Unsending started! Monitoring progress...");

		let runNumber = 0;
		let consecutiveZeroRuns = 0;

		while (consecutiveZeroRuns < 2) {
			runNumber++;
			if (config.onProgress)
				config.onProgress(
					`\n─── Run #${runNumber} | Total so far: ${totalUnsent} ───────────────────`,
				);

			// We let IDMU run headlessly in the page
			// The start() method returns the number of unsent messages when it finishes or aborts
			const engineConfig = {
				delayMs: config.delayMs,
				maxFailures: config.maxFailures,
				topFirst: config.topFirst,
			};
			const runUnsent = await page.evaluate(async (cfg: any) => {
				if (window.idmuEngine) {
					return await window.idmuEngine.start(cfg);
				}
				return 0;
			}, engineConfig);

			totalUnsent += runUnsent;
			if (config.onProgress)
				config.onProgress(
					`✅  Run #${runNumber} complete: ${runUnsent} unsent | ${totalUnsent} total`,
				);

			if (runUnsent === 0) {
				consecutiveZeroRuns++;
				if (config.onProgress)
					config.onProgress(
						`ℹ️  Zero unsent this run (${consecutiveZeroRuns}/2 consecutive zeros)`,
					);
			} else {
				consecutiveZeroRuns = 0;
			}

			await page.waitForTimeout(3000);
		}

		if (config.onProgress)
			config.onProgress(`🎉  ALL DONE! Total messages unsent: ${totalUnsent}`);
		await page.waitForTimeout(1000);
	} finally {
		await browser.close();
	}

	return totalUnsent;
}
