# Terminal UI (`src/tui/`)

The IGM `tui/` layer is a highly advanced, fully interactive terminal dashboard powered by [Blessed](https://github.com/chjj/blessed).

It bypasses standard CLI stdin/stdout streaming and completely takes over the terminal window to render absolute-positioned boxes, scrollable lists, and interactive menus, mimicking a native desktop application entirely within the command line.

## Architecture

- `index.ts`: The bootstrap entry point. Initializes the Blessed `screen`, handles global keyboard shortcuts (e.g. `q`, `C-c` to quit), and mounts the master layout.
- `layout.ts`: Defines the responsive CSS-like grid structure for the terminal. It sets up the sidebar navigation, the main content area, and the bottom status bar.
- `components/`: Specific "pages" or "widgets" within the TUI.

## Components

### `components/inbox.ts`
The Inbox component fetches threads from `messaging.service.ts` and renders them in a highly optimized `blessed.list`. It supports keyboard navigation (up/down arrows) to scroll through threads dynamically.

### `components/timeline.ts`
The Timeline component connects to `timeline.service.ts` to display rich Instagram posts. Because terminals cannot render images natively, it relies on advanced box-drawing characters and text-based formatting to represent visual posts, captions, and engagement metrics (likes/comments).

## Usage
The TUI is launched via the `dashboard` command.
```bash
igm dashboard
```
