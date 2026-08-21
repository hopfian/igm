# IDMU Automation Subsystem

IGM includes an advanced subsystem located in `src/modules/messaging/services/automation/` designed for bulk unsending Instagram Direct Messages. 

Because the internal REST API heavily rate limits automated unsending requests, performing bulk unsending via standard HTTP requests is unviable. The **IDMU (Instagram Direct Message Unsender)** subsystem solves this by wrapping a full headless browser engine (Playwright) and injecting a localized React/DOM-aware Userscript directly into the official Instagram web client.

## Architecture

1. **`unsend-playwright.ts`**
   The Node.js orchestrator. It spins up an ephemeral Playwright context, logs in using the extracted `cookies.txt`, navigates to the target thread, and seamlessly injects the compiled Userscript (`idmu.user.js`) directly into the page's execution context.

2. **The Userscript Engine (`userscript/core/`)**
   The core engine running *inside* the browser.
   - `IDMU.ts`: The global API exposed to the `window` object for Playwright to trigger.
   - `DefaultStrategy.ts`: The main execution loop. It handles the state machine for finding messages, unsending them, exponentially backing off upon rate limits, and dispatching scroll events to load older messages.
   - `UIPI.ts` & `UIPIMessage.ts`: The UI Programming Interface. An abstraction layer over raw DOM mutations, allowing the strategy loop to act on "Messages" rather than HTML elements.

3. **DOM Manipulation (`userscript/dom/` & `userscript/ui/`)**
   - **`lookup.ts`**: Contains highly optimized geometrical algorithms (via `getBoundingClientRect()`) to scan the DOM tree in `O(1)` time to mathematically identify messages sent by the current user without triggering layout thrashing.
   - **`async-events.ts`**: A robust, leak-free `MutationObserver` wrapper (`waitForElement`) that yields Promises when specific DOM states are reached (e.g., waiting for the "Unsend" button to appear).
   - **`DefaultUI.ts`**: Manages the virtualized scroll container, using `requestAnimationFrame` to smoothly simulate human scrolling tied directly to the browser's vSync loop.
