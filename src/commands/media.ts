import { IGClient } from '../core/client';
import { Downloader } from '../features';
import { spin } from '../ui/spinner';

export const registerMediaCommands = (yargs: any, client: IGClient) => {
    yargs
        .command(['download <input>', 'dl'], 'Download all media from a post', (yargs: any) => {
            return yargs.positional('input', { describe: 'Post URL or ID', type: 'string' })
                        .option('dir', { alias: 'd', type: 'string', default: './downloads' });
        }, async (argv: any) => {
            const s = spin('resolving media...');
            const downloader = new Downloader(client);
            s.stop();
            await downloader.downloadPost(argv.input, argv.dir);
        })
        .command(['download-profile <id>', 'dlp'], 'Bulk download a profile', (yargs: any) => {
            return yargs.positional('id', { describe: 'User ID', type: 'string' })
                        .option('dir', { alias: 'd', type: 'string', default: './downloads' });
        }, async (argv: any) => {
            const s = spin('starting profile download...');
            const downloader = new Downloader(client);
            s.stop();
            await downloader.downloadProfile(argv.id, argv.dir);
        });
};
