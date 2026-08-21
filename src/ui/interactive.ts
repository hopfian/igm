// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/ui.md (§ interactive.ts — Pagination Handler)
//     If keybindings, page info display, or the InteractiveOptions interface change, update the docs.
import chalk from 'chalk';

export interface InteractiveOptions {
    onLoadMore?: () => Promise<boolean>; // Returns false if no more items
    pageInfo?: { current: number; total?: number };
}

/**
 * Interactive pagination handler.
 * After printing results, waits for [Space] to load more, [Q] to quit.
 */
export async function handleInteractiveState(opts: InteractiveOptions) {
    if (!opts.onLoadMore) return;

    return new Promise<void>((resolve) => {
        const pageStr = opts.pageInfo
            ? chalk.dim(` (page ${opts.pageInfo.current}${opts.pageInfo.total ? `/${opts.pageInfo.total}` : ''})`)
            : '';

        console.log(`\n  ${chalk.dim('·')} Press ${chalk.dim('[Space]')} to load more, ${chalk.dim('[Q]')} to quit.${pageStr}`);

        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }
        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        const listener = async (key: string) => {
            // Space → load more
            if (key === ' ') {
                process.stdin.removeListener('data', listener);
                if (process.stdin.isTTY) process.stdin.setRawMode(false);
                process.stdin.pause();

                // Clear the prompt line
                process.stdout.write('\x1b[1A\x1b[2K');

                const hasMore = await opts.onLoadMore!();
                if (hasMore) {
                    const nextPage = opts.pageInfo
                        ? { current: opts.pageInfo.current + 1, total: opts.pageInfo.total }
                        : undefined;
                    await handleInteractiveState({ ...opts, pageInfo: nextPage });
                } else {
                    console.log(`\n  ${chalk.dim('·')} ${chalk.dim('No more items.')}\n`);
                }
                resolve();
            }
            // Q or Ctrl+C → quit
            else if (key.toLowerCase() === 'q' || key === '\u0003') {
                process.stdin.removeListener('data', listener);
                if (process.stdin.isTTY) process.stdin.setRawMode(false);
                process.stdin.pause();
                console.log('');
                resolve();
                process.exit(0);
            }
        };

        process.stdin.on('data', listener);
    });
}
