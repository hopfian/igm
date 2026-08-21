import { waitForElement } from "./async-events";

/**
 * Finds the scrollable messages container inside the conversation panel.
 */
export function findMessagesWrapper(window: Window): HTMLDivElement | null {
	const conversation = window.document.querySelector(
		"[data-pagelet='IGDMessagesList']",
	);
	if (!conversation) return null;

	const scrollable = findScrollableChild(conversation, window);
	return scrollable as HTMLDivElement | null;
}

function findScrollableChild(parent: Element, window: Window): Element | null {
	for (let i = 0; i < parent.children.length; i++) {
		const child = parent.children[i];
		const style = window.getComputedStyle(child);
		if (
			(style.overflowY === "auto" || style.overflowY === "scroll") &&
			child.scrollHeight > child.clientHeight
		) {
			return child;
		}
		const found = findScrollableChild(child, window);
		if (found) return found;
	}
	return null;
}

export function getMessagesInnerContainer(
	scrollable: Element,
): HTMLDivElement | null {
	let best = scrollable;
	let bestCount = scrollable.children.length;

	function search(el: Element, depth: number) {
		if (depth > 3) return;
		for (let i = 0; i < el.children.length; i++) {
			const child = el.children[i];
			if (child.children.length > bestCount) {
				best = child;
				bestCount = child.children.length;
			}
			search(child, depth + 1);
		}
	}

	search(scrollable, 0);
	return best as HTMLDivElement;
}

export function isSentByCurrentUser(element: Element, window: Window): boolean {
	const content = element.querySelector("[role=none]") || element.querySelector("[role=presentation]");
	if (!content) return false;
	const elementRect = element.getBoundingClientRect();
	const contentRect = content.getBoundingClientRect();
	const contentCenter = contentRect.left + contentRect.width / 2;
	const elementCenter = elementRect.left + elementRect.width / 2;
	return contentCenter > elementCenter;
}

export function getFirstVisibleMessage(
	root: Element,
	abortController: AbortController,
	window: Window,
): HTMLElement | undefined {
	const innerContainer = getMessagesInnerContainer(root);
	if (!innerContainer) return undefined;

	const elements = Array.from(innerContainer.children).filter((d) => {
		if (d.hasAttribute("data-idmu-ignore")) return false;
		if (d.hasAttribute("data-idmu-unsent")) return false;

		const hasMessageContent =
			d.querySelector("[role=none]") || d.querySelector("[role=presentation]");
		if (!hasMessageContent) return false;

		return isSentByCurrentUser(d, window);
	}) as HTMLElement[];

	elements.reverse();

	for (const element of elements) {
		if (abortController.signal.aborted) break;

		// (element as any).checkVisibility is a newer DOM API, provide a fallback just in case
		const checkVis = (element as any).checkVisibility;
		if (checkVis) {
			const isVisible = checkVis.call(element, {
				visibilityProperty: true,
				contentVisibilityAuto: true,
				opacityProperty: true,
			});
			if (!isVisible) continue;
		}

		const rect = element.getBoundingClientRect();
		if (rect.y + rect.height < 0 || rect.height === 0) continue;

		element.setAttribute("data-idmu-ignore", "");
		return element;
	}

	return undefined;
}

export async function loadMoreMessages(
	root: HTMLElement,
	abortController: AbortController,
): Promise<boolean> {
	const scrollAbortController = new AbortController();
	let findLoaderTimeout: NodeJS.Timeout | undefined;
	let resolveTimeout: (() => void) | undefined;

	const abortHandler = () => {
		scrollAbortController.abort("abortHandler was aborted");
		clearTimeout(findLoaderTimeout);
		if (resolveTimeout) resolveTimeout();
	};

	abortController.signal.addEventListener("abort", abortHandler);

	const style = root.ownerDocument.defaultView?.getComputedStyle(root);
	const isReversed = style?.flexDirection === "column-reverse";
	const scrollToTopValue = isReversed
		? -(root.scrollHeight - root.clientHeight)
		: 0;

	const isAtTop = () =>
		isReversed ? root.scrollTop <= scrollToTopValue + 5 : root.scrollTop === 0;

	const beforeScroll = root.scrollTop;
	const beforeHeight = root.scrollHeight;
	root.scrollTop = scrollToTopValue;

	const findVisibleLoader = () => {
		const bars = root.querySelectorAll("[role=progressbar]");
		for (let i = 0; i < bars.length; i++) {
			const bar = bars[i];
			const rect = bar.getBoundingClientRect();
			const rootRect = root.getBoundingClientRect();
			if (
				rect.height > 0 &&
				rect.y >= rootRect.y - 100 &&
				rect.y <= rootRect.y + rootRect.height + 100
			) {
				return bar;
			}
		}
		return null;
	};

	const noScrollNeeded =
		beforeScroll === 0 && root.scrollHeight <= root.clientHeight + 50;
	if (noScrollNeeded) {
		abortController.signal.removeEventListener("abort", abortHandler);
		return true;
	}

	if (isAtTop()) {
		let loader = findVisibleLoader();
		if (!loader && root.scrollHeight <= beforeHeight) {
			// Fast micro-poll for up to 500ms to instantly detect loader injection or height expansion
			for (let i = 0; i < 25; i++) {
				await new Promise((resolve) => setTimeout(resolve, 20));
				loader = findVisibleLoader();
				if (loader || root.scrollHeight > beforeHeight) break;
			}
		}
		
		if (loader) {
			await Promise.race([
				waitForElement(
					root,
					() => findVisibleLoader() === null,
					abortController,
				),
				new Promise((resolve) => setTimeout(resolve, 5000)),
			]);
			abortController.signal.removeEventListener("abort", abortHandler);
			return !(root.scrollHeight > beforeHeight);
		}

		const grew = root.scrollHeight > beforeHeight;
		if (!grew) {
			abortController.signal.removeEventListener("abort", abortHandler);
			return true;
		}
	}

	let loadingElement: any;
	try {
		loadingElement = await Promise.race([
			waitForElement(
				root,
				() => {
					if (findVisibleLoader() === null) {
						root.scrollTop = scrollToTopValue;
					}
					return findVisibleLoader();
				},
				scrollAbortController,
			),
			new Promise((resolve) => {
				resolveTimeout = resolve as () => void;
				findLoaderTimeout = setTimeout(() => resolve(null), 3000);
			}),
		]);
	} catch (ex) {
		console.error(ex);
	}

	scrollAbortController.abort(
		"Scrolling took too much time. Timeout after 10s",
	);
	abortController.signal.removeEventListener("abort", abortHandler);
	clearTimeout(findLoaderTimeout);

	if (loadingElement && loadingElement !== true) {
		await Promise.race([
			waitForElement(root, () => findVisibleLoader() === null, abortController),
			new Promise((resolve) => setTimeout(resolve, 5000)),
		]);
	}

	return isAtTop();
}
