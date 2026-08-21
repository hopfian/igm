import { Theme } from "../../../shared/ui/theme";
import type { DMMessage, DMThread } from "../models/dm.model";

export function renderInbox(threads: DMThread[]): void {
	console.log(Theme.blue(`\n${Theme.symbols.inbox} INBOX\n`));
	if (threads.length === 0) {
		console.log(Theme.gray("  No conversations found."));
		return;
	}

	for (const t of threads) {
		console.log(
			`  ${Theme.primary(`${t.thread_title}`)} ${Theme.dim(`· ${t.thread_id}`)}`,
		);
		console.log(`  ${Theme.gray(`> ${t.last_message}`)}`);
		console.log();
	}
}

export function renderThread(messages: DMMessage[]): void {
	console.log(
		Theme.secondary(
			`\n  ${Theme.symbols.horizontal.repeat(5)} CONVERSATION ${Theme.symbols.horizontal.repeat(5)}\n`,
		),
	);
	if (messages.length === 0) {
		console.log(Theme.gray("  No messages found."));
		return;
	}
	for (const m of messages) {
		console.log(`  ${Theme.dim(`[${m.user_id}]`)} ${m.text}`);
	}
}
