// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/README.md (§ Feed Commands)
//     If commands, aliases, or options change, update the command table in the docs.
import type { IGClient } from "../../core/http/ig-client";
import { Profile } from "../../modules/identity/services/profile.service";
import { renderProfile } from "../../modules/identity/ui/identity.renderer";
import { Explore } from "../../modules/timeline/services/explore.service";
import { Reels } from "../../modules/timeline/services/reels.service";
import { Timeline } from "../../modules/timeline/services/timeline.service";
import {
	renderComments,
	renderTimeline,
} from "../../modules/timeline/ui/timeline.renderer";
import { handleInteractiveState } from "../../shared/ui/interactive-paginator";
import { spin } from "../../shared/ui/spinner";
import {
	handleCommentExport,
	handleDataExport,
	type OutputOptions,
} from "../../shared/utils/csv-exporter";

function getOutputOpts(argv: any): OutputOptions {
	return { json: argv.json, csv: argv.csv, pipe: argv.pipe, out: argv.out };
}

function isExportMode(opts: OutputOptions): boolean {
	return !!(opts.json || opts.csv || opts.pipe || opts.out);
}

export const registerReadCommands = (yargs: any, client: IGClient) => {
	yargs
		.command(
			["timeline", "tl"],
			"Home timeline",
			(yargs: any) => {
				return yargs.option("c", {
					alias: "count",
					type: "number",
					default: 10,
					describe: "Number of posts",
				});
			},
			async (argv: any) => {
				const opts = getOutputOpts(argv);
				const exporting = isExportMode(opts);
				const s = exporting ? null : spin("fetching timeline...");

				const timeline = new Timeline(client);
				const items = await timeline.getFeed();
				const count = argv.c;

				if (exporting) {
					handleDataExport(items.slice(0, count), opts);
					return;
				}

				s?.succeed(`${items.length} posts loaded`);
				renderTimeline(items.slice(0, count));

				const totalPages = Math.ceil(items.length / count);
				if (items.length > count) {
					let page = 0;
					await handleInteractiveState({
						pageInfo: { current: 1, total: totalPages },
						onLoadMore: async () => {
							page++;
							const slice = items.slice(page * count, (page + 1) * count);
							if (slice.length === 0) return false;
							renderTimeline(slice);
							return (page + 1) * count < items.length;
						},
					});
				}
			},
		)
		.command(
			["profile <user_id>", "p"],
			"View a user profile",
			(yargs: any) => {
				return yargs.positional("user_id", {
					describe: "User ID or username",
					type: "string",
				});
			},
			async (argv: any) => {
				const opts = getOutputOpts(argv);
				const exporting = isExportMode(opts);
				const s = exporting ? null : spin("fetching profile...");

				const profile = new Profile(client);
				const isNumeric = /^\d+$/.test(argv.user_id);
				const info = isNumeric
					? await profile.getProfile(argv.user_id)
					: await profile.getProfileByUsername(argv.user_id);

				if (exporting) {
					handleDataExport([info], opts);
					return;
				}

				s?.succeed(`@${info.username}`);
				renderProfile(info);
			},
		)
		.command(
			["posts <user_id>", "u"],
			"View a user's posts",
			(yargs: any) => {
				return yargs
					.positional("user_id", { describe: "User ID", type: "string" })
					.option("c", {
						alias: "count",
						type: "number",
						default: 10,
						describe: "Number of posts",
					});
			},
			async (argv: any) => {
				const opts = getOutputOpts(argv);
				const exporting = isExportMode(opts);
				const s = exporting ? null : spin("fetching user posts...");

				const profile = new Profile(client);
				const isNumeric = /^\d+$/.test(argv.user_id);
				const userId = isNumeric
					? argv.user_id
					: (await profile.getProfileByUsername(argv.user_id)).id;
				const items = await profile.getProfileFeed(userId);
				const count = argv.c;

				if (exporting) {
					handleDataExport(items.slice(0, count), opts);
					return;
				}

				s?.succeed(`${items.length} posts loaded`);
				renderTimeline(items.slice(0, count));

				const totalPages = Math.ceil(items.length / count);
				if (items.length > count) {
					let page = 0;
					await handleInteractiveState({
						pageInfo: { current: 1, total: totalPages },
						onLoadMore: async () => {
							page++;
							const slice = items.slice(page * count, (page + 1) * count);
							if (slice.length === 0) return false;
							renderTimeline(slice);
							return (page + 1) * count < items.length;
						},
					});
				}
			},
		)
		.command(
			["explore", "e"],
			"Explore page",
			(yargs: any) => {
				return yargs.option("c", {
					alias: "count",
					type: "number",
					default: 10,
					describe: "Number of posts",
				});
			},
			async (argv: any) => {
				const opts = getOutputOpts(argv);
				const exporting = isExportMode(opts);
				const s = exporting ? null : spin("fetching explore...");

				const explore = new Explore(client);
				const items = await explore.getExploreFeed();
				const count = argv.c;

				if (exporting) {
					handleDataExport(items.slice(0, count), opts);
					return;
				}

				s?.succeed(`${items.length} posts loaded`);
				renderTimeline(items.slice(0, count));

				const totalPages = Math.ceil(items.length / count);
				if (items.length > count) {
					let page = 0;
					await handleInteractiveState({
						pageInfo: { current: 1, total: totalPages },
						onLoadMore: async () => {
							page++;
							const slice = items.slice(page * count, (page + 1) * count);
							if (slice.length === 0) return false;
							renderTimeline(slice);
							return (page + 1) * count < items.length;
						},
					});
				}
			},
		)
		.command(
			["reels", "r"],
			"Reels feed",
			(yargs: any) => {
				return yargs.option("c", {
					alias: "count",
					type: "number",
					default: 10,
					describe: "Number of reels",
				});
			},
			async (argv: any) => {
				const opts = getOutputOpts(argv);
				const exporting = isExportMode(opts);
				const s = exporting ? null : spin("fetching reels...");

				const reels = new Reels(client);
				const items = await reels.getGlobalReels();
				const count = argv.c;

				if (exporting) {
					handleDataExport(items.slice(0, count), opts);
					return;
				}

				s?.succeed(`${items.length} reels loaded`);
				renderTimeline(items.slice(0, count));

				const totalPages = Math.ceil(items.length / count);
				if (items.length > count) {
					let page = 0;
					await handleInteractiveState({
						pageInfo: { current: 1, total: totalPages },
						onLoadMore: async () => {
							page++;
							const slice = items.slice(page * count, (page + 1) * count);
							if (slice.length === 0) return false;
							renderTimeline(slice);
							return (page + 1) * count < items.length;
						},
					});
				}
			},
		)
		.command(
			["comments <media_id>", "cm"],
			"View comments on a post",
			(yargs: any) => {
				return yargs
					.positional("media_id", { describe: "Media ID", type: "string" })
					.option("c", {
						alias: "count",
						type: "number",
						default: 20,
						describe: "Number of comments",
					});
			},
			async (argv: any) => {
				const opts = getOutputOpts(argv);
				const exporting = isExportMode(opts);
				const s = exporting ? null : spin("fetching comments...");

				const timeline = new Timeline(client);
				const comments = await timeline.getComments(argv.media_id);

				if (exporting) {
					handleCommentExport(comments.slice(0, argv.c), opts);
					return;
				}

				s?.succeed(`${comments.length} comments loaded`);
				renderComments(comments.slice(0, argv.c));
			},
		);
};
