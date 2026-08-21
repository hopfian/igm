# IDMU (Instagram Direct Message Unsender) Subsystem

The IDMU subsystem (`src/modules/messaging/services/automation/`) is an advanced headless browser framework engineered to bulk unsend Instagram Direct Messages. 

Standard REST API requests to `direct_v2/threads/broadcast/unsend/` are heavily guarded by Meta; automated API calls trigger soft-bans at around 20-30 requests. IDMU avoids this completely by orchestrating an exact replica of human DOM interaction inside an embedded Chromium instance.

## 1. Orchestration: `unsend-playwright.ts`
The Node.js orchestrator uses `playwright` to spin up a headless browser. 
- **Session Injection**: It translates the extracted Netscape `cookies.txt` into Playwright `BrowserContext` cookies, entirely bypassing the Instagram login flow and 2FA requirements.
- **Fingerprint Evasion**: Through `addInitScript`, it intercepts the `navigator` object, masking `webdriver`, mocking `plugins`, and injecting fake `chrome.runtime` properties to evade Instagram's bot-detection payloads.
- **Userscript Injection**: It dynamically loads the bundled `idmu.user.js` payload and injects it into the page context, initializing the `window.idmuEngine`.
- **UI Island**: It simultaneously mounts a CSS-animated visual "Dynamic Island" overlay into the DOM so users monitoring non-headless runs can see exact execution states (e.g. `IDMU: Initializing...`).

## 2. Execution Engine: `userscript/core/`
This code runs directly inside the isolated Playwright browser tab.
- **`IDMU.ts`**: The root Engine exposed globally. Exposes the `.start()` method invoked by the Node orchestrator.
- **`DefaultStrategy.ts`**: The core state machine loop. It handles the specific execution order: locating messages, firing the unsend sequence, trapping errors, executing exponential backoff during localized rate limits, and dispatching virtual scroll events to paginate older messages.
- **`UIPI.ts` / `UIPIMessage.ts`**: The UI Programming Interface. Rather than littering `DefaultStrategy` with ugly `document.querySelector` chains, UIPI abstracts DOM elements into functional atomic states. `UIPIMessage.ts` explicitly controls the 3-step action state: `showActionsMenuButton()` -> `openActionsMenu()` -> `confirmUnsend()`.

## 3. Asynchronous DOM Flow: `userscript/dom/`
Instagram is a heavily virtualized React application; elements are constantly mounted, unmounted, and destroyed from the DOM.
- **`async-events.ts`**: Implements `waitForElement` using a memory-safe, timeout-protected `MutationObserver`. Instead of fragile `setTimeout` polling, it yields a Promise precisely at the sub-millisecond that React flushes the DOM mutation (e.g. when the "Unsend" dialog finally mounts). It cleanly unbinds its observers and `AbortController` hooks to prevent memory leaks during long 1000+ message runs.
- **`lookup.ts`**: Due to obfuscated class names, IDMU cannot rely on CSS classes to determine if a message was sent by the authenticated user or the remote user. Instead, `isSentByCurrentUser` calculates geometrical bounding boxes (`getBoundingClientRect()`) to determine if the message element sits geometrically on the right side of the screen (`contentCenter > elementCenter`). This provides an `O(1)` visual confirmation of ownership without parsing fragile internal React states.

## 4. Virtualized Scrolling: `userscript/ui/DefaultUI.ts`
Instagram unmounts messages that scroll off-screen. `DefaultUI.ts` bypasses rapid, janky `scrollTop` assignments by hooking into `window.requestAnimationFrame`. It dispatches smooth, micro-pixel delta scroll events synchronized precisely with the browser's 60Hz vSync render loop. This mimics actual human scrolling physics, tricking Meta's scroll velocity telemetry heuristics.
