# Blessed Terminal UI (`src/tui/`)

The IGM `tui/` application is an interactive graphical dashboard built on [Blessed](https://github.com/chjj/blessed), bypassing `stdout` to render absolute-positioned box elements over the terminal emulator.

## `layout.ts` (Grid Engine)
Instead of linear text outputs, `layout.ts` initializes the `blessed.screen` and generates a CSS-like flexbox grid.
- **Components**: Instantiates a top `statusBar` (height: 1), a `leftPane` spanning 50% width ("Timeline"), and a `rightPane` spanning 50% width ("Inbox").
- **State Management**: Mounts global hotkeys (`Tab` to cycle `focusIndex` across Panes, `Enter` to open selections, `Q` to quit).

## `components/inbox.ts`
Hooks directly into `src/modules/messaging/services/messaging.service.ts`.
It renders a highly-optimized `blessed.list` that listens to `up` and `down` key events to cycle through DM threads asynchronously.

## `components/timeline.ts`
Hooks into `src/modules/timeline/services/timeline.service.ts`.
Because terminals lack native raster image rendering, it uses ANSI box-drawing constraints to format post captions, like counts, and engagement metrics into constrained terminal real estate, dynamically truncating text based on the terminal's active `process.stdout.columns` width.
