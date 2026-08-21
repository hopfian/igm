# Shared UI and Utilities (`src/shared/`)

The `shared/` directory contains cross-cutting UI components, formatting utilities, and terminal styling constants that are used across all CLI commands. By centralizing these, IGM maintains a completely uniform visual language across its entire surface area.

**Related documentation**: [README.md](README.md) · [cli.md](cli.md) · [modules.md](modules.md)

---

## Theme Tokens

**Source**: [`src/shared/ui/theme.ts`](../src/shared/ui/theme.ts)

IGM uses the [`chalk`](https://github.com/chalk/chalk) package for 24-bit TrueColor terminal output. All styling is centralized in the `Theme` object. Never use `chalk` directly in feature modules — always import `Theme`.

| Token | Chalk Styling | Purpose |
|-------|---------------|---------|
| `Theme.primary` | `chalk.hex('#E1306C')` | Instagram Pink — primary brand color, used for headers, highlighted elements |
| `Theme.secondary` | `chalk.hex('#833AB4')` | Instagram Purple — secondary accents, interactive prompts |
| `Theme.accent` | `chalk.hex('#F56040')` | Instagram Orange — warnings, alerts, secondary highlights |
| `Theme.success` | `chalk.green` | Success indicators, checkmarks |
| `Theme.error` | `chalk.red` | Fatal errors, failures, unsend bot flags |
| `Theme.dim` | `chalk.gray` | Secondary text, timestamps, borders, IDs |
| `Theme.bold` | `chalk.bold` | Emphasized text, usernames, titles |
| `Theme.divider` | `chalk.gray('─')` | Horizontal separator lines |

---

## Card Component

**Source**: [`src/shared/ui/card.ts`](../src/shared/ui/card.ts)

The `Card` component is the fundamental building block of IGM's CLI output. It provides a standardized box-drawing container for rendering structured content. The width is controlled by `config.cardWidth` (default: 76).

### `Card.render(title, sections, options?)`

**Parameters:**
- `title` (string): The text to display in the top border of the card.
- `sections` (array): An array of strings or arrays of strings. Each array represents a distinct section of the card, separated by internal divider lines.
- `options` (object): Optional overrides (e.g. `borderColor`).

**Example Usage:**

```typescript
import { Card } from '../../shared/ui/card';
import { Theme } from '../../shared/ui/theme';

Card.render(
  `${Theme.bold(profile.username)}`,
  [
    [
      `ID: ${Theme.dim(profile.id)}`,
      `Name: ${profile.full_name}`
    ],
    [
      `Followers: ${Theme.primary(profile.follower_count)}`,
      `Following: ${Theme.primary(profile.following_count)}`
    ]
  ]
);
```

**Output Structure:**
The `Card` automatically handles line wrapping via `wrap-ansi` to ensure long text (like captions or bios) does not overflow the card width. It uses unicode box-drawing characters (`╭`, `╮`, `╰`, `╯`, `│`, `─`, `├`, `┤`) for crisp, contiguous borders.

---

## Interactive Paginator

**Source**: [`src/shared/ui/interactive.ts`](../src/shared/ui/interactive.ts)

For commands that return arrays of data (e.g., timeline, comments, followers), the `handleInteractiveState` function provides a uniform, paginated viewing experience using the `inquirer` prompt library.

### `handleInteractiveState(items, renderFn, typeName)`

**Parameters:**
- `items` (array): The complete array of items to paginate.
- `renderFn` (function): A callback function that takes a slice of items and renders them to the console (usually using `Card.render`).
- `typeName` (string): The label for the items (e.g., "posts", "comments").

**Behavior:**
1. Renders the first `config.defaultCount` items using `renderFn`.
2. If more items remain, displays an interactive prompt: `[Press Enter to load more ${typeName}, or Esc to exit]`.
3. If the user presses Enter, clears the prompt, renders the next chunk, and re-prompts.
4. If the user presses Esc (or if all items are exhausted), exits cleanly.

This centralizes the pagination loop and prevents feature modules from reinventing "Load More" logic.

---

## Spinner Utility

**Source**: [`src/shared/ui/spinner.ts`](../src/shared/ui/spinner.ts)

The `Spinner` utility wraps `ora` to provide standardized loading animations.

### `createSpinner(text)`

Returns a configured `ora` instance.

```typescript
const spinner = createSpinner('Loading timeline...').start();
// ... API call ...
spinner.succeed('Timeline loaded');
```

The CLI entry point ([`src/cli/index.ts`](cli.md#entry-point-srccliindexts)) maintains a global reference to the active spinner to ensure it is cleanly stopped (via `clearActiveSpinner()`) if a fatal error is thrown, preventing terminal cursor corruption.

---

## CSV Exporter

**Source**: [`src/shared/utils/csv-exporter.ts`](../src/shared/utils/csv-exporter.ts)

Handles formatting data for the [`--csv` and `--pipe` global flags](cli.md#global-flags).

### `exportCsv(data)`

1. **Flattening**: Recursively flattens deeply nested JSON objects into a single-level object. Keys are joined with underscores (e.g. `location.name` becomes `location_name`).
2. **Header Extraction**: Inspects the first item in the array to determine all available keys.
3. **Escaping**: Wraps values containing commas, quotes, or newlines in double quotes, and escapes internal double quotes (`"` -> `""`).
4. **Output**: Prints the CSV headers and data rows directly to `process.stdout`.

---

## Formatters

**Source**: [`src/shared/utils/formatters.ts`](../src/shared/utils/formatters.ts)

Centralized string manipulation utilities.

### `timeAgo(timestamp)`

Converts a Unix timestamp (seconds) into a human-readable relative time string:
- `< 60s` -> `Just now`
- `< 1h` -> `Xm` (e.g. `45m`)
- `< 24h` -> `Xh` (e.g. `2h`)
- `< 7d` -> `Xd` (e.g. `3d`)
- `> 7d` -> `Xw` (e.g. `2w`)

### `formatNumber(num)`

Formats numbers for readability:
- `< 10,000` -> comma separated (e.g. `4,500`)
- `>= 10,000` -> `K` suffix (e.g. `12.5K`)
- `>= 1,000,000` -> `M` suffix (e.g. `1.2M`)

### `truncate(str, length)`

Truncates a string to the specified length, appending `...` if it exceeds the limit. Used extensively to prevent long captions from breaking the layout in the [TUI Dashboard](tui.md).
