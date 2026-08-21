import * as blessed from "blessed";
import type { IGClient } from "../../core/http/ig-client";
import { Timeline } from "../../modules/timeline/services/timeline.service";

export async function renderTimeline(
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

	list.setItems(["Loading timeline..."]);
	screen.render();

	try {
		const timelineService = new Timeline(client);
		const feed = await timelineService.getFeed();

		const items = feed.map((post: any) => {
			const type =
				post.media_type === 1 ? "🖼️ " : post.media_type === 2 ? "🎬 " : "📸 ";
			const author = post.username;
			const caption = post.caption
				? post.caption.replace(/\n/g, " ").substring(0, 40)
				: "No caption";
			return `${type} @${author} - ${caption}... (♡ ${post.like_count})`;
		});

		list.setItems(items);

		list.on("select", (_item: any, index: number) => {
			const post = feed[index];
			if (!post) return;

			const overlay = blessed.box({
				parent: screen,
				top: "center",
				left: "center",
				width: "80%",
				height: "80%",
				border: "line",
				style: { border: { fg: "magenta" } },
				keys: true,
				vi: true,
				scrollable: true,
				alwaysScroll: true,
				content: `@${post.username}\n\n${post.caption}\n\n[Press Esc to close]`,
			});

			overlay.focus();
			screen.render();

			overlay.key(["escape", "q", "enter"], () => {
				overlay.destroy();
				list.focus();
				screen.render();
			});
		});
	} catch (e: any) {
		list.setItems([`Error loading timeline: ${e.message}`]);
	}

	screen.render();
}
