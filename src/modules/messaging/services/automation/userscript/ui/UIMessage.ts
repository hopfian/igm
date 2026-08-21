import { LABEL_PATTERNS, UNSEND_TEXT_VARIANTS } from "./constants";
import { UIComponent } from "./UIComponent";

function dispatchHoverIn(target: Element) {
	const rect = target.getBoundingClientRect();
	const opts = {
		bubbles: true,
		cancelable: true,
		clientX: rect.x + rect.width / 2,
		clientY: rect.y + rect.height / 2,
		pointerId: 1,
		pointerType: "mouse",
	};
	target.dispatchEvent(
		new PointerEvent("pointerenter", { ...opts, bubbles: false }),
	);
	target.dispatchEvent(new PointerEvent("pointerover", opts));
	target.dispatchEvent(new PointerEvent("pointermove", opts));
	target.dispatchEvent(
		new MouseEvent("mouseenter", { ...opts, bubbles: false }),
	);
	target.dispatchEvent(new MouseEvent("mouseover", opts));
	target.dispatchEvent(new MouseEvent("mousemove", opts));
}

function dispatchHoverOut(target: Element) {
	const rect = target.getBoundingClientRect();
	const opts = {
		bubbles: true,
		cancelable: true,
		clientX: rect.x + rect.width / 2,
		clientY: rect.y + rect.height / 2,
		pointerId: 1,
		pointerType: "mouse",
	};
	target.dispatchEvent(new PointerEvent("pointerout", opts));
	target.dispatchEvent(
		new PointerEvent("pointerleave", { ...opts, bubbles: false }),
	);
	target.dispatchEvent(new MouseEvent("mouseout", opts));
	target.dispatchEvent(
		new MouseEvent("mouseleave", { ...opts, bubbles: false }),
	);
}

export class UIMessage extends UIComponent {
	private _dismissStaleOverlays() {
		const doc = this.root.ownerDocument;
		const staleDialog = doc.querySelector("[role=dialog]");
		if (staleDialog) {
			const closeBtn = staleDialog.querySelector("button");
			if (closeBtn) closeBtn.click();
		}
		const activeMenu = doc.querySelector("[role=menu], [role=listbox]");
		if (activeMenu) {
			doc.body.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
			);
		}
	}

	private _findActionButton(scope: Element): HTMLButtonElement | null {
		for (const sel of LABEL_PATTERNS) {
			const el = scope.querySelector(sel);
			if (el) {
				const btn = el.closest("[role=button]") || el.closest("button");
				if (btn && scope.contains(btn)) return btn as HTMLButtonElement;
				if (el.tagName === "BUTTON" || el.getAttribute("role") === "button")
					return el as HTMLButtonElement;
			}
		}
		return scope.querySelector(
			"[role=button][aria-haspopup=menu]",
		) as HTMLButtonElement | null;
	}

	async showActionsMenuButton(
		abortController: AbortController,
	): Promise<HTMLButtonElement | null> {
		this._dismissStaleOverlays();

		const hoverTargets: Element[] = [this.root];
		const collectTargets = (el: Element, depth: number) => {
			if (depth > 8) return;
			for (let i = 0; i < el.children.length; i++) {
				const child = el.children[i];
				hoverTargets.push(child);
				collectTargets(child, depth + 1);
			}
		};
		collectTargets(this.root, 0);

		for (let attempt = 0; attempt < 3; attempt++) {
			if (abortController.signal.aborted) return null;

			for (const target of hoverTargets) {
				dispatchHoverIn(target);
			}

			await new Promise((resolve) => setTimeout(resolve, 100));

			const btn = this._findActionButton(this.root);
			if (btn) return btn;

			dispatchHoverOut(this.root);
			await new Promise((resolve) => setTimeout(resolve, 50));
		}

		const waitAbortController = new AbortController();
		let promiseTimeout: NodeJS.Timeout | undefined;
		const abortHandler = () => {
			waitAbortController.abort(
				"showActionsMenuButton step was aborted by the parent process",
			);
			clearTimeout(promiseTimeout);
		};
		abortController.signal.addEventListener("abort", abortHandler);

		for (const target of hoverTargets) {
			dispatchHoverIn(target);
		}

		try {
			const actionButton = await Promise.race([
				this.waitForElement(
					this.root,
					() => this._findActionButton(this.root),
					waitAbortController,
				),
				new Promise<null>((resolve, reject) => {
					promiseTimeout = setTimeout(
						() => reject("Timeout showActionsMenuButton"),
						3000,
					);
				}),
			]);

			return actionButton;
		} catch (e) {
			return null;
		} finally {
			waitAbortController.abort();
			clearTimeout(promiseTimeout);
			abortController.signal.removeEventListener("abort", abortHandler);
		}
	}

	async hideActionMenuButton(
		abortController: AbortController,
	): Promise<boolean> {
		dispatchHoverOut(this.root);
		const noneEl = this.root.querySelector("[role=none]");
		if (noneEl) {
			dispatchHoverOut(noneEl);
		}

		const waitAbortController = new AbortController();
		let promiseTimeout: NodeJS.Timeout | undefined;
		let resolveTimeout: (() => void) | undefined;
		const abortHandler = () => {
			waitAbortController.abort(
				"hideActionMenuButton step was aborted by the parent process",
			);
			clearTimeout(promiseTimeout);
			if (resolveTimeout) resolveTimeout();
		};
		abortController.signal.addEventListener("abort", abortHandler);

		try {
			const result = await Promise.race([
				this.waitForElement(
					this.root,
					() => this._findActionButton(this.root) === null,
					waitAbortController,
				),
				new Promise<boolean>((resolve, reject) => {
					resolveTimeout = resolve as () => void;
					promiseTimeout = setTimeout(
						() => reject("Timeout hideActionMenuButton"),
						500,
					);
				}),
			]);
			return result as boolean;
		} catch (e) {
			return false;
		} finally {
			waitAbortController.abort();
			clearTimeout(promiseTimeout);
			abortController.signal.removeEventListener("abort", abortHandler);
		}
	}

	async openActionsMenu(
		actionButton: HTMLButtonElement,
		abortController: AbortController,
	): Promise<HTMLElement | null> {
		const waitAbortController = new AbortController();
		let promiseTimeout: NodeJS.Timeout | undefined;
		const abortHandler = () => {
			waitAbortController.abort(
				"openActionsMenu step was aborted by the parent process",
			);
			clearTimeout(promiseTimeout);
		};
		abortController.signal.addEventListener("abort", abortHandler);

		const isUnsendText = (text: string | null) => {
			if (!text) return false;
			const normalized = text.trim().toLocaleLowerCase();
			return UNSEND_TEXT_VARIANTS.some((v) => normalized === v);
		};

		try {
			const unsendButton = await Promise.race([
				this.clickElementAndWaitFor(
					actionButton,
					this.root.ownerDocument.body,
					(mutations) => {
						if (mutations) {
							const addedNodes = mutations
								.flatMap((mutation) => Array.from(mutation.addedNodes))
								.filter((node) => node.nodeType === 1) as HTMLElement[];
							for (const addedNode of addedNodes) {
								const node = Array.from(
									addedNode.querySelectorAll("span,div"),
								).find(
									(node) =>
										isUnsendText(node.textContent) &&
										node.firstChild?.nodeType === 3,
								);
								if (node) return node as HTMLElement;
							}
						}
						const allSpans = this.root.ownerDocument.querySelectorAll(
							"[role=menu] span, [role=menu] div, [role=menuitem] span, [role=menuitem] div",
						);
						for (let i = 0; i < allSpans.length; i++) {
							const span = allSpans[i];
							if (
								isUnsendText(span.textContent) &&
								span.firstChild?.nodeType === 3
							) {
								return span as HTMLElement;
							}
						}
						return null;
					},
					waitAbortController,
				),
				new Promise<HTMLElement | null>((resolve, reject) => {
					promiseTimeout = setTimeout(
						() => reject("Timeout openActionsMenu"),
						3000,
					);
				}),
			]);

			return unsendButton as HTMLElement;
		} catch (e) {
			return null;
		} finally {
			waitAbortController.abort();
			clearTimeout(promiseTimeout);
			abortController.signal.removeEventListener("abort", abortHandler);
		}
	}

	async closeActionsMenu(
		actionButton: HTMLButtonElement,
		actionsMenuElement: HTMLElement,
		abortController: AbortController,
	): Promise<boolean> {
		const waitAbortController = new AbortController();
		let promiseTimeout: NodeJS.Timeout | undefined;
		const abortHandler = () => {
			waitAbortController.abort(
				"closeActionsMenu step was aborted by the parent process",
			);
			clearTimeout(promiseTimeout);
		};
		abortController.signal.addEventListener("abort", abortHandler);

		try {
			const result = await Promise.race([
				this.clickElementAndWaitFor(
					actionButton,
					this.root.ownerDocument.body,
					() =>
						this.root.ownerDocument.body.contains(actionsMenuElement) === false,
					abortController,
				),
				new Promise<boolean>((resolve, reject) => {
					promiseTimeout = setTimeout(
						() => reject("Timeout closeActionsMenu"),
						500,
					);
				}),
			]);
			return result !== null;
		} catch (e) {
			return false;
		} finally {
			waitAbortController.abort();
			clearTimeout(promiseTimeout);
			abortController.signal.removeEventListener("abort", abortHandler);
		}
	}

	openConfirmUnsendModal(
		unsendButton: HTMLElement,
		abortController: AbortController,
	): Promise<HTMLButtonElement> | HTMLButtonElement {
		return this.clickElementAndWaitFor(
			unsendButton,
			this.root.ownerDocument.body,
			() =>
				this.root.ownerDocument.querySelector(
					"[role=dialog] button",
				) as HTMLButtonElement | null,
			abortController,
		) as Promise<HTMLButtonElement> | HTMLButtonElement;
	}

	async confirmUnsend(
		dialogButton: HTMLButtonElement,
		abortController: AbortController,
	): Promise<void> {
		await this.clickElementAndWaitFor(
			dialogButton,
			this.root.ownerDocument.body,
			() =>
				this.root.ownerDocument.querySelector("[role=dialog] button") === null,
			abortController,
		);
	}
}
