// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/README.md (§ Discovery Commands)
//     If commands, aliases, or options change, update the command table in the docs.
import { IGClient } from '../core/client';
import { Search, Notifications, Profile } from '../features';
import { Stories } from '../features/users/stories';
import { Display } from '../ui/display';
import { spin } from '../ui/spinner';
import { handleDataExport, handleUserExport } from '../ui/output';

/**
 * Discovery commands: search, notifications, stories, saved posts.
 */
export const registerDiscoverCommands = (yargs: any, client: IGClient) => {
    yargs
        .command(['search <query>', 's'], 'Search for users', (yargs: any) => {
            return yargs.positional('query', { describe: 'Search query', type: 'string' })
                        .option('c', { alias: 'count', type: 'number', default: 10, describe: 'Number of results' });
        }, async (argv: any) => {
            const opts = { json: argv.json, csv: argv.csv, pipe: argv.pipe, out: argv.out };
            const isExport = !!(opts.json || opts.csv || opts.pipe || opts.out);
            const s = isExport ? null : spin(`searching "${argv.query}"...`);

            const search = new Search(client);
            const users = await search.searchUsers(argv.query);
            const sliced = users.slice(0, argv.c);

            if (isExport) { handleUserExport(sliced, opts); return; }

            s!.done(`${users.length} users found`);
            Display.printSearchResults(sliced);
        })
        .command(['notifications', 'n'], 'View notifications', (yargs: any) => {
            return yargs.option('c', { alias: 'count', type: 'number', default: 20, describe: 'Number of notifications' });
        }, async (argv: any) => {
            const opts = { json: argv.json, csv: argv.csv, pipe: argv.pipe, out: argv.out };
            const isExport = !!(opts.json || opts.csv || opts.pipe || opts.out);
            const s = isExport ? null : spin('fetching notifications...');

            const notifications = new Notifications(client);
            const data = await notifications.getNotifications();
            const all = [...data.new_stories, ...data.old_stories].slice(0, argv.c);

            if (isExport) { handleDataExport(all, opts); return; }

            s!.done(`${all.length} notifications loaded`);
            const newSlice = data.new_stories.slice(0, argv.c);
            const oldSlice = data.old_stories.slice(0, Math.max(0, argv.c - newSlice.length));
            Display.printNotifications(newSlice, oldSlice);
        })
        .command(['stories', 'st'], 'View stories tray', (yargs: any) => {
            return yargs.option('c', { alias: 'count', type: 'number', default: 20, describe: 'Number of users' });
        }, async (argv: any) => {
            const opts = { json: argv.json, csv: argv.csv, pipe: argv.pipe, out: argv.out };
            const isExport = !!(opts.json || opts.csv || opts.pipe || opts.out);
            const s = isExport ? null : spin('fetching stories...');

            const stories = new Stories(client);
            const tray = await stories.getStoryTray();
            const sliced = tray.slice(0, argv.c);

            if (isExport) { handleDataExport(sliced, opts); return; }

            s!.done(`${tray.length} story trays loaded`);
            Display.printStoryTray(sliced);
        })
        .command(['story <user_id>'], 'View a user\'s stories', (yargs: any) => {
            return yargs.positional('user_id', { describe: 'User ID', type: 'string' });
        }, async (argv: any) => {
            const opts = { json: argv.json, csv: argv.csv, pipe: argv.pipe, out: argv.out };
            const isExport = !!(opts.json || opts.csv || opts.pipe || opts.out);
            const s = isExport ? null : spin('fetching user stories...');

            const stories = new Stories(client);
            const items = await stories.getUserStories(argv.user_id);

            if (isExport) { handleDataExport(items, opts); return; }

            s!.done(`${items.length} stories loaded`);
            Display.printStories(items);
        })
        .command(['saved', 'bm'], 'View saved/bookmarked posts', (yargs: any) => {
            return yargs.option('c', { alias: 'count', type: 'number', default: 10, describe: 'Number of posts' });
        }, async (argv: any) => {
            const opts = { json: argv.json, csv: argv.csv, pipe: argv.pipe, out: argv.out };
            const isExport = !!(opts.json || opts.csv || opts.pipe || opts.out);
            const s = isExport ? null : spin('fetching saved posts...');

            const profile = new Profile(client);
            const items = await profile.getSavedPosts();

            if (isExport) { handleDataExport(items.slice(0, argv.c), opts); return; }

            s!.done(`${items.length} saved posts loaded`);
            Display.printSavedPosts(items.slice(0, argv.c));
        });
};
