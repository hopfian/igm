# IGM Developer Documentation

IGM (Instagram Terminal) is a command-line interface for interacting with Instagram's internal APIs. It provides a robust, anti-detection networking layer and a terminal-native presentation layer.

## Architecture Overview

The codebase is organized into five strict layers within `src/`:

- **`core/`**: The network and authentication layer. Contains the `IGClient`, `cookies.txt` parser, HTTP/2 TLS impersonation engine, rate-limit backoff, and rollout sync.
- **`features/`**: The business logic layer. Implements domain-specific API calls (e.g., timeline, DMs, search, explore, users).
- **`ui/`**: The presentation layer. Contains the braille spinner, theme definitions, box-drawing card component, interactive paginator, and data export engine.
- **`models/` & `schemas/`**: The type system. `schemas/` defines raw API structures, while `models/` defines clean domain interfaces.
- **`commands/`**: The CLI router. Uses `yargs` to bind CLI arguments to feature methods and UI renderers.

## Configuration

IGM relies on a `.igmrc.json` configuration file in the working directory and a valid Netscape format `cookies.txt` file for authentication.

Default configuration:
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

## Command Reference

### Global Export Flags
Most commands support data export instead of UI rendering:
- `--json`: Output indented JSON.
- `--jsonl` or `--pipe`: Output JSON Lines for stdout piping.
- `--csv`: Output flattened CSV format.
- `--out <file>`: Write results to a file and show a terminal preview.

### Authentication
- `igm auth login`: Validates the current `cookies.txt` and tests API access.

### Timeline
- `igm tl feed`: Interactively scroll through the home timeline feed.
- `igm tl comments <id>`: View comments for a post.
- `igm tl like <id>` / `unlike <id>`: Like/unlike a post.
- `igm tl save <id>` / `unsave <id>`: Bookmark/unbookmark a post.
- `igm tl add-comment <id> <text>`: Post a new comment.

### Direct Messages
- `igm dm inbox`: View active DM threads.
- `igm dm thread <id>`: View messages in a specific thread.
- `igm dm unsend <thread> <item>`: Unsend a single message via API.
- `igm dm unsend-all <id>`: Spawn a headless Playwright automation script to aggressively unsend all messages while evading rate limits.
  - `--no-headless`: Run with a visible browser.
  - `--slow-mo <ms>`: Delay Playwright operations.
  - `--delay <ms>`: Delay between unsends (default 1000).
  - `--max-failures <n>`: Abort after N consecutive rate limits (default 5).

### Users & Profiles
- `igm user info <username>`: View detailed profile information.
- `igm user feed <username>`: View a user's chronological post feed.
- `igm user status <username>`: Check friendship status (following/blocked/muted).
- `igm user follow <username>` / `unfollow <username>`
- `igm user block <username>` / `unblock <username>`
- `igm user restrict <username>` / `mute <username>`
- `igm user saved`: View your saved/bookmarked posts.

### Search & Explore
- `igm search users <query>`: Search for accounts.
- `igm explore feed`: Interactively view the explore grid.
- `igm reels feed`: Interactively view global reels.

### Media Downloader
- `igm media dl-post <id/shortcode/url>`: Download all assets from a single post.
- `igm media dl-profile <username>`: Download all media from a user's entire feed.

### Notifications & Stories
- `igm notif list`: View recent unread and read notifications.
- `igm stories tray`: View the top tray of users with active stories.
- `igm stories get <username>`: View a user's active story segments.
