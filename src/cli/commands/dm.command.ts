import type { IGClient } from "../../core/http/ig-client";
import { DirectMessaging } from "../../modules/messaging/services/messaging.service";

import { spin } from "../../shared/ui/spinner";

export const registerDMCommands = (yargs: any, client: IGClient) => {
	yargs
		.command(
			["inbox", "i"],
			"View DM inbox",
			(yargs: any) => {
				return yargs.option("c", {
					alias: "count",
					type: "number",
					default: 20,
					describe: "Number of threads",
				});
			},
			async (argv: any) => {
				const s = spin("fetching inbox...");
				const dm = new DirectMessaging(client);
				const threads = await dm.getInbox();
				s.succeed(`${threads.length} conversations loaded`);
				console.log(threads.slice(0, argv.c));
			},
		)
		.command(
			["thread <id>", "th"],
			"View a DM thread",
			(yargs: any) => {
				return yargs
					.positional("id", { describe: "Thread ID", type: "string" })
					.option("c", {
						alias: "count",
						type: "number",
						default: 50,
						describe: "Number of messages",
					});
			},
			async (argv: any) => {
				const s = spin("fetching thread...");
				const dm = new DirectMessaging(client);
				const messages = await dm.getThread(argv.id);
				s.succeed(`${messages.length} messages loaded`);
				console.log(messages.slice(0, argv.c));
			},
		)
		.command(
			["message <id> <text>", "msg"],
			"Send a DM",
			(yargs: any) => {
				return yargs
					.positional("id", { describe: "Thread ID", type: "string" })
					.positional("text", { describe: "Message text", type: "string" });
			},
			async (argv: any) => {
				const s = spin("sending message...");
				const dm = new DirectMessaging(client);
				await dm.sendMessage(argv.id, argv.text);
				s.succeed("message sent");
			},
		)
		.command(
			["unsend-all <id>", "ua"],
			"Unsend all DMs in a thread",
			(yargs: any) => {
				return yargs
					.positional("id", { describe: "Thread ID", type: "string" })
					.option("headless", {
						type: "boolean",
						default: true,
						describe: "Run headless (hidden browser)",
					})
					.option("slow-mo", {
						type: "number",
						default: 0,
						describe: "Slow down Playwright operations (ms)",
					})
					.option("delay", {
						type: "number",
						default: 1000,
						describe: "Minimum delay between unsends (ms)",
					})
					.option("max-failures", {
						type: "number",
						default: 5,
						describe: "Max consecutive unsend failures before aborting",
					})
					.option("top", {
						type: "boolean",
						default: false,
						describe: "Scroll to the very top and unsend oldest messages first",
					});
			},
			async (argv: any) => {
				const s = spin("Initializing browser automation...");
				const dm = new DirectMessaging(client);
				const total = await dm.unsendAllMessages(argv.id, {
					headless: argv.headless,
					slowMo: argv.slowMo,
					delayMs: argv.delay,
					maxFailures: argv.maxFailures,
					topFirst: argv.top,
					onProgress: (text: string) => {
						s.update(text);
					},
				});
				s.succeed(`Successfully unsent ${total} messages.`);
			},
		);
};
