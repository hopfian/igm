# igm — instagram terminal client

> A high-performance, modular CLI client for Instagram, engineered for power users.

**Version:** 1.0.0  
**Runtime:** Node.js + TypeScript  

---

## Architecture Overview

igm follows a strictly decoupled, feature-oriented architecture designed for scalability and maintainability.

### Module Structure

```
src/
├── index.ts              Entry point & CLI bootstrap
├── commands/             CLI command routing (yargs)
│   ├── index.ts          Barrel — registerAllCommands()
│   ├── read.ts           Feed commands: timeline, profile, posts, explore, reels, comments
│   ├── dm.ts             DM commands: inbox, thread, message
│   ├── engage.ts         Engagement: like, unlike, save, unsave, comment, info
│   ├── social.ts         Social: follow, unfollow, block, unblock, restrict, mute, friendship
│   ├── discover.ts       Discovery: search, notifications, stories, saved
│   └── media.ts          Downloads: download, download-profile
├── core/                 Foundational engine
│   ├── auth.ts           Cookie parsing & CSRF extraction
│   ├── client.ts         HTTP client w/ retry, rate-limit, backoff
│   └── config.ts         .igmrc.json config management
├── features/             Domain-driven business logic
│   ├── timeline/         Home feed, comments, post engagement
│   ├── users/            Profile, stories
│   ├── dm/               Direct messaging
│   ├── explore/          Explore grid
│   ├── reels/            Clips/Reels via GraphQL
│   ├── search/           User search
│   ├── notifications/    Activity feed
│   └── media/            Post/profile downloader
├── models/               TypeScript domain interfaces
│   ├── timeline.ts       TimelineItem, CommentItem, StoryItem
│   ├── user.ts           ProfileInfo, SearchUser, FriendshipStatus
│   ├── dm.ts             DMThread, DMMessage
│   └── notification.ts   NotificationItem
├── schemas/              Instagram API response schemas
│   └── ig-api.ts         Raw API node interfaces (IGMediaNode, IGUserNode, etc.)
├── ui/                   Terminal rendering engine
│   ├── theme.ts          Color palette & symbols
│   ├── spinner.ts        Braille animation spinner
│   ├── interactive.ts    Pagination handler ([Space]/[Q])
│   ├── output.ts         Data export engine (JSON/CSV/JSONL/file)
│   ├── display.ts        Facade delegating to renderers
│   ├── components/
│   │   └── card.ts       Box-drawing card with word-wrap
│   └── renderers/        Domain-specific terminal renderers
│       ├── timeline.ts   Timeline cards + comments
│       ├── user.ts       Profile, search, friendship
│       ├── dm.ts         Inbox + thread
│       └── misc.ts       Notifications, stories, saved
└── utils/                Shared helpers
    ├── errors.ts         Custom error classes (AuthError, RateLimitError)
    ├── parsers.ts        timeAgo, formatNumber, sanitizeInput, shortcodeToId
    ├── media.ts          extractMediaUrls, parseMediaNode
    └── index.ts          Barrel export
```

---

## Installation & Setup

1. **Authentication**: igm uses cookie-based session replay.
   - Export your `cookies.txt` from your browser (Netscape format).
   - Place it in the project root (or set path in `.igmrc.json`).

2. **Build & Link**:
   ```bash
   npx tsc
   npm link
   ```

3. **Configuration** (optional): Create `.igmrc.json` in the project root:
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

4. **Usage**:
   ```bash
   igm <command> [args]
   ```

---

## Commands

### Feed Commands (`read.ts`)

| Command | Alias | Description |
|---------|-------|-------------|
| `timeline` | `tl` | Home timeline |
| `profile <id>` | `p` | View a user profile |
| `posts <id>` | `u` | View a user's posts |
| `explore` | `e` | Explore page |
| `reels` | `r` | Reels feed |
| `comments <id>` | `cm` | View comments |

### DM Commands (`dm.ts`)

| Command | Alias | Description |
|---------|-------|-------------|
| `inbox` | `i` | DM inbox |
| `thread <id>` | `th` | View a DM thread |
| `message <id> <text>` | `msg` | Send a DM |
| `unsend-all <id>` | `ua` | Unsend all DMs in a thread (Requires Playwright automation) |

### Engagement Commands (`engage.ts`)

| Command | Alias | Description |
|---------|-------|-------------|
| `like <id>` | `l` | Like a post |
| `unlike <id>` | `ul` | Unlike a post |
| `save <id>` | `sv` | Save/bookmark a post |
| `unsave <id>` | — | Unsave a post |
| `comment <id> <text>` | `cmt` | Comment on a post |
| `info <id>` | — | View detailed post info |

### Social Commands (`social.ts`)

| Command | Alias | Description |
|---------|-------|-------------|
| `follow <id>` | `f` | Follow a user |
| `unfollow <id>` | `uf` | Unfollow a user |
| `block <id>` | `b` | Block a user |
| `unblock <id>` | — | Unblock a user |
| `restrict <id>` | — | Restrict a user |
| `mute <id>` | — | Mute a user |
| `friendship <id>` | `fs` | Check friendship status |

### Discovery Commands (`discover.ts`)

| Command | Alias | Description |
|---------|-------|-------------|
| `search <query>` | `s` | Search for users |
| `notifications` | `n` | View notifications |
| `stories` | `st` | View stories tray |
| `story <id>` | — | View a user's stories |
| `saved` | `bm` | View saved/bookmarked posts |

### Media Commands (`media.ts`)

| Command | Alias | Description |
|---------|-------|-------------|
| `download <url>` | `dl` | Download media from a post |
| `download-profile <id>` | `dlp` | Bulk download a profile |

### Global Options

| Option | Description |
|--------|-------------|
| `-c, --count <n>` | Limit number of results |
| `--json` | Output raw JSON to stdout |
| `--csv` | Output CSV to stdout |
| `--pipe` | Streaming JSONL (one object per line) |
| `--out <file>` | Save to file (.json, .csv, or .jsonl) |

---

## Data Export

igm supports four structured export formats:

```bash
# Pretty JSON to stdout
igm tl -c 5 --json

# CSV with 15-column headers to stdout
igm r -c 10 --csv

# Streaming JSONL for piping
igm tl -c 20 --pipe | jq .username

# File export (format inferred from extension)
igm r -c 50 --out reels.json
igm r -c 50 --out reels.csv
igm r -c 50 --out reels.jsonl
```

### CSV Schema — Posts (15 columns)

`id, username, full_name, code, caption, like_count, comment_count, view_count, media_type, taken_at, location, has_liked, media_count, media_urls, url`

### CSV Schema — Users (10 columns)

`pk, username, full_name, is_private, is_verified, follower_count, following_count, media_count, biography, external_url`

### CSV Schema — Comments (6 columns)

`id, username, text, like_count, reply_count, created_at`

---

## Documentation Index

- [Core Engine](./core.md) — Auth, client, config
- [Feature Details](./features.md) — All feature modules
- [UI/UX Design](./ui.md) — Renderers, card, spinner, interactive, theme
- [Models & Schemas](./models.md) — Domain interfaces & API schemas
- [Utilities](./utils.md) — Parsers, media helpers, error classes
