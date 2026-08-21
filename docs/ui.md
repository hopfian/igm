# UI & Presentation Layer

The `src/ui/` module handles all terminal presentation, interactive pagination, loading animations, and data exporting. The architecture strictly separates business logic (in `features/`) from rendering logic.

## Display Facade (`display.ts`)

The `Display` class acts as the single entry point for all command outputs. Rather than importing individual renderers into command files, commands invoke static methods on `Display` (e.g., `Display.printTimeline(items)`), which delegates to domain-specific renderers in `src/ui/renderers/`.

## Data Export Engine (`output.ts`)

Commands support piping and exporting raw data via the `--json`, `--csv`, and `--out` flags. The `output.ts` engine intercepts the domain objects before rendering if export flags are active.

**Supported Formats:**
- `.json`: Standard indented JSON array.
- `.jsonl`: JSON Lines (one object per line), ideal for piping into `jq` or file streams.
- `.csv`: Flattened tabular format with custom headers per domain.

**CSV Schemas:**
- **Posts (`toPostCSV`)**: `id`, `username`, `full_name`, `code`, `caption`, `like_count`, `comment_count`, `view_count`, `media_type`, `taken_at`, `location`, `has_liked`, `media_count`, `media_urls`, `url`
- **Users (`toUserCSV`)**: `pk`, `username`, `full_name`, `is_private`, `is_verified`, `follower_count`, `following_count`, `media_count`, `biography`, `external_url`
- **Comments (`toCommentCSV`)**: `id`, `username`, `text`, `like_count`, `reply_count`, `created_at`

When exporting to a file, `output.ts` automatically prints a truncated terminal preview of the first 3 items to confirm success without overflowing stdout.

## Interactive Pagination (`interactive.ts`)

Implements raw TTY input handling for interactive pagination (e.g., in Explore or Timeline streams).
- Suspends standard output and enables `process.stdin.setRawMode(true)`.
- **`[Space]`**: Triggers the `onLoadMore` async callback, increments page counters, and redraws.
- **`[Q]`** or `Ctrl+C`: Safely restores terminal state and exits the process.

## Terminal Spinner (`spinner.ts`)

A minimal, in-place braille spinner (`⠋`, `⠙`, `⠹`, ...) running on an 80ms interval.

**API:**
- `spin(msg)`: Starts a new spinner, automatically destroying any previously active spinner.
- `s.done(msg)`, `s.fail(msg)`, `s.warn(msg)`: Halts the spinner, clears the line, and prints the final status.
- `s.update(msg)`: Modifies the spinner text mid-flight.
- `clearActiveSpinner()`: Global utility to halt the active spinner before printing fatal errors from other modules, preventing TTY cursor corruption.

## UI Components & Theme

### `theme.ts` — Color Palette & Symbols
Centralizes styling using `chalk`. Defines structural colors (`primary`, `secondary`, `accent`, `error`, `success`) and a dictionary of consistent ASCII/Unicode symbols (e.g., `symbols.heart`, `symbols.bullet`, `symbols.vertical`).

### `components/card.ts` — Box-Drawing
A robust layout utility for drawing bordered ASCII cards around textual content.
- Precisely calculates visible `stringWidth` to handle ANSI color code interference.
- Implements custom word-wrapping:
  - Wraps naturally at spaces.
  - Hard-breaks long unbreakable tokens (like URLs or base64 hashes) dynamically to prevent border overflow.
