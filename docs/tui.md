# Terminal Dashboard (TUI) (`src/tui/`)

IGM provides an interactive, full-screen Terminal User Interface (TUI) powered by the [`blessed`](https://github.com/chjj/blessed) library. This dashboard allows users to monitor their inbox and timeline simultaneously without repeatedly running CLI commands.

**Related documentation**: [README.md](README.md) · [cli.md](cli.md) · [modules.md](modules.md)

---

## Architecture

```
src/tui/
├── index.ts                  # Screen bootstrap and event loop
├── layout.ts                 # Layout engine (split panes)
└── components/               # Widget definitions
    ├── inbox.ts              # Inbox list view
    └── timeline.ts           # Timeline feed view
```

The TUI operates on an absolute-positioned grid system. `blessed.screen()` initializes an alternate terminal buffer, taking full control of standard input and output.

---

## Layout Engine

**Source**: [`src/tui/layout.ts`](../src/tui/layout.ts)

The layout engine defines a static split-pane grid:

1. **Status Bar** (`statusBar`): A 1-row box fixed to `top: 0`, spanning `width: '100%'`. Displays the currently active profile, Instagram handle, and global hotkeys.
2. **Left Pane** (`leftPane`): A box at `top: 1`, `left: 0`, `width: '40%'`, `height: '100%-1'`. Hosts the Inbox component.
3. **Right Pane** (`rightPane`): A box at `top: 1`, `left: '40%'`, `width: '60%'`, `height: '100%-1'`. Hosts the Timeline component.

The `renderLayout()` function takes the main `screen` object and returns these three container boxes. Components are then appended to these containers.

---

## Components

### Inbox Component

**Source**: [`src/tui/components/inbox.ts`](../src/tui/components/inbox.ts)

The `InboxComponent` is a class that manages a `blessed.list` widget.

**Initialization Flow**:
1. Creates a `blessed.list` appended to `leftPane`.
2. Calls `DirectMessaging.getInbox()`.
3. Maps the `DMThread` array into an array of display strings: `[Title] - Last message snippet...`.
4. Sets the list `items` and calls `screen.render()`.

**Interactivity**:
- Focus can be toggled using `Tab`. When focused, the list border changes to `Theme.primary`.
- Arrow keys navigate the list.
- Pressing `Enter` on a selected thread triggers an overlay view (future expansion for full thread reading).

### Timeline Component

**Source**: [`src/tui/components/timeline.ts`](../src/tui/components/timeline.ts)

The `TimelineComponent` manages a `blessed.list` widget for the Home feed.

**Initialization Flow**:
1. Creates a `blessed.list` appended to `rightPane`.
2. Calls `Timeline.getFeed()`.
3. Iterates the `TimelineItem` array. For each post, it formats a 3-line entry:
   - Line 1: `@username (Type)`
   - Line 2: Caption (truncated via [`truncate()`](shared.md#formatters))
   - Line 3: `♥ Likes · 💬 Comments`
4. Sets the list `items` and calls `screen.render()`.

---

## Event Loop and State

**Source**: [`src/tui/index.ts`](../src/tui/index.ts)

The `startDashboard(client)` function bootstraps the entire TUI subsystem:

1. Initializes `blessed.screen({ smartCSR: true })`.
2. Sets up global exit keys (`C-c`, `q`, `Escape`) which cleanly exit the process via `process.exit(0)`.
3. Instantiates `renderLayout(screen)`.
4. Instantiates `InboxComponent(leftPane, client)` and `TimelineComponent(rightPane, client)`.
5. Binds the `Tab` key to toggle focus between the Inbox list and Timeline list.
6. Calls `screen.render()` to paint the initial layout, while the async component initializers fetch data in the background. As data arrives, the components independently call `screen.render()` to update their respective panes.
