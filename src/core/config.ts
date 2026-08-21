// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/core.md (§ config.ts — Configuration)
//     If IGMConfig fields, defaults, or the config filename change, update the docs.
import * as fs from 'fs';
import * as path from 'path';

export interface IGMConfig {
    cookieFile: string;
    defaultCount: number;
    downloadDir: string;
    cardWidth: number;
    retryAttempts: number;
    retryDelayMs: number;
}

const CONFIG_DEFAULTS: IGMConfig = {
    cookieFile: 'cookies.txt',
    defaultCount: 10,
    downloadDir: './downloads',
    cardWidth: 76,
    retryAttempts: 3,
    retryDelayMs: 1000
};

const CONFIG_FILE = '.igmrc.json';

/**
 * Load configuration from .igmrc.json, falling back to defaults.
 */
export function loadConfig(): IGMConfig {
    const configPath = path.resolve(CONFIG_FILE);
    if (fs.existsSync(configPath)) {
        try {
            const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return { ...CONFIG_DEFAULTS, ...raw };
        } catch {
            return CONFIG_DEFAULTS;
        }
    }
    return CONFIG_DEFAULTS;
}

/**
 * Save configuration updates to .igmrc.json.
 */
export function saveConfig(updates: Partial<IGMConfig>): IGMConfig {
    const current = loadConfig();
    const merged = { ...current, ...updates };
    fs.writeFileSync(path.resolve(CONFIG_FILE), JSON.stringify(merged, null, 2));
    return merged;
}
