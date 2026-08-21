# Core HTTP & Network Layer

The `src/core/` module is the foundation of `igm`. It manages authentication, network requests, rate limiting, and Instagram's bot defense evasion. The architecture relies on a 7-layer defense system implemented through a dynamic HTTP client.

## Core Components

### `auth.ts` — Cookie Management
Parses Netscape HTTP Cookie File format (`cookies.txt`).
- Reads the file line-by-line, filtering comments and blank lines.
- Extracts cookie names and values.
- Reconstructs a compliant `Cookie: ...` header string for injection into HTTP requests.

### `client.ts` — The IGClient
The `IGClient` class orchestrates all network communication. It implements a 7-Layer Defense Evasion mechanism to avoid bot detection:
1. **Chrome TLS Impersonation**: Uses `got-scraping` (via `request.ts`) to match Chrome's TLS fingerprint and HTTP/2 SETTINGS frames.
2. **Dynamic Headers**: Injects exact browser headers (e.g., `Sec-Fetch-Site: same-origin`, `X-Instagram-AJAX`).
3. **App ID Verification**: Maintains the required `X-IG-App-ID`.
4. **Dynamic Claims**: Captures the `x-ig-set-www-claim` header from responses and attaches it to subsequent requests.
5. **Rollout Syncing**: Fetches `server_revision` and `ASBD_ID` dynamically from Instagram's homepage (via `headers.ts`).
6. **Human Timing**: Implements log-normal delay timing between requests (via `timing.ts`).
7. **Resilience**: Implements automatic backoff and jitter retries for rate limits (429) and server errors (500+).

#### Error Handling
- **401/403**: Aborts and prompts the user to re-export cookies.
- **challenge_required**: Aborts and instructs the user to clear the challenge in the browser.
- **429 (Rate Limited)**: Reads the `retry-after` header and suspends execution.

### `config.ts` — Configuration
Manages the application configuration via `.igmrc.json`. Falls back to the following defaults if the file is missing or malformed:

| Option | Default Value | Description |
| :--- | :--- | :--- |
| `cookieFile` | `'cookies.txt'` | Path to the Netscape cookie file. |
| `defaultCount` | `10` | Default number of items to fetch (where applicable). |
| `downloadDir` | `'./downloads'` | Output directory for media downloads. |
| `cardWidth` | `76` | Terminal character width for UI rendering. |
| `retryAttempts` | `3` | Maximum number of request retries. |
| `retryDelayMs` | `1000` | Base delay for retry backoff. |

### `headers.ts` — Rollout Sync
Contains `fetchRolloutHash()`, which fetches the Instagram homepage to extract live rollout values (`server_revision` and `ASBD_ID`). These rotate with deployments; using stale values acts as a bot signal.

### `request.ts` — HTTP Engine
Implements `executeRequest()`.
- Dynamically imports `got-scraping` (ESM module) for advanced TLS impersonation.
- Falls back to `axios` if `got-scraping` is unavailable.
- Extracts and returns `data` alongside the `newClaim` header if present.

### `timing.ts` — Human Simulation
Contains `humanDelay(median = 800, sigma = 0.6)`. Uses the Box-Muller transform to generate delays drawn from a log-normal distribution, clamping between 200ms and 5000ms. This simulates human "bursty" behavior—many short pauses mixed with occasional long ones.
