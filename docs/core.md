# Core Engine (`src/core/`)

The `core/` layer manages the foundational state of the IGM application, explicitly handling anti-detection networking, cookie management, and dynamic configuration resolution.

## `http/ig-client.ts`
The `IGClient` class is a deeply hardened HTTP engine built to emulate the exact network signature of the official Instagram mobile and web clients. It implements a 5-layer defense strategy:

1. **TLS & HTTP/2 Impersonation**: Uses the `got-scraping` underlying engine to negotiate HTTP/2 with exact Chrome cipher suites, bypassing JA3/JA4 TLS fingerprinting.
2. **Client Hints**: Injects strict `Sec-CH-UA` and `Sec-Fetch-*` headers matching Chrome 130 on Windows.
3. **Dynamic Rollout Hashing**: Scrapes the Instagram homepage on initialization (`fetchRolloutHash`) to extract the dynamic `X-Instagram-AJAX` rollout hash (e.g., `1039665806`) and the internal `X-ASBD-ID` required by the `api/v1/` endpoints.
4. **CSRF Lifecycle**: Parses `X-CSRFToken` dynamically from the `cookieString` using the `cookie-parser.ts` utility and updates the internal state on every `set-cookie` response.
5. **Backoff and Jitter**: Integrates with the `human-delay.ts` module to intercept requests if the RPM (Requests Per Minute) exceeds 40, injecting non-deterministic sleep cycles to avoid velocity bans.

### Error Handling
The `apiCall` method actively intercepts Meta's internal HTTP status codes:
- **`challenge_required`**: Throws a specialized error halting execution immediately to prevent account lockouts.
- **`429 Rate Limit`**: Parses the `retry-after` header and suspends the thread asynchronously up to `retryAttempts`.
- **`5xx / ECONNRESET`**: Applies exponential backoff + jitter for unstable network connections.

## `auth/cookie-parser.ts`
Standard API authentication is impossible due to encrypted payloads and Captchas. Instead, IGM directly mounts existing browser sessions via a Netscape `cookies.txt` file. The parser extracts the `sessionid`, `ds_user_id`, and `csrftoken` keys required to impersonate the user.

## `timing/human-delay.ts`
Meta flags accounts that send API requests at exactly `1000ms` intervals. The `humanDelay(base, variance)` function uses a log-normal distribution to mathematically randomize delays (e.g., yielding clusters of 800ms delays, interspersed with occasional 2000ms delays) simulating real human interaction pauses.
