import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadConfig, saveConfig } from "./config-manager.js";

// We mock 'conf' to prevent writing to actual OS directories during tests
vi.mock("conf", () => {
	let store: any = {
		cookieFile: "cookies.txt",
		defaultCount: 10,
	};
	return {
		default: class MockConf {
			get(key: string) {
				return store[key];
			}
			set(key: string, value: any) {
				store[key] = value;
			}
			clear() {
				store = {};
			}
		},
	};
});

describe("ConfigManager", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should load default config correctly", () => {
		const config = loadConfig();
		expect(config.cookieFile).toBe("cookies.txt");
		expect(config.defaultCount).toBe(10);
	});

	it("should save and update config", () => {
		const updated = saveConfig({ defaultCount: 50 });
		expect(updated.defaultCount).toBe(50);
		expect(updated.cookieFile).toBe("cookies.txt"); // still preserves defaults

		const reloaded = loadConfig();
		expect(reloaded.defaultCount).toBe(50);
	});
});
