// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/README.md (§ Feed Commands)
//     If commands, aliases, or options change, update the command table in the docs.
import { IGClient } from '../core/client';
import { Timeline, Profile, Explore, Reels } from '../features';
import { Display } from '../ui/display';
import { spin } from '../ui/spinner';
import { handleInteractiveState } from '../ui/interactive';
import { handleDataExport, handleCommentExport, OutputOptions } from '../ui/output';

function getOutputOpts(argv: any): OutputOptions {
    return { json: argv.json, csv: argv.csv, pipe: argv.pipe, out: argv.out };
}

function isExportMode(opts: OutputOptions): boolean {
    return !!(opts.json || opts.csv || opts.pipe || opts.out);
}

export const registerReadCommands = (yargs: any, client: IGClient) => {
    yargs
        .command(['timeline', 'tl'], 'Home timeline', (yargs: any) => {
            return yargs.option('c', { alias: 'count', type: 'number', default: 10, describe: 'Number of posts' });
        }, async (argv: any) => {
            const opts = getOutputOpts(argv);
            const exporting = isExportMode(opts);
            const s = exporting ? null : spin('fetching timeline...');

            const timeline = new Timeline(client);
            const items = await timeline.getFeed();
            const count = argv.c;

            if (exporting) { handleDataExport(items.slice(0, count), opts); return; }

            s!.done(`${items.length} posts loaded`);
            Display.printTimeline(items.slice(0, count));

            const totalPages = Math.ceil(items.length / count);
            if (items.length > count) {
                let page = 0;
                await handleInteractiveState({
                    pageInfo: { current: 1, total: totalPages },
                    onLoadMore: async () => {
                        page++;
                        const slice = items.slice(page * count, (page + 1) * count);
                        if (slice.length === 0) return false;
                        Display.printTimeline(slice);
                        return (page + 1) * count < items.length;
                    }
                });
            }
        })
        .command(['profile <user_id>', 'p'], 'View a user profile', (yargs: any) => {
            return yargs.positional('user_id', { describe: 'User ID or username', type: 'string' });
        }, async (argv: any) => {
            const opts = getOutputOpts(argv);
            const exporting = isExportMode(opts);
            const s = exporting ? null : spin('fetching profile...');

            const profile = new Profile(client);
            const info = await profile.getProfile(argv.user_id);

            if (exporting) { handleDataExport([info], opts); return; }

            s!.done(`@${info.username}`);
            Display.printProfile(info);
        })
        .command(['posts <user_id>', 'u'], 'View a user\'s posts', (yargs: any) => {
            return yargs.positional('user_id', { describe: 'User ID', type: 'string' })
                        .option('c', { alias: 'count', type: 'number', default: 10, describe: 'Number of posts' });
        }, async (argv: any) => {
            const opts = getOutputOpts(argv);
            const exporting = isExportMode(opts);
            const s = exporting ? null : spin('fetching user posts...');

            const profile = new Profile(client);
            const items = await profile.getProfileFeed(argv.user_id);
            const count = argv.c;

            if (exporting) { handleDataExport(items.slice(0, count), opts); return; }

            s!.done(`${items.length} posts loaded`);
            Display.printTimeline(items.slice(0, count));

            const totalPages = Math.ceil(items.length / count);
            if (items.length > count) {
                let page = 0;
                await handleInteractiveState({
                    pageInfo: { current: 1, total: totalPages },
                    onLoadMore: async () => {
                        page++;
                        const slice = items.slice(page * count, (page + 1) * count);
                        if (slice.length === 0) return false;
                        Display.printTimeline(slice);
                        return (page + 1) * count < items.length;
                    }
                });
            }
        })
        .command(['explore', 'e'], 'Explore page', (yargs: any) => {
            return yargs.option('c', { alias: 'count', type: 'number', default: 10, describe: 'Number of posts' });
        }, async (argv: any) => {
            const opts = getOutputOpts(argv);
            const exporting = isExportMode(opts);
            const s = exporting ? null : spin('fetching explore...');

            const explore = new Explore(client);
            const items = await explore.getExploreFeed();
            const count = argv.c;

            if (exporting) { handleDataExport(items.slice(0, count), opts); return; }

            s!.done(`${items.length} posts loaded`);
            Display.printTimeline(items.slice(0, count));

            const totalPages = Math.ceil(items.length / count);
            if (items.length > count) {
                let page = 0;
                await handleInteractiveState({
                    pageInfo: { current: 1, total: totalPages },
                    onLoadMore: async () => {
                        page++;
                        const slice = items.slice(page * count, (page + 1) * count);
                        if (slice.length === 0) return false;
                        Display.printTimeline(slice);
                        return (page + 1) * count < items.length;
                    }
                });
            }
        })
        .command(['reels', 'r'], 'Reels feed', (yargs: any) => {
            return yargs.option('c', { alias: 'count', type: 'number', default: 10, describe: 'Number of reels' });
        }, async (argv: any) => {
            const opts = getOutputOpts(argv);
            const exporting = isExportMode(opts);
            const s = exporting ? null : spin('fetching reels...');

            const reels = new Reels(client);
            const items = await reels.getGlobalReels();
            const count = argv.c;

            if (exporting) { handleDataExport(items.slice(0, count), opts); return; }

            s!.done(`${items.length} reels loaded`);
            Display.printTimeline(items.slice(0, count));

            const totalPages = Math.ceil(items.length / count);
            if (items.length > count) {
                let page = 0;
                await handleInteractiveState({
                    pageInfo: { current: 1, total: totalPages },
                    onLoadMore: async () => {
                        page++;
                        const slice = items.slice(page * count, (page + 1) * count);
                        if (slice.length === 0) return false;
                        Display.printTimeline(slice);
                        return (page + 1) * count < items.length;
                    }
                });
            }
        })
        .command(['comments <media_id>', 'cm'], 'View comments on a post', (yargs: any) => {
            return yargs.positional('media_id', { describe: 'Media ID', type: 'string' })
                        .option('c', { alias: 'count', type: 'number', default: 20, describe: 'Number of comments' });
        }, async (argv: any) => {
            const opts = getOutputOpts(argv);
            const exporting = isExportMode(opts);
            const s = exporting ? null : spin('fetching comments...');

            const timeline = new Timeline(client);
            const comments = await timeline.getComments(argv.media_id);

            if (exporting) { handleCommentExport(comments.slice(0, argv.c), opts); return; }

            s!.done(`${comments.length} comments loaded`);
            Display.printComments(comments.slice(0, argv.c));
        });
};
