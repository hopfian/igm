import { DefaultStrategy } from "./core/DefaultStrategy";
import { IDMU } from "./core/IDMU";

// Declare global properties for Playwright to access
declare global {
	interface Window {
		IDMU: typeof IDMU;
		DefaultStrategy: typeof DefaultStrategy;
		idmuEngine?: {
			start: (config?: any) => Promise<number>;
			stop: () => void;
			getUnsentCount: () => number;
		};
		onIDMUStatus?: (text: string) => void;
	}
}

export function main(window: Window) {
	// Expose the API to the window object so Playwright can interact with it
	window.IDMU = IDMU;
	window.DefaultStrategy = DefaultStrategy;

	// Helper for Playwright to easily start the unsend process
	window.idmuEngine = {
		start: async (config?: any): Promise<number> => {
			const onStatusText = (text: string) => {
				if (typeof window.onIDMUStatus === "function") {
					window.onIDMUStatus(text);
				} else {
					console.log(`[IDMU] ${text}`);
				}
			};

			const idmu = new IDMU(window, onStatusText);
			const strategy = new DefaultStrategy(idmu);
			if (config) {
				strategy.setConfig(config);
			}

			// Store the strategy temporarily so we can stop it if needed
			(window as any)._activeStrategy = strategy;

			await strategy.run();

			delete (window as any)._activeStrategy;
			return strategy.getUnsentCount();
		},
		stop: () => {
			const strategy = (window as any)._activeStrategy as
				| DefaultStrategy
				| undefined;
			if (strategy?.isRunning()) {
				strategy.stop();
			}
		},
		getUnsentCount: () => {
			const strategy = (window as any)._activeStrategy as
				| DefaultStrategy
				| undefined;
			return strategy ? strategy.getUnsentCount() : 0;
		},
	};

	console.log(
		"[IDMU] Headless engine initialized and ready on window.idmuEngine",
	);
}

if (typeof window !== "undefined") {
	main(window);
}
