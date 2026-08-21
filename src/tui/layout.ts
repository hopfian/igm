import * as blessed from "blessed";
import type { IGClient } from "../core/http/ig-client";
import { renderInbox } from "./components/inbox";
import { renderTimeline } from "./components/timeline";

export async function setupLayout(screen: blessed.Widgets.Screen, client: IGClient) {
	// Status Bar
	const statusBar = blessed.box({
		top: 0,
		left: 0,
		width: "100%",
		height: 1,
		content: " igm dashboard | Tab: Switch Pane | Enter: Open | Q: Quit ",
		style: {
			bg: "blue",
			fg: "white",
			bold: true,
		},
	});

	// Left Pane (Timeline)
	const leftPane = blessed.box({
		top: 1,
		left: 0,
		width: "50%",
		height: "100%-1",
		border: {
			type: "line",
		},
		style: {
			border: {
				fg: "gray",
			},
			focus: {
				border: {
					fg: "cyan",
				}
			}
		},
		label: " Timeline ",
	});

	// Right Pane (Inbox)
	const rightPane = blessed.box({
		top: 1,
		left: "50%",
		width: "50%",
		height: "100%-1",
		border: {
			type: "line",
		},
		style: {
			border: {
				fg: "gray",
			},
			focus: {
				border: {
					fg: "cyan",
				}
			}
		},
		label: " Inbox ",
	});

	screen.append(statusBar);
	screen.append(leftPane);
	screen.append(rightPane);

	let focusIndex = 0;
	const panes = [leftPane, rightPane];

	screen.key(["tab"], () => {
		focusIndex = (focusIndex + 1) % panes.length;
		panes[focusIndex].focus();
		screen.render();
	});

	// Initialize components asynchronously
	renderTimeline(screen, leftPane, client).catch(() => {});
	renderInbox(screen, rightPane, client).catch(() => {});

	// Initial focus
	leftPane.focus();
}
