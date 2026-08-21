import type { IGClient } from "../../core/http/ig-client";
import { Downloader } from "../../modules/media-sync/services/downloader.service";
import { spin } from "../../shared/ui/spinner";

export const registerMediaCommands = (yargs: any, client: IGClient) => {
	yargs
		.command(
			["download <input>", "dl"],
			"Download all media from a post",
			(yargs: any) => {
				return yargs
					.positional("input", { describe: "Post URL or ID", type: "string" })
					.option("dir", {
						alias: "d",
						type: "string",
						default: "./downloads",
					});
			},
			async (argv: any) => {
				const s = spin("resolving media...");
				const downloader = new Downloader(client);
				s.succeed("started");
				await downloader.downloadPost(argv.input, argv.dir);
			},
		)
		.command(
			["download-profile <id>", "dlp"],
			"Bulk download a profile",
			(yargs: any) => {
				return yargs
					.positional("id", { describe: "User ID", type: "string" })
					.option("dir", {
						alias: "d",
						type: "string",
						default: "./downloads",
					});
			},
			async (argv: any) => {
				const s = spin("starting profile download...");
				const downloader = new Downloader(client);
				s.succeed("started");
				await downloader.downloadProfile(argv.id, argv.dir);
			},
		);
};
