# IDMU Automation Subsystem (`src/modules/messaging/services/automation/`)

Instagram heavily rate-limits the official REST API endpoint for message deletion (`direct_v2/threads/<threadId>/items/<itemId>/delete/`). Batch deleting messages via this API quickly results in `429 Too Many Requests` or permanent account bans.

To circumvent this, IGM employs the **Instagram Direct Message Unsender (IDMU)** subsystem. This is a headless browser automation engine powered by Playwright. Instead of calling the API, it logs into the Instagram web application using the user's existing cookies, injects a custom DOM manipulation script (Userscript), and systematically simulates human clicks to "unsend" messages visually.

**Related documentation**: [README.md](README.md) · [cli.md](cli.md) · [modules.md](modules.md)

---

## Playwright Orchestrator

**Source**: [`src/modules/messaging/services/automation/unsend-playwright.ts`](../src/modules/messaging/services/automation/unsend-playwright.ts)

The orchestrator is the Node.js bridge that manages the Playwright lifecycle, negotiates with the injected userscript, and routes console events back to the IGM terminal.

### Orchestration Flow

1. **Browser Launch**: Launches Chromium with stealth arguments (`--disable-blink-features=AutomationControlled`, `--disable-web-security`).
2. **Context Creation**: Creates a BrowserContext and injects the `IGClient`'s cookies directly into the context, bypassing the Instagram login screen.
3. **Fingerprint Masking**: Injects a custom `init.js` script before the page loads. This script overrides `navigator.webdriver`, mocks `navigator.plugins`, and stubs `chrome.runtime` to defeat basic bot detection scripts.
4. **Navigation**: Navigates to `https://www.instagram.com/direct/t/<threadId>/`.
5. **Userscript Injection**: Reads the compiled IDMU userscript and evaluates it in the page context.
6. **Execution Trigger**: Evaluates `window.startUnsendPlaywright(options)` to kick off the DOM automation loop.
7. **Event Bridging**: Listens to the `console` event from Playwright. The userscript sends structured JSON payloads prefixed with `[IDMU_BRIDGE]` (e.g. `[IDMU_BRIDGE] {"type": "progress", "count": 10}`). The orchestrator parses these to update the terminal UI and Spinner.

---

## The IDMU Userscript (`userscript/`)

The core of the automation is the Userscript, which runs entirely inside the browser's context.

### Architecture

```
userscript/
├── core/
│   ├── IDMU.ts              # Main entry point and orchestrator loop
│   ├── UIPI.ts              # High-level DOM interaction API
│   ├── UIPIMessage.ts       # Wrapper for an individual message DOM element
│   ├── DefaultStrategy.ts   # Top-to-bottom or bottom-to-top execution logic
│   └── UnsendStrategy.ts    # Strategy Interface
├── dom/
│   └── async-events.ts      # Memory-safe MutationObserver wrappers
└── ui/
    ├── UIControls.ts        # Optional in-browser overlay (disabled in CLI mode)
    └── UIMessage.ts         # Bridge messages formatter
```

### O(1) Geometrical Targeting

The hardest problem in DOM automation is accurately targeting elements when the DOM is dynamic, obfuscated, and continuously mutating (React virtual DOM). Instagram's class names change frequently (e.g. `._aab1`, `._aab2`).

Instead of relying on fragile CSS selectors or XPath queries, IDMU uses **Geometrical Targeting**:

**Source**: [`src/modules/messaging/services/automation/userscript/core/UIPIMessage.ts`](../src/modules/messaging/services/automation/userscript/core/UIPIMessage.ts)

1. The script identifies the main scroll container.
2. It queries for all message rows (`div[role="row"]`).
3. To determine if a message belongs to the authenticated user (and is therefore "unsendable"), it does **not** look at profile pictures or classes. It uses `getBoundingClientRect()`.
4. If `rect.right` of the message bubble is closer to the right edge of the screen than the left edge, the message belongs to the user (sent messages are right-aligned). This check is O(1) and immune to CSS class obfuscation.

### Asynchronous DOM Events

**Source**: [`src/modules/messaging/services/automation/userscript/dom/async-events.ts`](../src/modules/messaging/services/automation/userscript/dom/async-events.ts)

The automation loop cannot simply use `setTimeout` to wait for Instagram to load messages. It must synchronously wait for React to finish rendering.

The `waitForElement` and `waitForRemoval` functions wrap `MutationObserver` in Promises. When the script clicks the "Unsend" button, it `await waitForRemoval(messageElement)`. The Promise only resolves when the `MutationObserver` detects that the specific DOM node has been detached, ensuring perfect synchronization with React's render cycle.

### Execution Strategy

**Source**: [`src/modules/messaging/services/automation/userscript/core/DefaultStrategy.ts`](../src/modules/messaging/services/automation/userscript/core/DefaultStrategy.ts)

The `DefaultStrategy` implements the core unsend loop:

1. **Scan**: Calls `UIPI.getOwnMessages()`.
2. **Process**: Iterates over the target messages.
   - Hovers the message to reveal the three-dots menu.
   - Clicks the menu button.
   - Waits for the dialog dropdown.
   - Clicks the "Unsend" option.
   - Waits for the confirmation modal.
   - Clicks "Unsend" on the modal.
   - Waits for the message node to be removed from the DOM.
3. **Scroll**: Once all visible messages are processed, it scrolls the container to load more.
   - If `top` flag is false (default): Scrolls down (bottom of the DOM).
   - If `top` flag is true: Scrolls up to the top of the conversation.
4. **vSync Sleep**: Uses `requestAnimationFrame` + `setTimeout` to wait for network requests and DOM stabilization before repeating the scan.

### Memory Leak Prevention

Because this script can run for hours and process thousands of messages, memory leaks are fatal. The `MutationObserver` wrappers strictly call `.disconnect()` in a `finally` block to ensure detached observers are garbage collected immediately, preventing the browser tab from crashing during deep history traversal.
