// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/README.md (§ Architecture Overview, § Commands)
//     This is the CLI entry point. If commands, flags, or boot logic change, update the docs.
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { IGClient } from './core/client';
import { loadConfig } from './core/config';
import { registerAllCommands } from './commands';
import { Theme } from './ui/theme';
import { clearActiveSpinner } from './ui/spinner';

async function main() {
    const config = loadConfig();
    const client = new IGClient(config.cookieFile);

    // Suppress header for export modes and standard yargs flags
    const suppressHeader = process.argv.some(a => 
        ['--json', '--csv', '--pipe', '--version', '-v', '--help', '-h'].includes(a) || a.startsWith('--out')
    );
    if (!suppressHeader) {
        console.log('');
        console.log(`  ${Theme.primary('igm')} ${Theme.dim('·')} ${Theme.dim('v1.0')} ${Theme.dim(`${Theme.symbols.horizontal.repeat(27)} instagram terminal client`)}`);
        console.log('');
    }

    const y = yargs(hideBin(process.argv))
        .scriptName('igm')
        .usage('$0 <command> [args]')
        .option('json', { type: 'boolean', describe: 'Output raw JSON data', default: false })
        .option('csv', { type: 'boolean', describe: 'Output CSV data', default: false })
        .option('pipe', { type: 'boolean', describe: 'Streaming JSONL output (one object per line)', default: false })
        .option('out', { type: 'string', describe: 'Save output to file (JSON or CSV based on extension)' })
        .help();

    registerAllCommands(y, client);

    y.demandCommand(1, 'You need to specify a command')
     .parse();
}

main().catch(error => {
    clearActiveSpinner();
    console.error(Theme.error(`\n  ✗ ${error.message}`));
    process.exit(1);
});
