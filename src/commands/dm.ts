import { IGClient } from '../core/client';
import { DirectMessaging } from '../features';
import { Display } from '../ui/display';
import { spin } from '../ui/spinner';

export const registerDMCommands = (yargs: any, client: IGClient) => {
    yargs
        .command(['inbox', 'i'], 'View DM inbox', (yargs: any) => {
            return yargs.option('c', { alias: 'count', type: 'number', default: 20, describe: 'Number of threads' });
        }, async (argv: any) => {
            const s = spin('fetching inbox...');
            const dm = new DirectMessaging(client);
            const threads = await dm.getInbox();
            s.done(`${threads.length} conversations loaded`);
            Display.printInbox(threads.slice(0, argv.c));
        })
        .command(['thread <id>', 'th'], 'View a DM thread', (yargs: any) => {
            return yargs.positional('id', { describe: 'Thread ID', type: 'string' })
                        .option('c', { alias: 'count', type: 'number', default: 50, describe: 'Number of messages' });
        }, async (argv: any) => {
            const s = spin('fetching thread...');
            const dm = new DirectMessaging(client);
            const messages = await dm.getThread(argv.id);
            s.done(`${messages.length} messages loaded`);
            Display.printThread(messages.slice(0, argv.c));
        })
        .command(['message <id> <text>', 'msg'], 'Send a DM', (yargs: any) => {
            return yargs.positional('id', { describe: 'Thread ID', type: 'string' })
                        .positional('text', { describe: 'Message text', type: 'string' });
        }, async (argv: any) => {
            const s = spin('sending message...');
            const dm = new DirectMessaging(client);
            await dm.sendMessage(argv.id, argv.text);
            s.done('message sent');
        })
        .command(['unsend-all <id>', 'ua'], 'Unsend all DMs in a thread', (yargs: any) => {
            return yargs.positional('id', { describe: 'Thread ID', type: 'string' });
        }, async (argv: any) => {
            const s = spin('unsending all messages in thread...');
            s.done('Initializing browser automation...');
            const dm = new DirectMessaging(client);
            const total = await dm.unsendAllMessages(argv.id);
            console.log(`Successfully unsent ${total} messages.`);
        });
};
