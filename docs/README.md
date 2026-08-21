# IGM (Instagram Terminal) Developer Documentation

IGM is a command-line interface and terminal user interface for interacting with Instagram's internal APIs. It provides a robust, anti-detection networking layer, a terminal-native presentation layer, and an advanced Playwright-based automation engine for bulk operations.

## Domain-Driven Design (DDD) Architecture

The codebase has been heavily refactored into a strict Domain-Driven Design structure to encapsulate business logic, UI rendering, and network requests by domain.

The `src/` directory is organized into five primary layers:

- **[`cli/`](cli.md)**: The command-line router. Binds CLI arguments (via yargs) to domain modules and services.
- **[`core/`](core.md)**: The foundational network and authentication layer. Contains the `IGClient`, `cookies.txt` parser, HTTP/2 TLS impersonation engine, rate-limit backoff, and rollout sync.
- **[`modules/`](modules.md)**: The business domain layer. Encapsulates all domain-specific models, services, and CLI UI renderers into distinct domains (`auth`, `identity`, `media-sync`, `messaging`, `timeline`).
- **`shared/`**: Global DTOs (Data Transfer Objects for the Instagram API), utilities, and shared CLI UI components (e.g., interactive paginators, spinners).
- **[`tui/`](tui.md)**: The Blessed-based full Terminal User Interface application.

## Advanced Subsystems
- **[`automation/`](automation.md)**: Embedded inside `modules/messaging/`, this is the IDMU (Instagram Direct Message Unsender) subsystem. It injects a hyper-optimized userscript into a Playwright browser to aggressively unsend messages while completely evading Instagram's bot-detection heuristics via vSync scroll-synchronization and `O(1)` geometrical DOM targeting.

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

## Global CLI Export Flags

Most commands support data export instead of UI rendering:
- `--json`: Output indented JSON.
- `--jsonl` or `--pipe`: Output JSON Lines for stdout piping.
- `--csv`: Output flattened CSV format.
- `--out <file>`: Write results to a file and show a terminal preview.

## Quick Command Reference

### Authentication (`igm auth`)
- `igm auth login`: Validates `cookies.txt` and caches the App ID rollout sync state.

### Messaging (`igm dm`)
- `igm dm inbox`: View active DM threads.
- `igm dm thread <id>`: View messages in a specific thread.
- `igm dm unsend <thread> <item>`: Unsend a single message via API.
- `igm dm unsend-all <id>`: Spawns the IDMU automation engine to unsend all messages.

### Timeline & Explore (`igm discover`)
- `igm discover feed`: View the home timeline feed.
- `igm discover explore`: View the explore grid.
- `igm discover reels`: View global reels.

### Identity & Users (`igm identity`)
- `igm identity info <username>`: View detailed profile information.
- `igm identity feed <username>`: View a user's chronological post feed.
- `igm identity status <username>`: Check friendship status (following/blocked/muted).
- `igm identity search <query>`: Search for accounts.

### TUI Dashboard (`igm dashboard`)
- `igm dashboard`: Launches the interactive Blessed Terminal UI.
