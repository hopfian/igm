import { UIPI } from "./UIPI";
import type { UIPIMessage } from "./UIPIMessage";

export class IDMU {
	public window: Window;
	public uipi: UIPI | null = null;
	public onStatusText: (text: string) => void;

	constructor(window: Window, onStatusText: (text: string) => void) {
		this.window = window;
		this.onStatusText = onStatusText;
	}

	getNextUIPIMessage(
		abortController: AbortController,
	): Promise<UIPIMessage | false> {
		if (!this.uipi) throw new Error("UIPI not loaded");
		return this.uipi.getNextUIPIMessage(abortController);
	}

	setStatusText(text: string) {
		this.onStatusText(text);
	}

	fetchAndRenderThreadNextMessagePage(
		abortController: AbortController,
	): Promise<boolean> {
		if (!this.uipi) throw new Error("UIPI not loaded");
		return this.uipi.fetchAndRenderThreadNextMessagePage(abortController);
	}

	loadUIPI() {
		const previousScrollTop = this.uipi?.ui?.lastScrollTop;
		this.uipi = UIPI.create(this.window);
		if (previousScrollTop !== undefined && this.uipi.ui) {
			this.uipi.ui.lastScrollTop = previousScrollTop;
		}
	}
}
