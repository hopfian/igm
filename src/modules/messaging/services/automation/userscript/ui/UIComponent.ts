import { clickElementAndWaitFor, waitForElement } from "../dom/async-events";

export abstract class UIComponent {
	public root: Element;
	public identifier: Record<string, any>;

	constructor(root: Element, identifier: Record<string, any> = {}) {
		this.root = root;
		this.identifier = identifier;
	}

	waitForElement<T extends Element | boolean>(
		target: Element,
		getElement: (mutations?: MutationRecord[]) => T | null | undefined,
		abortController: AbortController,
	): Promise<T> {
		const immediateElement = getElement();
		if (immediateElement) {
			return Promise.resolve(immediateElement);
		}
		return waitForElement(target, getElement, abortController);
	}

	clickElementAndWaitFor<T extends Element | boolean>(
		clickTarget: HTMLElement,
		target: Element,
		getElement: (mutations?: MutationRecord[]) => T | null | undefined,
		abortController: AbortController,
	): Promise<T> | T {
		return clickElementAndWaitFor(
			clickTarget,
			target,
			getElement,
			abortController,
		);
	}
}
