// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/README.md (§ Architecture Overview, § Commands)
//     This is the CLI entry point. If commands, flags, or boot logic change, update the docs.
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { loadConfig } from "../core/config/config-manager";
import { IGClient } from "../core/http/ig-client";
import { clearActiveSpinner } from "../shared/ui/spinner";
import { Theme } from "../shared/ui/theme";
import {
	auth,
	dashboard,
	discover,
	dm,
	engage,
	identity,
	media,
	read,
} from "./commands";

async function main() {
	const _config = loadConfig();

	// Suppress header for export modes and standard yargs flags
	const suppressHeader = process.argv.some(
		(a) =>
			["--json", "--csv", "--pipe", "--version", "-v", "--help", "-h"].includes(
				a,
			) || a.startsWith("--out"),
	);
	if (!suppressHeader) {
		console.log("");
		console.log(
			`  ${Theme.primary("igm")} ${Theme.dim("·")} ${Theme.dim("v1.0")} ${Theme.dim(`${Theme.symbols.horizontal.repeat(27)} instagram terminal client`)}`,
		);
		console.log("");
	}

	const y = yargs(hideBin(process.argv))
		.scriptName("igm")
		.usage("$0 <command> [args]")
		.option("json", {
			type: "boolean",
			describe: "Output raw JSON data",
			default: false,
		})
		.option("csv", {
			type: "boolean",
			describe: "Output CSV data",
			default: false,
		})
		.option("pipe", {
			type: "boolean",
			describe: "Streaming JSONL output (one object per line)",
			default: false,
		})
		.option("out", {
			type: "string",
			describe: "Save output to file (JSON or CSV based on extension)",
		})
		.option("profile", {
			alias: "p",
			type: "string",
			describe: "Override active profile for this command",
		})
		.help();

	// Parse argv once to get global options like --profile before setting up client
	const parsedArgv = y.parseSync();
	const client = new IGClient(parsedArgv.profile as string);

	auth.registerAuthCommands(y);
	dashboard.registerDashboardCommands(y, client);
	discover.registerDiscoverCommands(y, client);
	dm.registerDMCommands(y, client);
	engage.registerEngageCommands(y, client);
	identity.registerSocialCommands(y, client);
	media.registerMediaCommands(y, client);
	read.registerReadCommands(y, client);

	y.demandCommand(1, "You need to specify a command").parse();
}

main().catch((error) => {
	clearActiveSpinner();
	console.error(Theme.error(`\n  ✗ ${error.message}`));
	process.exit(1);
});
