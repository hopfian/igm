import { IGClient } from '../core/client';
import { registerReadCommands } from './read';
import { registerDMCommands } from './dm';
import { registerEngageCommands } from './engage';
import { registerSocialCommands } from './social';
import { registerDiscoverCommands } from './discover';
import { registerMediaCommands } from './media';

/**
 * Register all command groups with yargs.
 */
export function registerAllCommands(yargs: any, client: IGClient) {
    registerReadCommands(yargs, client);
    registerDMCommands(yargs, client);
    registerEngageCommands(yargs, client);
    registerSocialCommands(yargs, client);
    registerDiscoverCommands(yargs, client);
    registerMediaCommands(yargs, client);
}
