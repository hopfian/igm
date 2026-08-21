# Utilities

> Internal documentation for `src/utils/`.

---

## § parsers.ts — Formatting & Parsing

### Time & Display

| Function | Signature | Description |
|----------|-----------|-------------|
| `timeAgo(unixTs)` | `number → string` | Converts timestamp to relative string: `2h ago`, `3d ago`, `1w ago` |
| `formatNumber(n)` | `number → string` | Smart abbreviation: `1,234` → `1.2K`, `1500000` → `1.5M` |
| `mediaTypeLabel(type?)` | `number → string` | Maps IG type to emoji label: `1→🖼️ Photo`, `2→🎬 Video`, `8→📸 Carousel` |
| `truncate(str, maxLen)` | `string → string` | Truncates with ellipsis: `"Hello World..." ` |
| `termWidth()` | `→ number` | Returns terminal column width (fallback: 80) |

### Instagram-Specific

| Function | Signature | Description |
|----------|-----------|-------------|
| `sanitizeInput(input)` | `string → string` | Extracts shortcode from URL or returns raw input |
| `shortcodeToId(shortcode)` | `string → string` | Converts base64-ish shortcode to numeric media ID |

---

## § media.ts — Media Extraction

Shared utilities to eliminate duplicated media parsing across all features.

| Function | Signature | Description |
|----------|-----------|-------------|
| `extractMediaUrls(media)` | `any → string[]` | Extracts all media URLs from a raw IG node (handles carousel, video, image) |
| `parseMediaNode(media)` | `any → TimelineItem \| null` | Full parse: user, caption, stats, URLs, metadata → domain model |

### Media Priority

1. `carousel_media[]` → iterate each item
2. `video_versions[0].url` (highest quality video)
3. `image_versions2.candidates[0].url` (highest quality image)

---

## § errors.ts — Error Classes

Custom error hierarchy for domain-specific error handling.

| Class | Description |
|-------|-------------|
| `AuthError` | Authentication/session failures (401, 403) |
| `RateLimitError` | Instagram rate limiting (429) |
| `ParseError` | Unexpected API response structure |

All errors extend the native `Error` class with an `errorCode` property for programmatic handling.
