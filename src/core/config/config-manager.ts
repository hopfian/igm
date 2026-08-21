// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/core.md (§ config.ts — Configuration)
//     If IGMConfig fields, defaults, or the config filename change, update the docs.
import Conf from "conf";

export type IGMConfig = {
	cookieFile: string;
	activeProfile: string;
	profiles: Record<string, string>;
	defaultCount: number;
	downloadDir: string;
	cardWidth: number;
	retryAttempts: number;
	retryDelayMs: number;
}

const CONFIG_DEFAULTS: IGMConfig = {
	cookieFile: "cookies.txt",
	activeProfile: "local",
	profiles: {},
	defaultCount: 10,
	downloadDir: "./downloads",
	cardWidth: 76,
	retryAttempts: 3,
	retryDelayMs: 1000,
};

// conf will automatically save this in the OS specific XDG Config directory
const config = new Conf({
	projectName: "igm",
	defaults: CONFIG_DEFAULTS,
});

/**
 * Load configuration from conf.
 */
export function loadConfig(): IGMConfig {
	return {
		cookieFile: config.get("cookieFile") as unknown as string,
		activeProfile: config.get("activeProfile") as unknown as string,
		profiles: (config.get("profiles") || {}) as unknown as Record<string, string>,
		defaultCount: config.get("defaultCount") as unknown as number,
		downloadDir: config.get("downloadDir") as unknown as string,
		cardWidth: config.get("cardWidth") as unknown as number,
		retryAttempts: config.get("retryAttempts") as unknown as number,
		retryDelayMs: config.get("retryDelayMs") as unknown as number,
	};
}

/**
 * Save configuration updates to conf.
 */
export function saveConfig(updates: Partial<IGMConfig>): IGMConfig {
	const current = loadConfig();
	const merged = { ...current, ...updates };
	
	for (const [key, value] of Object.entries(merged)) {
		config.set(key, value);
	}
	
	return merged;
}
