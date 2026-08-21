# Core Engine (`src/core/`)

The `core/` layer is the foundational engine of IGM. It handles network transport, authentication state, runtime configuration, and anti-detection delays.

## Components

### 1. `http/ig-client.ts`
The `IGClient` is a specialized HTTP engine designed to perfectly mimic the official Instagram mobile and web applications. It uses HTTP/2 ALPN negotiation and strict TLS fingerprinting to bypass Meta's automated scraping defenses. It automatically injects the required `X-IG-App-ID`, `X-Instagram-AJAX`, and CSRF tokens into every request.

### 2. `auth/cookie-parser.ts`
Because Instagram uses heavily secured, HttpOnly cookies, standard login flows are unreliable. The `cookie-parser.ts` reads exported Netscape `cookies.txt` files directly, extracting the `sessionid`, `csrftoken`, and `ds_user_id`.

### 3. `config/config-manager.ts`
The configuration manager dynamically resolves settings from `.igmrc.json`, environment variables, and fallback defaults. It supports runtime overrides for `cardWidth`, `defaultCount`, and `retryDelayMs`.

### 4. `timing/human-delay.ts`
To evade rate limits when performing bulk API calls (e.g. liking, commenting), the `human-delay.ts` utility calculates non-linear, jittered micro-sleeps. This mathematically prevents requests from clustering on perfect millisecond intervals, which is a common heuristic used by Meta to ban bots.
