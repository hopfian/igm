# IGM (Instagram Terminal) Developer Documentation

IGM is an advanced command-line interface and terminal user interface designed to interface securely with Instagram's internal private APIs (`api/v1`). It bypasses modern Meta bot-detection heuristics (like TLS fingerprinting, rate limit traps, and DOM interaction monitoring) through a hardened network layer and an embedded Playwright engine.

## Domain-Driven Design (DDD) Architecture

The codebase inside `src/` follows strict Domain-Driven Design principles, isolating side-effects and enforcing single-responsibility across layers.

- **`cli/`**: The yargs-based CLI router. It handles argument parsing, resolves global export flags (e.g., `--json`, `--csv`), and invokes the respective `modules/` renderers or services.
- **`core/`**: The foundational hardened layer.
  - `http/ig-client.ts`: The HTTP/2 request engine leveraging `got-scraping` to perform Chrome TLS impersonation, dynamic `X-Instagram-AJAX` rollout hashing, and automatic CSRF lifecycle management.
  - `timing/human-delay.ts`: Implements log-normal distribution micro-sleeps to evade fixed-interval rate-limit detection algorithms.
- **`modules/`**: Encapsulates specific Instagram domains.
  - `auth/`: Handles raw `cookies.txt` parsing and session restoration.
  - `identity/`: Wraps user-centric APIs (`users/:id/info/`, `friendships/show/`). See `profile.service.ts` for direct mapping.
  - `messaging/`: Handles the Direct Message APIs (`direct_v2`) and the embedded IDMU automation subsystem.
  - `media-sync/`: Handles parallel downloading and asset resolution.
  - `timeline/`: Parses complex nested `media` nodes from the feed APIs (Explore, Reels, Home) using `media-extractor.ts`.
- **`tui/`**: A fully interactive, stateful terminal dashboard built on `blessed`. It utilizes a grid-based `layout.ts` to manage rendering `components/inbox.ts` and `components/timeline.ts` in real-time.
- **`shared/`**: Global UI rendering components (like the `card.component.ts` box-drawer) and API DTOs.

## Advanced Subsystems: IDMU Automation

Standard API calls for unsending messages are aggressively rate-limited (often soft-banning accounts after 20-30 requests). 
To circumvent this, IGM embeds the **IDMU (Instagram Direct Message Unsender)** subsystem inside `src/modules/messaging/services/automation`.

IDMU spins up a headless Playwright Chromium instance (`unsend-playwright.ts`), strips out standard `navigator.webdriver` automation fingerprints via `addInitScript`, and injects a custom, highly-optimized React-aware Userscript (`idmu.user.js`) directly into the official Instagram web interface.

This allows IGM to unsend thousands of messages by visually manipulating the DOM in `O(1)` time using `getBoundingClientRect` geometrical checks and `requestAnimationFrame` vSync synchronized scrolling, entirely avoiding API blocks.

## Global Configuration

IGM relies on `.igmrc.json` and a Netscape `cookies.txt` file for authentication.

```json
{
  "cookieFile": "cookies.txt",
  "defaultCount": 10,
  "downloadDir": "./downloads",
  "cardWidth": 76,
  "retryAttempts": 3,
  "retryDelayMs": 1000
}
```
