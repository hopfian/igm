# UI/UX Design System

> Internal documentation for `src/ui/`.

---

## Design Principles

1. **Information Density**: Prioritize critical data while maintaining readability.
2. **Visual Hierarchy**: Use colors (`chalk`) and box-drawing characters to separate posts/sections.
3. **Symbolic Feedback**: Use high-fidelity Unicode symbols for common actions (likes, comments, notifications).
4. **Relative Time**: All timestamps are shown as human-readable relative time ("2h ago", "3d ago").
5. **Smart Numbers**: Large counts are abbreviated (1.5K, 2.3M) for scannability.

---

## § theme.ts — Color Palette & Symbols

Centralizes all aesthetic choices via the `Theme` object.

| Token | Color | Usage |
|-------|-------|-------|
| `primary` | Bold Magenta | igm branding, section headers |
| `secondary` | Bold Cyan | @usernames, handles |
| `accent` | Yellow | System alerts, transparency notes |
| `success` | Bold Green | Confirmations, stats |
| `error` | Bold Red | Fatal errors |
| `dim` | Dim | Timestamps, secondary info |
| `gray` | Gray | Empty states, borders |

### Symbols

`♥` heart · `💬` comment · `🔔` notification · `📩` inbox · `🔍` search · `🎬` reels · `🧭` explore · `📥` download · `👤` user · `🔒` private · `•` bullet · `─│┌┐└┘` box-drawing

---

## § spinner.ts — Braille Spinner

A reusable terminal spinner for async operations.

```
⠋ fetching timeline...
⠙ fetching timeline...
...
✓ 12 posts loaded
```

### API

| Export | Description |
|--------|-------------|
| `spin(label)` | Creates and starts a spinner. Returns `{ done(msg), fail(msg) }` |
| `clearActiveSpinner()` | Clears the active spinner (used in crash handler) |

Uses `\x1b[2K\r` to overwrite the current line cleanly. Integrated into `index.ts` catch-all for terminal cleanup on crash.

---

## § interactive.ts — Pagination Handler

Provides interactive [Space]/[Q] pagination for list commands.

```
· Press [Space] to load more, [Q] to quit. (page 1/5)
```

### Features
- **Page counter**: Shows current page and total pages
- **Auto-increment**: Page number increments on each load
- **End-of-list**: Shows "No more items." when exhausted
- **Clean exit**: Restores stdin raw mode on quit

---

## § output.ts — Data Export Engine

Handles structured data export in four formats.

### Exports

| Function | Description |
|----------|-------------|
| `handleDataExport(items, opts)` | Export posts/items (JSON/CSV/JSONL/file) |
| `handleUserExport(users, opts)` | Export users (JSON/CSV/JSONL/file) |
| `handleCommentExport(comments, opts)` | Export comments (JSON/CSV/JSONL/file) |

### File Extension Inference

| Extension | Format |
|-----------|--------|
| `.json` | Pretty-printed JSON |
| `.csv` | Columnar CSV with headers |
| `.jsonl` | Streaming JSONL (one object per line) |

### CSV Schemas

**Posts** (15 columns): `id, username, full_name, code, caption, like_count, comment_count, view_count, media_type, taken_at, location, has_liked, media_count, media_urls, url`

**Users** (10 columns): `pk, username, full_name, is_private, is_verified, follower_count, following_count, media_count, biography, external_url`

**Comments** (6 columns): `id, username, text, like_count, reply_count, created_at`

---

## § display.ts — Facade

Thin delegation layer mapping `Display.printX()` static methods to domain-specific renderers. Consumers import `Display` instead of individual render functions.

---

## § components/card.ts — Box-Drawing Card

The primary layout component for post rendering.

### Features
- Dynamic text wrapping with `stringWidth` for ANSI/emoji awareness
- Title integration in the top border: `┌─ @user (Name) · 2h ago ───┐`
- Hard-breaks for long unbreakable strings (URLs, hashes)
- Configurable width (default: 76 columns)

```
┌─ @user (Name) · 2h ago · 🎬 Video ───────────────────────────┐
│ This is a sample post caption that will automatically wrap    │
│ to fit within the card borders.                               │
│                                                               │
│ 📍 New York City                                              │
│                                                               │
│ • https://cdn.instagram.com/...                               │
│                                                               │
│ ♥ 1.2K   💬 56   👁 12.5K                                     │
│ https://www.instagram.com/p/ABC123/                           │
└───────────────────────────────────────────────────────────────┘
```

---

## § renderers/ — Domain Renderers

| File | Functions | Description |
|------|-----------|-------------|
| `timeline.ts` | `renderTimeline`, `renderComments` | Timeline cards with relative time, media badges, K/M stats |
| `user.ts` | `renderSearchResults`, `renderProfile`, `renderFriendship` | Profile cards, search list, friendship status matrix |
| `dm.ts` | `renderInbox`, `renderThread` | DM inbox list, thread messages |
| `misc.ts` | `renderNotifications`, `renderStoryTray`, `renderStories`, `renderSavedPosts` | Activity feed, stories with expiry countdown |
