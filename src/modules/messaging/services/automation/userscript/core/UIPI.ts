import { DefaultUI } from "../ui/DefaultUI";
import type { UIPIMessage } from "./UIPIMessage";

export class UIPI {
	private _ui: DefaultUI;

	constructor(ui: DefaultUI) {
		this._ui = ui;
	}

	static create(window: Window): UIPI {
		const ui = DefaultUI.create(window);
		return new UIPI(ui);
	}

	fetchAndRenderThreadNextMessagePage(
		abortController: AbortController,
	): Promise<boolean> {
		return this.ui.fetchAndRenderThreadNextMessagePage(abortController);
	}

	getNextUIPIMessage(
		abortController: AbortController,
		topFirst: boolean = false,
	): Promise<UIPIMessage | false> {
		return this.ui.getNextUIPIMessage(abortController, topFirst);
	}

	get ui(): DefaultUI {
		return this._ui;
	}
}
