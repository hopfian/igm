import * as blessed from "blessed";
import type { IGClient } from "../../core/http/ig-client";
import { DirectMessaging } from "../../modules/messaging/services/messaging.service";

export async function renderInbox(
	screen: blessed.Widgets.Screen,
	parent: blessed.Widgets.BoxElement,
	client: IGClient,
) {
	const list = blessed.list({
		parent,
		width: "100%",
		height: "100%",
		keys: true,
		vi: true,
		mouse: true,
		style: {
			selected: {
				bg: "blue",
				fg: "white",
			},
		},
	});

	list.setItems(["Loading inbox..."]);
	screen.render();

	try {
		const dmService = new DirectMessaging(client);
		const threads = await dmService.getInbox();

		const items = threads.map((thread: any) => {
			const users = thread.users.join(", ");
			const preview = thread.last_message ? thread.last_message.replace(/\n/g, " ").substring(0, 30) : "";
			return `💬 ${thread.thread_title || users} - ${preview}...`;
		});

		list.setItems(items);

		list.on("select", async (item: any, index: number) => {
			const thread = threads[index];
			if (!thread) return;

			const overlay = blessed.box({
				parent: screen,
				top: "center",
				left: "center",
				width: "80%",
				height: "80%",
				border: "line",
				style: { border: { fg: "green" } },
				keys: true,
				vi: true,
				scrollable: true,
				alwaysScroll: true,
				content: `Loading thread messages...`,
			});

			overlay.focus();
			screen.render();

			try {
				const details = await dmService.getThread(thread.thread_id);
				const formatted = details.map((m: any) => {
					const date = new Date(Number(m.timestamp) / 1000).toLocaleString();
					return `[${date}] User ${m.user_id}: ${m.text}`;
				}).reverse().join("\n");
				
				overlay.setContent(`--- ${thread.thread_title || thread.users.join(", ")} ---\n\n${formatted}\n\n[Press Esc to close]`);
			} catch (e: any) {
				overlay.setContent(`Failed to load thread: ${e.message}\n\n[Press Esc to close]`);
			}
			
			screen.render();

			overlay.key(["escape", "q", "enter"], () => {
				overlay.destroy();
				list.focus();
				screen.render();
			});
		});

	} catch (e: any) {
		list.setItems([`Error loading inbox: ${e.message}`]);
	}

	screen.render();
}
