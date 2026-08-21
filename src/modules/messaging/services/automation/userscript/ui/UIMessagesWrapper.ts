import { loadMoreMessages } from "../dom/lookup";
import { UIComponent } from "./UIComponent";

export class UIMessagesWrapper extends UIComponent {
	fetchAndRenderThreadNextMessagePage(
		abortController: AbortController,
	): Promise<boolean> {
		return loadMoreMessages(this.root as HTMLElement, abortController);
	}
}
