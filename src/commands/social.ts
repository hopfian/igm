// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/README.md (§ Social Commands)
//     If commands, aliases, or options change, update the command table in the docs.
import { IGClient } from '../core/client';
import { Profile } from '../features';
import { Display } from '../ui/display';
import { spin } from '../ui/spinner';
import { handleDataExport } from '../ui/output';

/**
 * Social relationship commands: follow, unfollow, block, unblock, restrict, mute, friendship.
 */
export const registerSocialCommands = (yargs: any, client: IGClient) => {
    yargs
        .command(['follow <id>', 'f'], 'Follow a user', (yargs: any) => {
            return yargs.positional('id', { describe: 'User ID', type: 'string' });
        }, async (argv: any) => {
            const s = spin('following user...');
            const profile = new Profile(client);
            await profile.followUser(argv.id);
            s.done('followed');
        })
        .command(['unfollow <id>', 'uf'], 'Unfollow a user', (yargs: any) => {
            return yargs.positional('id', { describe: 'User ID', type: 'string' });
        }, async (argv: any) => {
            const s = spin('unfollowing user...');
            const profile = new Profile(client);
            await profile.unfollowUser(argv.id);
            s.done('unfollowed');
        })
        .command(['block <id>', 'b'], 'Block a user', (yargs: any) => {
            return yargs.positional('id', { describe: 'User ID', type: 'string' });
        }, async (argv: any) => {
            const s = spin('blocking user...');
            const profile = new Profile(client);
            await profile.blockUser(argv.id);
            s.done('user blocked');
        })
        .command(['unblock <id>'], 'Unblock a user', (yargs: any) => {
            return yargs.positional('id', { describe: 'User ID', type: 'string' });
        }, async (argv: any) => {
            const s = spin('unblocking user...');
            const profile = new Profile(client);
            await profile.unblockUser(argv.id);
            s.done('user unblocked');
        })
        .command(['restrict <id>'], 'Restrict a user', (yargs: any) => {
            return yargs.positional('id', { describe: 'User ID', type: 'string' });
        }, async (argv: any) => {
            const s = spin('restricting user...');
            const profile = new Profile(client);
            await profile.restrictUser(argv.id);
            s.done('user restricted');
        })
        .command(['mute <id>'], 'Mute a user', (yargs: any) => {
            return yargs.positional('id', { describe: 'User ID', type: 'string' });
        }, async (argv: any) => {
            const s = spin('muting user...');
            const profile = new Profile(client);
            await profile.muteUser(argv.id);
            s.done('user muted');
        })
        .command(['friendship <id>', 'fs'], 'Check friendship status', (yargs: any) => {
            return yargs.positional('id', { describe: 'User ID', type: 'string' });
        }, async (argv: any) => {
            const opts = { json: argv.json, csv: argv.csv, pipe: argv.pipe, out: argv.out };
            const isExport = !!(opts.json || opts.csv || opts.pipe || opts.out);
            const s = isExport ? null : spin('checking friendship...');

            const profile = new Profile(client);
            const status = await profile.getFriendshipStatus(argv.id);

            if (isExport) { handleDataExport([status], opts); return; }

            s!.done('loaded');
            Display.printFriendship(status, argv.id);
        });
};
