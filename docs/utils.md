# Shared Utilities

The `src/utils/` module contains pure functions and helpers used across the core architecture, features, and presentation layer.

## Media Extraction (`media.ts`)

Handles the extraction of nested media node structures from raw API responses.

| Method | Signature | Description |
| :--- | :--- | :--- |
| `extractMediaUrls` | `(media: any) => string[]` | Extracts raw underlying asset URLs from a media node. Handles `carousel_media` arrays, `video_versions` objects, and `image_versions2` nodes recursively. |
| `parseMediaNode` | `(media: any) => TimelineItem \| null` | Transforms a raw `IGMediaNode` into a cleanly typed `TimelineItem`. Uses `extractMediaUrls` internally and dynamically reconstructs the `instagram.com/p/...` URL from the `code`. |

## String Formatting & Parsing (`parsers.ts`)

Pure utility functions for text manipulation, URL handling, and humanization.

| Method | Signature | Description |
| :--- | :--- | :--- |
| `timeAgo` | `(unixTs: number) => string` | Converts a Unix timestamp into relative strings (e.g., `5m ago`, `2h ago`). Falls back to `toLocaleDateString()` for older dates. |
| `formatNumber` | `(n: number) => string` | Truncates large integers for UI display using suffixes (e.g., `1.2M`, `5.4K`). Comma-separates smaller numbers. |
| `sanitizeInput` | `(input: string) => string` | Extracts the raw shortcode from a full URL, shortcode, or numeric ID string (e.g., parses out `p/xyz123`). |
| `shortcodeToId` | `(shortcode: string) => string` | Translates an Instagram base64 shortcode into a 64-bit BigInt string using IG's specific alphabet `A-Za-z0-9-_`. |
| `truncate` | `(str: string, maxLen: number) => string`| Hard truncates a string with a `...` suffix if it exceeds `maxLen`. |
| `termWidth` | `() => number` | Helper to fetch `process.stdout.columns`, falling back to `80`. |
| `mediaTypeLabel`| `(type?: number) => string` | Maps `IGMediaNode`'s `media_type` integer to a UI-friendly label (`1` ➔ Photo, `2` ➔ Video, `8` ➔ Carousel). |

## Error Management (`errors.ts`)

Defines custom exception classes and centralized CLI error handling.

**`handleError(e: any): never`**
The global error handler for command execution. When triggered, it:
1. Calls `clearActiveSpinner()` to prevent terminal cursor corruption.
2. Prints the fatal error message styled with `chalk.red('✗')`.
3. Exits the process with status code `1`.

**Custom Exception Classes:**
- `AuthError`: Thrown on `401`/`403` or when `cookies.txt` is missing.
- `RateLimitError`: Thrown on `429` (includes `resetAt` parameter if a retry backoff timeout is provided).
- `ParseError`: Thrown when response parsing fails or encounters unexpected schemas.
