// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/ui.md (§ interactive.ts — Pagination Handler)
//     If keybindings, page info display, or the InteractiveOptions interface change, update the docs.
import { confirm, isCancel } from "@clack/prompts";
import chalk from "chalk";

export interface InteractiveOptions {
	onLoadMore?: () => Promise<boolean>; // Returns false if no more items
	pageInfo?: { current: number; total?: number };
}

/**
 * Interactive pagination handler using Clack prompts.
 * Prompts the user to load the next page via a smooth interactive toggle.
 */
export async function handleInteractiveState(opts: InteractiveOptions) {
	if (!opts.onLoadMore) return;

	const pageStr = opts.pageInfo
		? chalk.dim(
				`(Page ${opts.pageInfo.current}${opts.pageInfo.total ? `/${opts.pageInfo.total}` : ""})`,
			)
		: "";

	const loadNext = await confirm({
		message: `Load more items? ${pageStr}`,
		active: "yes",
		inactive: "no (quit)",
		initialValue: true,
	});

	if (isCancel(loadNext) || !loadNext) {
		return;
	}

	const hasMore = await opts.onLoadMore();

	if (hasMore) {
		const nextPage = opts.pageInfo
			? { current: opts.pageInfo.current + 1, total: opts.pageInfo.total }
			: undefined;
		await handleInteractiveState({ ...opts, pageInfo: nextPage });
	} else {
		console.log(`\n  ${chalk.dim("·")} ${chalk.dim("No more items.")}\n`);
	}
}
