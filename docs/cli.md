# CLI Command Reference (`src/cli/`)

Complete reference for every IGM command, subcommand, flag, alias, and behavioral mode. This document is the authoritative reference for the CLI surface area.

**Related documentation**: [README.md](README.md) · [core.md § IGClient](core.md#igclient-class) · [modules.md](modules.md)

---

## Entry Point (`src/cli/index.ts`)

The CLI boots in `main()` with the following sequence:

1. **Config Loading**: Calls `loadConfig()` from [`config-manager.ts`](../src/core/config/config-manager.ts) to read the XDG-persisted configuration.
2. **Header Suppression**: Scans `process.argv` for export flags (`--json`, `--csv`, `--pipe`, `--out`, `--version`, `--help`). If any are found, the branded header is suppressed for clean machine output.
3. **Branded Header**: If not suppressed, prints the `igm · v1.0` banner using [`Theme`](shared.md#theme-tokens) tokens.
4. **Yargs Initialization**: Creates the yargs instance with global options.
5. **Client Construction**: Parses argv synchronously via `y.parseSync()` to extract `--profile`, then constructs `new IGClient(parsedArgv.profile)`.
6. **Command Registration**: Calls all 8 `register*Commands()` functions from [`commands/index.ts`](../src/cli/commands/index.ts), passing the yargs instance and client.
7. **Execution**: Calls `y.demandCommand(1).parse()` to route to the matched handler.
8. **Error Handling**: Top-level `.catch()` calls `clearActiveSpinner()` and prints the error via `Theme.error()`.

### Command Modules

The 8 command modules are barrel-exported from `src/cli/commands/index.ts`:

| Module | File | Registration Function |
|--------|------|-----------------------|
| `auth` | `auth.command.ts` | `registerAuthCommands(yargs)` |
| `dashboard` | `dashboard.command.ts` | `registerDashboardCommands(yargs, client)` |
| `discover` | `discover.command.ts` | `registerDiscoverCommands(yargs, client)` |
| `dm` | `dm.command.ts` | `registerDMCommands(yargs, client)` |
| `engage` | `engage.command.ts` | `registerEngageCommands(yargs, client)` |
| `identity` | `identity.command.ts` | `registerSocialCommands(yargs, client)` |
| `media` | `media.command.ts` | `registerMediaCommands(yargs, client)` |
| `read` | `read.command.ts` | `registerReadCommands(yargs, client)` |

Note: `auth` does not receive the `client` parameter because its `login` subcommand constructs its own `IGClient("local")` internally to perform the pre-login CSRF fetch.

---

## Global Flags

These flags are registered at the yargs root level and are available to all commands:

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--json` | `boolean` | `false` | Output raw JSON data |
| `--csv` | `boolean` | `false` | Output flattened CSV data |
| `--pipe` | `boolean` | `false` | Output streaming JSONL (one JSON object per line) |
| `--out <file>` | `string` | — | Save output to file; format inferred from extension |
| `--profile`, `-p` | `string` | — | Override the active profile for this single command |
| `--help`, `-h` | — | — | Show help text (yargs built-in) |
| `--version`, `-v` | — | — | Show version (yargs built-in) |

---

## Command Reference

### Authentication (`igm auth`)

Defined in [`auth.command.ts`](../src/cli/commands/auth.command.ts). Uses [`@clack/prompts`](https://github.com/natemoo-re/clack) for interactive terminal flows.

#### `igm auth login [profile]`

Interactive login flow with username/password prompts. Handles the full Instagram authentication lifecycle:

1. **Pre-Login**: Calls `AuthService.preLogin()` → `GET https://www.instagram.com/` to populate initial CSRF and session cookies.
2. **Login**: Calls `AuthService.login(username, password)` → `POST web/accounts/login/ajax/` with the password encoded as `#PWD_INSTAGRAM_BROWSER:0:<timestamp>:<password>`.
3. **2FA Handling**: If the response contains `two_factor_required`, prompts for the 2FA code and calls `AuthService.submit2FA()` → `POST web/accounts/login/ajax/two_factor/`.
4. **Profile Persistence**: On success, saves the resulting cookie string to `config.profiles[profileName]` and sets `activeProfile` to the new profile name via [`saveConfig()`](core.md#configuration-manager).

| Positional | Type | Description |
|-----------|------|-------------|
| `profile` | `string` (optional) | Profile name to save the session under. Defaults to the entered username. |

#### `igm auth switch <profile>`

Switches the active authentication profile by updating `activeProfile` in the config store.

#### `igm auth list`

Lists all configured profiles, marking the currently active one with a green `•` indicator.

---

### Dashboard (`igm dashboard`)

Defined in [`dashboard.command.ts`](../src/cli/commands/dashboard.command.ts). Aliases: `ui`, `tui`.

Launches the full-screen interactive Blessed terminal UI. See [tui.md](tui.md) for complete documentation of the dashboard architecture.

---

### Content Reading (`igm <command>`)

Defined in [`read.command.ts`](../src/cli/commands/read.command.ts). All commands support [export flags](#global-flags) and interactive pagination via [`handleInteractiveState()`](shared.md#interactive-paginator).

| Command | Aliases | Description | Service Method | API Endpoint |
|---------|---------|-------------|----------------|--------------|
| `igm timeline` | `tl` | Home timeline feed | `Timeline.getFeed()` | `POST feed/timeline/` |
| `igm profile <user_id>` | `p` | View user profile | `Profile.getProfile()` or `getProfileByUsername()` | `GET users/:id/info/` or `GET users/web_profile_info/` |
| `igm posts <user_id>` | `u` | View user's posts | `Profile.getProfileFeed()` | `GET feed/user/:id/` |
| `igm explore` | `e` | Explore grid | `Explore.getExploreFeed()` | `GET discover/web/explore_grid/` |
| `igm reels` | `r` | Global reels feed | `Reels.getGlobalReels()` | `POST graphql/query` (doc_id: `27067550136266946`) |
| `igm comments <media_id>` | `cm` | Post comments | `Timeline.getComments()` | `GET media/:id/comments/` |

**Common Options**:

| Option | Alias | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--count` | `-c` | `number` | `10`/`20` | Number of items to display per page |

The `profile` command auto-detects whether `<user_id>` is a numeric ID or a username string via `/^\d+$/.test()` and routes to the appropriate API endpoint.

---

### Discovery (`igm <command>`)

Defined in [`discover.command.ts`](../src/cli/commands/discover.command.ts). All commands support [export flags](#global-flags).

| Command | Aliases | Description | Service Method | API Endpoint |
|---------|---------|-------------|----------------|--------------|
| `igm search <query>` | `s` | Search for users | `Search.searchUsers()` | `GET web/search/topsearch/` |
| `igm notifications` | `n` | View activity feed | `Notifications.getNotifications()` | `GET news/inbox/` |
| `igm stories` | `st` | View story tray | `Stories.getStoryTray()` | `GET feed/reels_tray/` |
| `igm story <user_id>` | — | View user's stories | `Stories.getUserStories()` | `GET feed/user/:id/story/` |
| `igm saved` | `bm` | View bookmarked posts | `Profile.getSavedPosts()` | `GET feed/saved/posts/` |

---

### Direct Messages (`igm <command>`)

Defined in [`dm.command.ts`](../src/cli/commands/dm.command.ts).

| Command | Aliases | Description | Service Method | API Endpoint |
|---------|---------|-------------|----------------|--------------|
| `igm inbox` | `i` | View DM inbox | `DirectMessaging.getInbox()` | `GET direct_v2/inbox/` |
| `igm thread <id>` | `th` | View thread messages | `DirectMessaging.getThread()` | `GET direct_v2/threads/:id/` |
| `igm message <id> <text>` | `msg` | Send a DM | `DirectMessaging.sendMessage()` | `POST direct_v2/threads/broadcast/text/` |
| `igm unsend-all <id>` | `ua` | Bulk unsend via IDMU | `DirectMessaging.unsendAllMessages()` | Playwright automation (see [automation.md](automation.md)) |

#### `igm unsend-all` Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--headless` | `boolean` | `true` | Run the Chromium browser in headless mode |
| `--slow-mo` | `number` | `0` | Artificially slow down Playwright operations (ms) |
| `--delay` | `number` | `1000` | Minimum delay between individual unsend operations (ms) |
| `--max-failures` | `number` | `5` | Abort after N consecutive unsend failures |
| `--top` | `boolean` | `false` | Scroll to the very top of the conversation and unsend oldest messages first |

---

### Post Engagement (`igm <command>`)

Defined in [`engage.command.ts`](../src/cli/commands/engage.command.ts). These are write operations against the authenticated user's account.

| Command | Aliases | Description | Service Method | API Endpoint |
|---------|---------|-------------|----------------|--------------|
| `igm like <id>` | `l` | Like a post | `Timeline.likePost()` | `POST web/likes/:id/like/` |
| `igm unlike <id>` | `ul` | Unlike a post | `Timeline.unlikePost()` | `POST web/likes/:id/unlike/` |
| `igm save <id>` | `sv` | Bookmark a post | `Timeline.savePost()` | `POST web/save/:id/save/` |
| `igm unsave <id>` | — | Remove bookmark | `Timeline.unsavePost()` | `POST web/save/:id/unsave/` |
| `igm comment <id> <text>` | `cmt` | Post a comment | `Timeline.addComment()` | `POST web/comments/:id/add/` |
| `igm info <id>` | — | View post details | `Timeline.getPostInfo()` | `GET media/:id/info/` |

---

### Social Relationships (`igm <command>`)

Defined in [`identity.command.ts`](../src/cli/commands/identity.command.ts). All are write operations against friendship endpoints.

| Command | Aliases | Description | Service Method | API Endpoint |
|---------|---------|-------------|----------------|--------------|
| `igm follow <id>` | `f` | Follow a user | `Profile.followUser()` | `POST friendships/create/:id/` |
| `igm unfollow <id>` | `uf` | Unfollow a user | `Profile.unfollowUser()` | `POST friendships/destroy/:id/` |
| `igm block <id>` | `b` | Block a user | `Profile.blockUser()` | `POST friendships/block/:id/` |
| `igm unblock <id>` | — | Unblock a user | `Profile.unblockUser()` | `POST friendships/unblock/:id/` |
| `igm restrict <id>` | — | Restrict a user | `Profile.restrictUser()` | `POST restrict_action/restrict/` |
| `igm mute <id>` | — | Mute a user | `Profile.muteUser()` | `POST friendships/mute_posts_or_story_from_follow/` |
| `igm friendship <id>` | `fs` | Check friendship status | `Profile.getFriendshipStatus()` | `GET friendships/show/:id/` |

---

### Media Download (`igm <command>`)

Defined in [`media.command.ts`](../src/cli/commands/media.command.ts).

| Command | Aliases | Description | Service Method |
|---------|---------|-------------|----------------|
| `igm download <input>` | `dl` | Download all media from a single post | `Downloader.downloadPost()` |
| `igm download-profile <id>` | `dlp` | Bulk download an entire user's feed | `Downloader.downloadProfile()` |

**Options**: `--dir` / `-d` (string, default `"./downloads"`) — Output directory.

The `<input>` parameter accepts: raw numeric media IDs, Instagram shortcodes, or full `instagram.com/p/<shortcode>/` URLs. The [`resolveMediaId()`](modules.md#media-sync-module) method handles all three formats.
