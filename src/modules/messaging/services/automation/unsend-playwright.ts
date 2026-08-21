import * as fs from "node:fs";
import * as path from "node:path";

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
		path.join(path.dirname(process.execPath), "dist", "assets", "idmu.user.js"),
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
			`Userscript not found. Searched in:\n${possiblePaths.join("\n")}\nPlease build it first.`,
		);
	}

	const userscriptCode = fs.readFileSync(userscriptPath, "utf8");
	const scriptBody = userscriptCode
		.replace(/^\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\s*/m, "")
		.trim();

	let chromium: any;
	try {
		try {
			const playwright = require("playwright");
			chromium = playwright.chromium;
		} catch (_e1) {
			const { createRequire } = require("node:module");
			try {
				chromium = createRequire(`${process.cwd()}/index.js`)(
					"playwright",
				).chromium;
			} catch (_e2) {
				chromium = createRequire(process.execPath)("playwright").chromium;
			}
		}
	} catch (_err) {
		throw new Error(
			"Playwright is not installed. Please install it globally or locally (npm install playwright) to use the unsend automation feature.",
		);
	}

	let totalUnsent = 0;
	const context = await chromium.launchPersistentContext("", {
		headless: config.headless !== false,
		slowMo: config.slowMo || 0,
		args: [
			"--no-sandbox",
			"--disable-blink-features=AutomationControlled",
			"--start-maximized",
			"--app=data:,",
		],
		viewport: null, // Allow viewport to resize to window
		userAgent:
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
		locale: "en-US",
	});

	try {
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
					html::-webkit-scrollbar, body::-webkit-scrollbar {
						display: none !important;
						width: 0 !important;
						height: 0 !important;
					}
					html, body {
						scrollbar-width: none !important;
						-ms-overflow-style: none !important;
						overflow: hidden !important;
					}
					@keyframes idmuPulse {
						0% { box-shadow: inset 0 0 40px 10px rgba(255, 20, 147, 0.5); }
						50% { box-shadow: inset 0 0 80px 20px rgba(255, 20, 147, 0.9); }
						100% { box-shadow: inset 0 0 40px 10px rgba(255, 20, 147, 0.5); }
					}
					@keyframes idmuErrorShake {
						0%, 100% { transform: translateX(-50%); }
						20%, 60% { transform: translateX(calc(-50% - 6px)); }
						40%, 80% { transform: translateX(calc(-50% + 6px)); }
					}
					.idmu-error {
						animation: idmuErrorShake 0.4s cubic-bezier(.36,.07,.19,.97) both !important;
						background: rgba(40, 10, 10, 0.95) !important;
						color: #ffa8a8 !important;
						box-shadow: 0 10px 30px rgba(255, 40, 40, 0.2), 0 0 0 1px rgba(255, 60, 60, 0.6) !important;
					}
					.idmu-error .idmu-dot {
						background-color: #ff3c3c !important;
						box-shadow: 0 0 12px #ff3c3c, 0 0 20px #ff3c3c !important;
						animation: none !important;
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
						background: rgba(10, 10, 10, 0.85);
						backdrop-filter: blur(12px);
						-webkit-backdrop-filter: blur(12px);
						color: #fff;
						padding: 12px 24px;
						border-radius: 30px;
						font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
						font-size: 14px;
						font-weight: 500;
						letter-spacing: 0.3px;
						box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(255, 20, 147, 0.4);
						z-index: 2147483647;
						transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
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
				let errorTimeout: ReturnType<typeof setTimeout>;
				const blockUserInteraction = (e: Event) => {
					if (e.isTrusted) {
						e.stopPropagation();
						e.preventDefault();

						if (
							e.type === "click" ||
							e.type === "mousedown" ||
							e.type === "pointerdown" ||
							e.type === "keydown"
						) {
							const islandTextEl = island.querySelector("#idmu-island-text");
							if (islandTextEl) {
								if (!island.classList.contains("idmu-error")) {
									island.dataset.originalText = islandTextEl.textContent || "";
								}
								islandTextEl.textContent = "Manual override blocked";
							}

							island.classList.add("idmu-error");

							clearTimeout(errorTimeout);
							errorTimeout = setTimeout(() => {
								island.classList.remove("idmu-error");
								if (island.dataset.originalText && islandTextEl) {
									islandTextEl.textContent = island.dataset.originalText;
								}
							}, 2500);
						}
					}
				};

				(window as any).triggerTabError = () => {
					const islandTextEl = island.querySelector("#idmu-island-text");
					if (islandTextEl) {
						if (!island.classList.contains("idmu-error")) {
							island.dataset.originalText = islandTextEl.textContent || "";
						}
						islandTextEl.textContent = "New tabs are disabled";
					}

					island.classList.add("idmu-error");

					clearTimeout(errorTimeout);
					errorTimeout = setTimeout(() => {
						island.classList.remove("idmu-error");
						if (island.dataset.originalText && islandTextEl) {
							islandTextEl.textContent = island.dataset.originalText;
						}
					}, 2500);
				};

				// Intercept physical events in capture phase
				const eventsToBlock = [
					"click",
					"mousedown",
					"mouseup",
					"keydown",
					"keyup",
					"keypress",
					"wheel",
					"contextmenu",
					"mousemove",
					"pointerdown",
				];
				eventsToBlock.forEach((ev) => {
					window.addEventListener(ev, blockUserInteraction, true);
				});
			});
		});

		await context.addInitScript(scriptBody);
		await context.addCookies(cookies);

		// Block user from creating new tabs manually
		context.on("page", async (newPage: any) => {
			if (context.pages().length > 1) {
				await newPage.close();
				const mainPage = context.pages()[0];
				if (mainPage) {
					await mainPage
						.evaluate(() => {
							if (typeof (window as any).triggerTabError === "function") {
								(window as any).triggerTabError();
							}
						})
						.catch(() => {});
				}
			}
		});

		const page = context.pages()[0] || (await context.newPage());

		if (config.onProgress) {
			await page.exposeFunction("onIDMUStatus", (text: string) => {
				config.onProgress?.(text);
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
			config.onProgress(`🎉  ALL DONE! Total messages unsent: ${totalUnsent}`);
		await page.waitForTimeout(1000);
	} finally {
		await context.close();
	}

	return totalUnsent;
}
