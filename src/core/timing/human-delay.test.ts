import { describe, expect, it } from "vitest";
import { humanDelay } from "./human-delay.js";

describe("Human Delay Timing", () => {
	it("humanDelay should return a value within bounds", () => {
		for (let i = 0; i < 50; i++) {
			const delay = humanDelay(100, 0.2); // Smaller sigma to stay close to 100
			expect(delay).toBeGreaterThanOrEqual(50);
			expect(delay).toBeLessThanOrEqual(5000);
		}
	});
});
