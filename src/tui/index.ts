import * as blessed from "blessed";
import type { IGClient } from "../core/http/ig-client";
import { setupLayout } from "./layout";

export async function startDashboard(client: IGClient) {
	const screen = blessed.screen({
		smartCSR: true,
		title: "igm Dashboard",
		fullUnicode: true,
		dockBorders: true,
		ignoreLocked: ["C-c", "q"],
	});

	// Global exit keys
	screen.key(["escape", "q", "C-c"], () => {
		return process.exit(0);
	});

	await setupLayout(screen, client);

	screen.render();
}
