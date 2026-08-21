// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/ui.md (§ spinner.ts — Braille Spinner)
//     If the API surface (spin, clearActiveSpinner, Spinner methods) changes, update the docs.
import chalk from 'chalk';

// ─── Braille spinner frames ─────────────────────────────────────────────────
const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const INTERVAL = 80;

// ─── Global active spinner tracking ─────────────────────────────────────────

let activeSpinner: Spinner | null = null;

/**
 * Stop and clear any currently active spinner.
 * Call before printing errors/warnings to prevent interleaving with animation.
 */
export function clearActiveSpinner() {
    if (activeSpinner) {
        activeSpinner.stop();
    }
}

/**
 * A minimal in-place terminal spinner.
 *
 *   const s = spin('fetching timeline');
 *   // ... async work ...
 *   s.done('3 posts loaded');
 */
export class Spinner {
    private msg: string;
    private timer: NodeJS.Timeout | null = null;
    private frame = 0;
    private active = false;

    constructor(msg: string) {
        this.msg = msg;
        this.start();
    }

    private start() {
        if (activeSpinner && activeSpinner !== this) {
            activeSpinner.stop();
        }
        activeSpinner = this;
        this.active = true;
        this.render();
        this.timer = setInterval(() => this.render(), INTERVAL);
    }

    private render() {
        if (!this.active) return;
        const f = chalk.magenta(FRAMES[this.frame % FRAMES.length]);
        const line = `  ${f} ${chalk.dim(this.msg)}`;
        process.stdout.write(`\x1b[2K\r${line}`);
        this.frame++;
    }

    private clearLine() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.active = false;
        if (activeSpinner === this) activeSpinner = null;
        process.stdout.write('\x1b[2K\r');
    }

    /** Stop with a success message. */
    done(msg?: string) {
        this.clearLine();
        console.log(`  ${chalk.green('✓')} ${chalk.green(msg || this.msg)}`);
    }

    /** Stop with an error message. */
    fail(msg?: string) {
        this.clearLine();
        console.log(`  ${chalk.red('✗')} ${chalk.red(msg || this.msg)}`);
    }

    /** Stop with a warning message. */
    warn(msg?: string) {
        this.clearLine();
        console.log(`  ${chalk.yellow('⚠')} ${chalk.yellow(msg || this.msg)}`);
    }

    /** Stop silently (no final line). */
    stop() {
        this.clearLine();
    }

    /** Update the spinner text mid-flight. */
    update(msg: string) {
        this.msg = msg;
    }
}

/**
 * Create and start a spinner. Returns the Spinner instance.
 */
export function spin(msg: string): Spinner {
    return new Spinner(msg);
}
