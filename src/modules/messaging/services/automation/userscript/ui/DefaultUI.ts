import { UIPIMessage } from "../core/UIPIMessage";
import { findMessagesWrapper, getFirstVisibleMessage } from "../dom/lookup";
import { UIComponent } from "./UIComponent";
import { UIMessage } from "./UIMessage";
import { UIMessagesWrapper } from "./UIMessagesWrapper";

export class DefaultUI extends UIComponent {
	public lastScrollTop: number | null = null;

	static create(window: Window): DefaultUI {
		const messagesWrapperElement = findMessagesWrapper(window);
		if (messagesWrapperElement !== null) {
			const uiMessagesWrapper = new UIMessagesWrapper(messagesWrapperElement);
			return new DefaultUI(window.document.body, { uiMessagesWrapper });
		} else {
			throw new Error(
				"Unable to find messagesWrapperElement. The query selector might be out of date.",
			);
		}
	}

	async fetchAndRenderThreadNextMessagePage(
		abortController: AbortController,
	): Promise<boolean> {
		return await this.identifier.uiMessagesWrapper.fetchAndRenderThreadNextMessagePage(
			abortController,
		);
	}

	async getNextUIPIMessage(
		abortController: AbortController,
	): Promise<UIPIMessage | false> {
		const uiMessagesWrapperRoot = this.identifier.uiMessagesWrapper
			.root as HTMLElement;
		const window = this.root.ownerDocument.defaultView;
		if (!window) return false;

		const style = window.getComputedStyle(uiMessagesWrapperRoot);
		const isReversed = style.flexDirection === "column-reverse";

		try {
			const messageElement = getFirstVisibleMessage(
				uiMessagesWrapperRoot,
				abortController,
				window,
			);
			if (messageElement) {
				const uiMessage = new UIMessage(messageElement);
				return new UIPIMessage(uiMessage);
			}
		} catch (ex) {
			console.error(ex);
		}

		if (isReversed) {
			const minScroll = -(
				uiMessagesWrapperRoot.scrollHeight -
				uiMessagesWrapperRoot.clientHeight
			);
			const startPos =
				this.lastScrollTop !== null
					? Math.max(this.lastScrollTop, minScroll)
					: 0;

			const totalRange = Math.abs(minScroll);
			const step = totalRange < 500 ? 50 : 300;

			for (let i = startPos; i >= minScroll; i = i - step) {
				if (abortController.signal.aborted) {
					return false;
				}
				this.lastScrollTop = i;
				uiMessagesWrapperRoot.scrollTop = i;
				uiMessagesWrapperRoot.dispatchEvent(new Event("scroll"));
				await new Promise((resolve) => window.requestAnimationFrame(resolve));
				try {
					const messageElement = getFirstVisibleMessage(
						uiMessagesWrapperRoot,
						abortController,
						window,
					);
					if (messageElement) {
						const uiMessage = new UIMessage(messageElement);
						return new UIPIMessage(uiMessage);
					}
				} catch (ex) {
					console.error(ex);
				}
			}
		} else {
			const maxScroll =
				uiMessagesWrapperRoot.scrollHeight -
				uiMessagesWrapperRoot.clientHeight;
			const startScrollTop =
				this.lastScrollTop !== null
					? Math.min(this.lastScrollTop, maxScroll)
					: maxScroll;

			const step = maxScroll < 500 ? 50 : 300;

			for (let i = Math.max(1, startScrollTop); i > 0; i = i - step) {
				if (abortController.signal.aborted) {
					return false;
				}
				this.lastScrollTop = i;
				uiMessagesWrapperRoot.scrollTop = i;
				uiMessagesWrapperRoot.dispatchEvent(new Event("scroll"));
				await new Promise((resolve) => window.requestAnimationFrame(resolve));
				try {
					const messageElement = getFirstVisibleMessage(
						uiMessagesWrapperRoot,
						abortController,
						window,
					);
					if (messageElement) {
						const uiMessage = new UIMessage(messageElement);
						return new UIPIMessage(uiMessage);
					}
				} catch (ex) {
					console.error(ex);
				}
			}
		}

		return false;
	}
}
