// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/README.md (§ Social Commands)
//     If commands, aliases, or options change, update the command table in the docs.
import type { IGClient } from "../../core/http/ig-client";
import { Profile } from "../../modules/identity/services/profile.service";
import { renderFriendship } from "../../modules/identity/ui/identity.renderer";
import { spin } from "../../shared/ui/spinner";
import { handleDataExport } from "../../shared/utils/csv-exporter";

/**
 * Social relationship commands: follow, unfollow, block, unblock, restrict, mute, friendship.
 */
export const registerSocialCommands = (yargs: any, client: IGClient) => {
	yargs
		.command(
			["follow <id>", "f"],
			"Follow a user",
			(yargs: any) => {
				return yargs.positional("id", { describe: "User ID", type: "string" });
			},
			async (argv: any) => {
				const s = spin("following user...");
				const profile = new Profile(client);
				await profile.followUser(argv.id);
				s.succeed("followed");
			},
		)
		.command(
			["unfollow <id>", "uf"],
			"Unfollow a user",
			(yargs: any) => {
				return yargs.positional("id", { describe: "User ID", type: "string" });
			},
			async (argv: any) => {
				const s = spin("unfollowing user...");
				const profile = new Profile(client);
				await profile.unfollowUser(argv.id);
				s.succeed("unfollowed");
			},
		)
		.command(
			["block <id>", "b"],
			"Block a user",
			(yargs: any) => {
				return yargs.positional("id", { describe: "User ID", type: "string" });
			},
			async (argv: any) => {
				const s = spin("blocking user...");
				const profile = new Profile(client);
				await profile.blockUser(argv.id);
				s.succeed("user blocked");
			},
		)
		.command(
			["unblock <id>"],
			"Unblock a user",
			(yargs: any) => {
				return yargs.positional("id", { describe: "User ID", type: "string" });
			},
			async (argv: any) => {
				const s = spin("unblocking user...");
				const profile = new Profile(client);
				await profile.unblockUser(argv.id);
				s.succeed("user unblocked");
			},
		)
		.command(
			["restrict <id>"],
			"Restrict a user",
			(yargs: any) => {
				return yargs.positional("id", { describe: "User ID", type: "string" });
			},
			async (argv: any) => {
				const s = spin("restricting user...");
				const profile = new Profile(client);
				await profile.restrictUser(argv.id);
				s.succeed("user restricted");
			},
		)
		.command(
			["mute <id>"],
			"Mute a user",
			(yargs: any) => {
				return yargs.positional("id", { describe: "User ID", type: "string" });
			},
			async (argv: any) => {
				const s = spin("muting user...");
				const profile = new Profile(client);
				await profile.muteUser(argv.id);
				s.succeed("user muted");
			},
		)
		.command(
			["friendship <id>", "fs"],
			"Check friendship status",
			(yargs: any) => {
				return yargs.positional("id", { describe: "User ID", type: "string" });
			},
			async (argv: any) => {
				const opts = {
					json: argv.json,
					csv: argv.csv,
					pipe: argv.pipe,
					out: argv.out,
				};
				const isExport = !!(opts.json || opts.csv || opts.pipe || opts.out);
				const s = isExport ? null : spin("checking friendship...");

				const profile = new Profile(client);
				const status = await profile.getFriendshipStatus(argv.id);

				if (isExport) {
					handleDataExport([status], opts);
					return;
				}

				s?.succeed("loaded");
				renderFriendship(status, argv.id);
			},
		);
};
