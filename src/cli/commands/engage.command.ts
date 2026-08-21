// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/README.md (§ Engagement Commands)
//     If commands, aliases, or options change, update the command table in the docs.
import type { IGClient } from "../../core/http/ig-client";
import { Timeline } from "../../modules/timeline/services/timeline.service";
import { spin } from "../../shared/ui/spinner";

/**
 * Post engagement commands: like, unlike, save, unsave, comment, info.
 */
export const registerEngageCommands = (yargs: any, client: IGClient) => {
	yargs
		.command(
			["like <id>", "l"],
			"Like a post",
			(yargs: any) => {
				return yargs.positional("id", { describe: "Media ID", type: "string" });
			},
			async (argv: any) => {
				const s = spin("liking post...");
				const timeline = new Timeline(client);
				await timeline.likePost(argv.id);
				s.succeed("post liked");
			},
		)
		.command(
			["unlike <id>", "ul"],
			"Unlike a post",
			(yargs: any) => {
				return yargs.positional("id", { describe: "Media ID", type: "string" });
			},
			async (argv: any) => {
				const s = spin("unliking post...");
				const timeline = new Timeline(client);
				await timeline.unlikePost(argv.id);
				s.succeed("post unliked");
			},
		)
		.command(
			["save <id>", "sv"],
			"Save a post",
			(yargs: any) => {
				return yargs.positional("id", { describe: "Media ID", type: "string" });
			},
			async (argv: any) => {
				const s = spin("saving post...");
				const timeline = new Timeline(client);
				await timeline.savePost(argv.id);
				s.succeed("post saved");
			},
		)
		.command(
			["unsave <id>"],
			"Unsave a post",
			(yargs: any) => {
				return yargs.positional("id", { describe: "Media ID", type: "string" });
			},
			async (argv: any) => {
				const s = spin("unsaving post...");
				const timeline = new Timeline(client);
				await timeline.unsavePost(argv.id);
				s.succeed("post unsaved");
			},
		)
		.command(
			["comment <id> <text>", "cmt"],
			"Comment on a post",
			(yargs: any) => {
				return yargs
					.positional("id", { describe: "Media ID", type: "string" })
					.positional("text", { describe: "Comment text", type: "string" });
			},
			async (argv: any) => {
				const s = spin("posting comment...");
				const timeline = new Timeline(client);
				await timeline.addComment(argv.id, argv.text);
				s.succeed("comment added");
			},
		)
		.command(
			["info <id>"],
			"View detailed post info",
			(yargs: any) => {
				return yargs.positional("id", { describe: "Media ID", type: "string" });
			},
			async (argv: any) => {
				const opts = {
					json: argv.json,
					csv: argv.csv,
					pipe: argv.pipe,
					out: argv.out,
				};
				const isExport = !!(opts.json || opts.csv || opts.pipe || opts.out);
				const s = isExport ? null : spin("fetching post info...");

				const timeline = new Timeline(client);
				const item = await timeline.getPostInfo(argv.id);

				if (!item) {
					s?.fail("post not found");
					return;
				}
				if (isExport) {
					console.log(JSON.stringify([item], null, 2));
					return;
				}

				s!.succeed(`@${item.username}`);
				console.log(item);
			},
		);
};
