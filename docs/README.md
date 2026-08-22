<div align="center">
  <img src="../assets/IGM_Logo.png" alt="IGM Logo" width="200" />
</div>

# IGM Developer Documentation

IGM (Instagram Terminal) is a hardened command-line interface and interactive terminal dashboard for Instagram's internal private `api/v1` endpoints. It implements multi-layered anti-detection networking (TLS fingerprinting evasion, dynamic rollout hashing, log-normal request timing), domain-driven business logic encapsulation, and an embedded headless Playwright engine for DOM-level automation that bypasses REST API rate limits entirely.

This documentation is the authoritative source of truth for the IGM codebase. Every section directly references the source files it documents. If a source file and this documentation disagree, the source file is correct and this documentation must be updated.

---

## Table of Contents

| Document | Layer | Description |
|----------|-------|-------------|
| [cli.md](cli.md) | `src/cli/` | Complete CLI command reference — every command, flag, alias, and export mode |
| [core.md](core.md) | `src/core/` | Network engine — `IGClient`, TLS impersonation, cookie lifecycle, rollout hashing, request execution, human-delay timing |
| [modules.md](modules.md) | `src/modules/` | Domain modules — Auth, Identity, Messaging, Timeline, Media-Sync — every service method and API endpoint |
| [models.md](models.md) | `src/shared/dto/`, `src/modules/*/models/` | Complete type system — every TypeScript interface, every Zod schema, every field |
| [automation.md](automation.md) | `src/modules/messaging/services/automation/` | IDMU subsystem — Playwright orchestration, userscript injection, DOM manipulation, MutationObserver lifecycle, vSync scrolling |
| [tui.md](tui.md) | `src/tui/` | Blessed terminal dashboard — layout engine, inbox component, timeline component |
| [shared.md](shared.md) | `src/shared/` | Shared UI components — Card box-drawer, interactive paginator, spinner, theme tokens, CSV exporter, formatters |

---

## Architecture Overview

```
src/
├── cli/                          # Yargs CLI router & command registration
│   ├── index.ts                  # Entry point — IGClient bootstrap, header printing, global flags
│   └── commands/                 # 8 command modules (auth, dashboard, discover, dm, engage, identity, media, read)
│       └── index.ts              # Barrel re-export of all command modules
├── core/                         # Foundation layer — zero domain knowledge
│   ├── auth/cookie-parser.ts     # Netscape cookies.txt parser, CSRF extractor, Set-Cookie merger
│   ├── config/config-manager.ts  # XDG-compliant config via `Conf` — profiles, retry params, UI settings
│   ├── http/
│   │   ├── ig-client.ts          # 7-layer hardened HTTP engine — TLS, headers, rollout, timing, retry
│   │   ├── headers.ts            # Live rollout hash scraper — fetches server_revision from instagram.com
│   │   └── request.ts            # Transport layer — got-scraping (primary) / axios (fallback)
│   └── timing/human-delay.ts     # Log-normal distribution delay generator (Box-Muller transform)
├── modules/                      # Domain-Driven Design business logic
│   ├── auth/services/            # Login flow, 2FA verification
│   ├── identity/                 # Users, profiles, friendships, search, stories, notifications
│   │   ├── models/               # ProfileInfo, FriendshipStatus, SearchUser, NotificationItem
│   │   ├── services/             # Profile, Search, Stories, Notifications service classes
│   │   └── ui/                   # CLI renderers for profile cards, search results, notifications
│   ├── messaging/                # Instagram Direct (IGDM)
│   │   ├── models/               # DMThread, DMMessage
│   │   ├── services/             # DirectMessaging service + IDMU automation subsystem
│   │   └── ui/                   # CLI renderers for inbox and thread views
│   ├── media-sync/services/      # Parallel asset downloader (posts + full profiles)
│   └── timeline/                 # Feed, Explore, Reels, Comments
│       ├── models/               # TimelineItem, CommentItem, StoryItem
│       ├── services/             # Timeline, Explore, Reels service classes
│       ├── ui/                   # CLI renderers for feed cards and comment lists
│       └── utils/                # Media node parser and URL extractor
├── shared/                       # Cross-cutting concerns
│   ├── dto/ig-api.dto.ts         # Zod runtime validation schemas for raw IG API payloads
│   ├── ui/                       # Card, spinner, theme, interactive paginator
│   └── utils/                    # CSV exporter, formatters, error helpers
└── tui/                          # Blessed full-screen terminal dashboard
    ├── index.ts                  # Screen bootstrap, global exit keys
    ├── layout.ts                 # Split-pane grid (statusBar + leftPane + rightPane)
    └── components/               # Inbox list, timeline list with overlay detail views
```

---

## Configuration

IGM uses the [`Conf`](https://github.com/sindresorhus/conf) package for XDG-compliant, OS-native configuration storage. The config is persisted automatically to the platform's standard config directory (e.g. `%APPDATA%/igm/` on Windows, `~/.config/igm/` on Linux).

### `IGMConfig` Interface (defined in [`config-manager.ts`](../src/core/config/config-manager.ts))

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `cookieFile` | `string` | `"cookies.txt"` | Path to the Netscape-format cookie file for the `local` profile |
| `activeProfile` | `string` | `"local"` | Currently active authentication profile name |
| `profiles` | `Record<string, string>` | `{}` | Named profiles mapping profile names to raw cookie strings |
| `defaultCount` | `number` | `10` | Default item count for paginated commands |
| `downloadDir` | `string` | `"./downloads"` | Default output directory for media downloads |
| `cardWidth` | `number` | `76` | Terminal card width in characters for the box-drawing renderer |
| `retryAttempts` | `number` | `3` | Maximum retry attempts for failed API calls |
| `retryDelayMs` | `number` | `1000` | Base delay in milliseconds between retry attempts |

### Multi-Profile Authentication

IGM supports multiple named authentication profiles. When `activeProfile` is set to `"local"`, the client reads from the `cookieFile` path. When set to any other profile name, it reads the raw cookie string directly from `profiles[name]`. Profiles are managed via the [`igm auth`](cli.md#authentication-igm-auth) commands.

---

## Global Export System

Most read-only commands support four mutually compatible export modes, implemented via [`csv-exporter.ts`](../src/shared/utils/csv-exporter.ts):

| Flag | Behavior |
|------|----------|
| `--json` | Outputs indented `JSON.stringify(data, null, 2)` to stdout |
| `--csv` | Outputs flattened CSV with auto-generated headers |
| `--pipe` / `--jsonl` | Outputs one JSON object per line (JSON Lines format) for piping to `jq`, `grep`, etc. |
| `--out <file>` | Writes results to a file; format is inferred from extension (`.json` or `.csv`) |

When any export flag is active, the branded header and spinner UI are suppressed to produce clean machine-readable output. See [cli.md § Global Flags](cli.md#global-flags) for the complete flag reference.

---

## Cross-Reference Index

This index maps every source file to its documentation section for rapid navigation.

| Source File | Documentation |
|-------------|---------------|
| `src/cli/index.ts` | [cli.md § Entry Point](cli.md#entry-point-srcCliindexts) |
| `src/cli/commands/*.ts` | [cli.md § Command Reference](cli.md#command-reference) |
| `src/core/http/ig-client.ts` | [core.md § IGClient](core.md#igclient-class) |
| `src/core/http/request.ts` | [core.md § Request Execution](core.md#request-execution) |
| `src/core/http/headers.ts` | [core.md § Rollout Hash Scraper](core.md#rollout-hash-scraper) |
| `src/core/auth/cookie-parser.ts` | [core.md § Cookie Parser](core.md#cookie-parser) |
| `src/core/config/config-manager.ts` | [core.md § Configuration](core.md#configuration-manager) |
| `src/core/timing/human-delay.ts` | [core.md § Human Delay](core.md#human-delay-generator) |
| `src/modules/auth/` | [modules.md § Auth](modules.md#auth-module) |
| `src/modules/identity/` | [modules.md § Identity](modules.md#identity-module) |
| `src/modules/messaging/` | [modules.md § Messaging](modules.md#messaging-module) |
| `src/modules/timeline/` | [modules.md § Timeline](modules.md#timeline-module) |
| `src/modules/media-sync/` | [modules.md § Media-Sync](modules.md#media-sync-module) |
| `src/modules/messaging/services/automation/` | [automation.md](automation.md) |
| `src/shared/dto/ig-api.dto.ts` | [models.md § Zod Schemas](models.md#zod-runtime-validation-schemas) |
| `src/shared/ui/` | [shared.md](shared.md) |
| `src/tui/` | [tui.md](tui.md) |
