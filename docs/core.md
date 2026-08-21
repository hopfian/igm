# Core Engine

> Internal documentation for `src/core/`.

---

## § auth.ts — Authentication

Parses Netscape-format `cookies.txt` files into session cookie strings for Instagram API replay.

### Exports

| Function | Signature | Description |
|----------|-----------|-------------|
| `loadCookies` | `(file?: string) → string` | Reads cookie file, returns semicolon-joined cookie string |
| `extractCsrfToken` | `(cookieString: string) → string` | Extracts the `csrftoken` value for X-CSRFToken header |

### Cookie Format

Expects Netscape HTTP Cookie File format (tab-delimited):
```
.instagram.com	TRUE	/	TRUE	0	csrftoken	abc123...
```

Lines starting with `#` (except `#HttpOnly_`) are skipped.

---

## § client.ts — Hardened HTTP Client

The `IGClient` class implements a **7-layer defense-in-depth** architecture to make requests indistinguishable from a real Chrome browser session.

### Architecture: Anti-Detection Layers

| Layer | Defense | Implementation |
|-------|---------|----------------|
| **L1: TLS** | Chrome TLS fingerprint | `got-scraping` with JA3/JA4 impersonation |
| **L2: HTTP/2** | Chrome HTTP/2 SETTINGS | `got-scraping` auto-negotiates HTTP/2 |
| **L3: Headers** | Full Chrome header suite | `Sec-CH-UA`, `Sec-Fetch-*`, dynamic rollout hash |
| **L4: Session** | Dynamic claim capture | `X-IG-WWW-Claim` from `x-ig-set-www-claim` response header |
| **L5: Timing** | Human-like delays | Log-normal distribution (Box-Muller), velocity monitoring |
| **L6: Behavior** | N/A (human-driven) | Manual CLI, interactive pagination |
| **L7: Trust** | Challenge detection | Graceful `challenge_required` handling |

### Constructor

```typescript
new IGClient(cookieFile?: string)
```

Reads config from `.igmrc.json`, loads cookies, and lazy-loads `got-scraping` via `new Function('return import()')` to bypass tsc's CJS transformation.

### Dynamic Rollout Refresh

On the first API call, the client fetches `instagram.com` homepage to extract:
- `server_revision` → `X-Instagram-AJAX` header
- `ASBD_ID` → `X-ASBD-ID` header

These rotate with Meta deployments. Stale values are a bot signal.

### Request Flow

```
apiCall() → refreshRollout() → enforceHumanTiming() → buildHeaders() → executeRequest()
                                      ↓                                       ↓
                              log-normal delay                    got-scraping (primary)
                              velocity check                     axios (fallback)
```

### Retry Behavior

- **401/403**: Throws immediately (auth failure, no retry)
- **429**: Reads `Retry-After` header, waits, then retries
- **challenge_required**: Throws with user instructions to resolve in browser
- **5xx**: Retries with exponential backoff + jitter (`retryDelayMs × attempt + random`)
- **ECONNRESET/ETIMEDOUT**: Retries with backoff
- Default: 3 attempts (configurable via `.igmrc.json`)

### Human Timing Engine

Uses Box-Muller transform for log-normal distribution:
- Median delay: 800ms
- Spread (σ): 0.6
- Clamped: 200ms – 5000ms
- Velocity warning: >40 requests/minute triggers 3-5s cooldown

### POST Encoding

POST data is serialized as `application/x-www-form-urlencoded` via `URLSearchParams`, matching Instagram's web client behavior.

---

## § config.ts — Configuration

Manages an optional `.igmrc.json` config file in the project root.

### Interface

```typescript
interface IGMConfig {
    cookieFile: string;       // Default: 'cookies.txt'
    defaultCount: number;     // Default: 10
    downloadDir: string;      // Default: './downloads'
    cardWidth: number;        // Default: 76
    retryAttempts: number;    // Default: 3
    retryDelayMs: number;     // Default: 1000
}
```

### Exports

| Function | Description |
|----------|-------------|
| `loadConfig()` | Loads `.igmrc.json` with fallback to defaults |
| `saveConfig(updates)` | Merges updates and writes to `.igmrc.json` |
