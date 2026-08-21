import type { IGClient } from "../../core/http/ig-client";
import { startDashboard } from "../../tui/index";

export const registerDashboardCommands = (yargs: any, client: IGClient) => {
	yargs.command(
		["dashboard", "ui", "tui"],
		"Launch the interactive full-screen dashboard",
		{},
		async (_argv: any) => {
			await startDashboard(client);
		},
	);
};
