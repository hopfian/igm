/**
 * Run a callback on DOM mutation (addedNode) that tests whether a specific element was found (or was not found).
 * When the callback returns a truthy value, the promise is resolved with that value.
 *
 * @param target The DOM node to observe for mutations.
 * @param getElement A function that returns the desired element, or null/undefined if not found.
 * @param abortController Controller to cancel the observation.
 */
export function waitForElement<T extends Element | boolean>(
	target: Element,
	getElement: (mutations?: MutationRecord[]) => T | null | undefined,
	abortController: AbortController,
): Promise<T> {
	return new Promise((resolve, reject) => {
		let mutationObserver: MutationObserver | undefined;

		const abortHandler = () => {
			if (mutationObserver) {
				mutationObserver.disconnect();
			}
			reject(
				new Error(`waitForElement aborted: ${abortController.signal.reason}`),
			);
		};

		abortController.signal.addEventListener("abort", abortHandler);

		let element = getElement();
		if (element) {
			resolve(element);
			abortController.signal.removeEventListener("abort", abortHandler);
		} else {
			mutationObserver = new MutationObserver((mutations, observer) => {
				element = getElement(mutations);
				if (element) {
					observer.disconnect();
					resolve(element);
					abortController.signal.removeEventListener("abort", abortHandler);
				}
			});
			mutationObserver.observe(target, { subtree: true, childList: true });
		}
	});
}

/**
 * Click a target element and wait for a specified element to appear or disappear.
 *
 * @param clickTarget The element to click.
 * @param target The DOM node to observe for mutations.
 * @param getElement A function that returns the desired element.
 * @param abortController Controller to cancel the operation.
 */
export async function clickElementAndWaitFor<T extends Element | boolean>(
	clickTarget: HTMLElement,
	target: Element,
	getElement: (mutations?: MutationRecord[]) => T | null | undefined,
	abortController: AbortController,
): Promise<T> {
	const promise = waitForElement(target, getElement, abortController);
	clickTarget.click();
	const immediateElement = getElement();
	if (immediateElement) return immediateElement;
	return promise;
}
