
// ==UserScript==

// @name				instagram-dm-unsender
// @license				MIT
// @copyright				Copyright (c) 2023, Romain Lebesle <oss@thoughtsunificator.me> (https://thoughtsunificator.me)
// @namespace				https://thoughtsunificator.me/
// @author				Romain Lebesle <oss@thoughtsunificator.me> (https://thoughtsunificator.me)
// @homepageURL				https://thoughtsunificator.me/
// @supportURL				https://thoughtsunificator.me/
// @contributionURL				https://thoughtsunificator.me/
// @icon				https://www.instagram.com/favicon.ico
// @version				0.7.2
// @updateURL				https://raw.githubusercontent.com/thoughtsunificator/instagram-dm-unsender/userscript/idmu.user.js
// @downloadURL				https://raw.githubusercontent.com/thoughtsunificator/instagram-dm-unsender/userscript/idmu.user.js
// @description				Simple script to unsend all DMs in a thread on instagram.com
// @run-at				document-end
// @include				/^https://(www\.)?instagram\.com/*/

// ==/UserScript==


(function (exports) {
	'use strict';

	/** @module instagram Helpers to mimick Instagram's look and feel */

	const BUTTON_STYLE = {
		"PRIMARY": "primary",
		"SECONDARY": "secondary",
	};

	/**
	 *
	 * @param {HTMLButtonElement} buttonElement
	 * @param {string}            styleName
	 */
	function applyButtonStyle(buttonElement, styleName) {
		buttonElement.style.fontSize = "var(--system-14-font-size)";
		buttonElement.style.color = "white";
		buttonElement.style.border = "0px";
		buttonElement.style.borderRadius = "8px";
		buttonElement.style.padding = "8px";
		buttonElement.style.fontWeight = "bold";
		buttonElement.style.cursor = "pointer";
		buttonElement.style.lineHeight = "var(--system-14-line-height)";
		if(styleName) {
			buttonElement.style.backgroundColor = `rgb(var(--ig-${styleName}-button))`;
		}
	}

	/** @module menu-button Helpers to create buttons that can be used in IDMU's menu */


	/**
	 *
	 * @param {Document} document
	 * @param {string}   text
	 * @param {string}   styleName
	 * @returns {HTMLButtonElement}
	 */
	function createMenuButtonElement(document, text, styleName) {
		const buttonElement = document.createElement("button");
		buttonElement.textContent = text;
		applyButtonStyle(buttonElement, styleName);
		buttonElement.addEventListener("mouseover", () => {
			buttonElement.style.filter = `brightness(1.15)`;
		});
		buttonElement.addEventListener("mouseout", () => {
			buttonElement.style.filter = ``;
		});
		return buttonElement
	}

	/** @module menu IDMU's main menu */

	/**
	 * @param {Document} document
	 * @returns {HTMLButtonElement}
	 */
	function createMenuElement(document) {
		const menuElement = document.createElement("div");
		menuElement.id = "idmu-menu";
		menuElement.style.top = "20px";
		menuElement.style.right = "430px";
		menuElement.style.position = "fixed";
		menuElement.style.zIndex = 999;
		menuElement.style.display = "flex";
		menuElement.style.gap = "10px";
		menuElement.style.placeItems = "center";
		return menuElement
	}

	/** @module async-events Utils module for finding elements asynchronously in the DOM */

	/**
	 *
	 * @callback getElement
	 * @returns {Element}
	 */

	/**
	 * Run a callback on DOM mutation (addedNode) that tests whether a specific element was found (or was not found)
	 * When the callback returns true the promise is resolved
	 * @param {Element} target
	 * @param {getElement} getElement
	 * @param {AbortController} abortController
	 * @returns {Promise<Element>}
	 * @example
	 * waitForElement(
	 *		body,
	 *		() => body.contains(document.querySelector("button#foo")),
	 *		abortController
	 *	)
	 */
	function waitForElement(target, getElement, abortController) {
		return new Promise((resolve, reject) => {
			let mutationObserver;
			const abortHandler = () => {
				if(mutationObserver) {
					mutationObserver.disconnect();
				}
				reject(new Error(`waitForElement aborted: ${abortController.signal.reason}`));
			};
			abortController.signal.addEventListener("abort", abortHandler);
			let element = getElement();
			if(element) {
				resolve(element);
				abortController.signal.removeEventListener("abort", abortHandler);
			} else {
				mutationObserver = new MutationObserver((mutations, observer) => {
					element = getElement(mutations);
					if(element) {
						observer.disconnect();
						resolve(element);
						abortController.signal.removeEventListener("abort", abortHandler);
					}
				});
				mutationObserver.observe(target, { subtree: true, childList: true });
			}
		})
	}

	/**
	 * Click target and run waitForElement
	 * @param {Element} clickTarget
	 * @param {Element} target
	 * @param {getElement} getElement
	 * @param {AbortController} abortController
	 * @returns {Element|Promise<Element>}
	 * @example
	 * In this case clicking "#foo" button would make "#bar" appear
	 * clickElementAndWaitFor(
	 *		document.querySelector("#foo"),
	 *		body,
	 *		() => body.contains(document.querySelector("#bar")),
	 *		abortController
	 *	)
	 */
	function clickElementAndWaitFor(clickTarget, target, getElement, abortController) {
		const promise = waitForElement(target, getElement, abortController);
		clickTarget.click();
		return getElement() || promise
	}

	/** @module ui-component Base class for any element that is a part of the UI. */


	/**
	 *
	 * @abstract
	 */
	class UIComponent {
		/**
		 *
		 * @param {Element} root
		 * @param {object} identifier
		 */
		constructor(root, identifier={}) {
			this.root = root;
			this.identifier = identifier;
		}

		/**
		 * Alias of dom/async-events#waitForElement
		 * @param {Element} target
		 * @param {function} getElement
		 * @param {AbortController} abortController
		 * @returns {Promise<Element>}
		 */
		waitForElement(target, getElement, abortController) {
			return getElement() || waitForElement(target, getElement, abortController)
		}

		/**
		 * Alias of dom/async-events#clickElementAndWaitFor
		 * @param {Element} clickTarget
		 * @param {Element} target
		 * @param {function} getElement
		 * @param {AbortController} abortController
		 * @returns {Promise<Element>}
		 */
		clickElementAndWaitFor(clickTarget, target, getElement, abortController) {
			return clickElementAndWaitFor(clickTarget, target, getElement, abortController)
		}

	}

	/** Locale-independent patterns for the "Unsend" menu item */
	const UNSEND_TEXT_VARIANTS = [
		"unsend",        // English
		"annulla invio", // Italian
		"retirar",       // Portuguese
		"deshacer",      // Spanish
		"retirer",       // French
		"zurücknehmen",  // German
	];


	/** Represents the description text that is associated with the "..." button that reveals the actions menu */
	const LABEL_PATTERNS = [
		"[aria-label^='See more options for message']",
		"[aria-label*='more options']",
		"[aria-label*='More']",
		"[aria-label*='Altre opzioni']",
		"[aria-label*='opzioni']",
		"[aria-label*='opciones']",
		"[aria-label*='options']",
	];

	/** @module ui-message UI element representing a message */


	/**
	 * Dispatches pointer and mouse hover events on a target element.
	 * Instagram's React uses pointer events internally; mouse events alone are insufficient.
	 *
	 * @param {Element} target
	 */
	function dispatchHoverIn(target) {
		const rect = target.getBoundingClientRect();
		const opts = {
			bubbles: true,
			cancelable: true,
			clientX: rect.x + rect.width / 2,
			clientY: rect.y + rect.height / 2,
			pointerId: 1,
			pointerType: "mouse",
		};
		target.dispatchEvent(new PointerEvent("pointerenter", { ...opts, bubbles: false }));
		target.dispatchEvent(new PointerEvent("pointerover", opts));
		target.dispatchEvent(new PointerEvent("pointermove", opts));
		target.dispatchEvent(new MouseEvent("mouseenter", { ...opts, bubbles: false }));
		target.dispatchEvent(new MouseEvent("mouseover", opts));
		target.dispatchEvent(new MouseEvent("mousemove", opts));
	}

	/**
	 * Dispatches pointer and mouse leave events on a target element.
	 *
	 * @param {Element} target
	 */
	function dispatchHoverOut(target) {
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
		target.dispatchEvent(new PointerEvent("pointerleave", { ...opts, bubbles: false }));
		target.dispatchEvent(new MouseEvent("mouseout", opts));
		target.dispatchEvent(new MouseEvent("mouseleave", { ...opts, bubbles: false }));
	}

	class UIMessage extends UIComponent {

		/**
		 * Dismiss any stale dialog or dropdown left from a previous failed workflow.
		 */
		_dismissStaleOverlays() {
			const doc = this.root.ownerDocument;
			// Close stale confirmation dialogs
			const staleDialog = doc.querySelector("[role=dialog]");
			if (staleDialog) {
				console.debug("Dismissing stale dialog");
				const closeBtn = staleDialog.querySelector("button");
				if (closeBtn) closeBtn.click();
			}
			// Close stale dropdown menus by pressing Escape
			const activeMenu = doc.querySelector("[role=menu], [role=listbox]");
			if (activeMenu) {
				console.debug("Dismissing stale menu via Escape");
				doc.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
			}
		}

		/**
		 * Find the action button within the message row.
		 * Instagram moved aria-label from the button div to a nested SVG/title.
		 * Any match (SVG or div) is walked up to the nearest [role=button] ancestor.
		 *
		 * @param {Element} scope
		 * @returns {Element|null}
		 */
		_findActionButton(scope) {
			for (const sel of LABEL_PATTERNS) {
				const el = scope.querySelector(sel);
				if (el) {
					// Always resolve to a clickable button container
					const btn = el.closest("[role=button]") || el.closest("button");
					if (btn && scope.contains(btn)) return btn
					// el itself is already a button-like element
					if (el.tagName === "BUTTON" || el.getAttribute("role") === "button") return el
				}
			}

			// Fallback: any role=button with aria-haspopup=menu inside the message row
			return scope.querySelector("[role=button][aria-haspopup=menu]")
		}

		/**
		 * @param {AbortController} abortController
		 * @returns {Promise<HTMLButtonElement>}
		 */
		async showActionsMenuButton(abortController) {
			console.debug("Workflow step 1 : showActionsMenuButton", this.root);
			this._dismissStaleOverlays();

			// Collect all hoverable ancestors from root down to the message bubble.
			// Instagram React listens at intermediate levels (role=group, flex-end wrapper).
			const hoverTargets = [this.root];
			const collectTargets = (el, depth) => {
				if (depth > 8) return
				for (const child of el.children) {
					hoverTargets.push(child);
					collectTargets(child, depth + 1);
				}
			};
			collectTargets(this.root, 0);

			// Try up to 3 times — hover events can be flaky
			for (let attempt = 0; attempt < 3; attempt++) {
				if (abortController.signal.aborted) return null

				for (const target of hoverTargets) {
					dispatchHoverIn(target);
				}

				await new Promise(resolve => setTimeout(resolve, 100));

				const btn = this._findActionButton(this.root);
				if (btn) {
					console.debug("Workflow step 1 : found action button on attempt", attempt, btn);
					return btn
				}

				console.debug("Workflow step 1 : attempt", attempt, "no button found, retrying...");
				dispatchHoverOut(this.root);
				await new Promise(resolve => setTimeout(resolve, 50));
			}

			// Final fallback: use waitForElement with extended timeout
			const waitAbortController = new AbortController();
			let promiseTimeout;
			const abortHandler = () => {
				waitAbortController.abort("showActionsMenuButton step was aborted by the parent process");
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
						waitAbortController
					),
					new Promise((resolve, reject) => {
						promiseTimeout = setTimeout(() => reject("Timeout showActionsMenuButton"), 3000);
					})
				]);

				if (actionButton) {
					return actionButton
				}
				return actionButton
			} finally {
				waitAbortController.abort(); // Aborting without reason because the reason is the error itself
				clearTimeout(promiseTimeout);
				abortController.signal.removeEventListener("abort", abortHandler);
			}
		}

		/**
		 * @param {AbortController} abortController
		 * @returns {Promise<boolean>}
		 */
		async hideActionMenuButton(abortController) {
			console.debug("hideActionMenuButton", this.root);
			dispatchHoverOut(this.root);

			const noneEl = this.root.querySelector("[role=none]");
			if (noneEl) {
				dispatchHoverOut(noneEl);
			}

			const waitAbortController = new AbortController();
			let promiseTimeout;
			let resolveTimeout;
			const abortHandler = () => {
				waitAbortController.abort("hideActionMenuButton step was aborted by the parent process");
				clearTimeout(promiseTimeout);
				if (resolveTimeout) {
					resolveTimeout();
				}
			};
			abortController.signal.addEventListener("abort", abortHandler);

			try {
				const result = await Promise.race([
					this.waitForElement(
						this.root,
						() => this._findActionButton(this.root) === null,
						waitAbortController
					),
					new Promise((resolve, reject) => {
						resolveTimeout = resolve;
						promiseTimeout = setTimeout(() => reject("Timeout hideActionMenuButton"), 500);
					})
				]);
				return result
			} finally {
				waitAbortController.abort(); // Aborting without reason because the reason is the error itself
				clearTimeout(promiseTimeout);
				abortController.signal.removeEventListener("abort", abortHandler);
			}
		}

		/**
		 * Opens the actions menu by clicking the action button and waiting for the "Unsend" item.
		 *
		 * @param {HTMLButtonElement} actionButton
		 * @param {AbortController} abortController
		 * @returns {Promise}
		 */
		async openActionsMenu(actionButton, abortController) {
			console.debug("Workflow step 2 : Clicking actionButton and waiting for unsend menu item to appear", actionButton);
			const waitAbortController = new AbortController();
			let promiseTimeout;
			const abortHandler = () => {
				waitAbortController.abort("openActionsMenu step was aborted by the parent process");
				clearTimeout(promiseTimeout);
			};
			abortController.signal.addEventListener("abort", abortHandler);

			/** Check if text matches any known "Unsend" variant */
			const isUnsendText = (text) => {
				const normalized = text.trim().toLocaleLowerCase();
				return UNSEND_TEXT_VARIANTS.some(v => normalized === v)
			};

			try {
				const unsendButton = await Promise.race([
					this.clickElementAndWaitFor(
						actionButton,
						this.root.ownerDocument.body,
						(mutations) => {
							if (mutations) {
								const addedNodes = [...mutations.map(mutation => [...mutation.addedNodes])].flat().filter(node => node.nodeType === 1);
								for (const addedNode of addedNodes) {
									const node = [...addedNode.querySelectorAll("span,div")].find(node => isUnsendText(node.textContent) && node.firstChild?.nodeType === 3);
									if (node) {
										console.debug("Workflow step 2 : found unsend node via mutation", node);
										return node
									}
								}
							}
							// Fallback: scan the whole document for an unsend menu item already present
							const allSpans = this.root.ownerDocument.querySelectorAll("[role=menu] span, [role=menu] div, [role=menuitem] span, [role=menuitem] div");
							for (const span of allSpans) {
								if (isUnsendText(span.textContent) && span.firstChild?.nodeType === 3) {
									console.debug("Workflow step 2 : found unsend node via document scan", span);
									return span
								}
							}
						},
						waitAbortController
					),
					new Promise((resolve, reject) => {
						promiseTimeout = setTimeout(() => reject("Timeout openActionsMenu"), 3000);
					})
				]);

				console.debug("Workflow step 2 : Found unsendButton", unsendButton);
				return unsendButton
			} finally {
				waitAbortController.abort(); // Aborting without reason because the reason is the error itself
				clearTimeout(promiseTimeout);
				abortController.signal.removeEventListener("abort", abortHandler);
			}
		}

		/**
		 * Closes the actions menu.
		 *
		 * @param {HTMLButtonElement} actionButton
		 * @param {HTMLDivElement} actionsMenuElement
		 * @param {AbortController} abortController
		 * @returns {Promise<boolean>}
		 */
		async closeActionsMenu(actionButton, actionsMenuElement, abortController) {
			console.debug("closeActionsMenu");
			const waitAbortController = new AbortController();
			let promiseTimeout;
			const abortHandler = () => {
				waitAbortController.abort("closeActionsMenu step was aborted by the parent process");
				clearTimeout(promiseTimeout);
			};
			abortController.signal.addEventListener("abort", abortHandler);

			try {
				const result = await Promise.race([
					this.clickElementAndWaitFor(
						actionButton,
						this.root.ownerDocument.body,
						() => this.root.ownerDocument.body.contains(actionsMenuElement) === false,
						abortController
					),
					new Promise((resolve, reject) => {
						promiseTimeout = setTimeout(() => reject("Timeout closeActionsMenu"), 500);
					})
				]);
				return result !== null
			} finally {
				waitAbortController.abort();
				clearTimeout(promiseTimeout);
				abortController.signal.removeEventListener("abort", abortHandler);
			}
		}

		/**
		 * Click unsend button and wait for the confirmation dialog.
		 *
		 * @param {HTMLSpanElement} unsendButton
		 * @param {AbortController} abortController
		 * @returns {Promise<HTMLButtonElement>|Promise<Error>}
		 */
		openConfirmUnsendModal(unsendButton, abortController) {
			console.debug("Workflow step 3 : Clicking unsendButton and waiting for dialog to appear...");
			return this.clickElementAndWaitFor(
				unsendButton,
				this.root.ownerDocument.body,
				() => this.root.ownerDocument.querySelector("[role=dialog] button"),
				abortController
			)
		}

		/**
		 * Click unsend confirm button in the modal dialog.
		 *
		 * @param {HTMLButtonElement} dialogButton
		 * @param {AbortController} abortController
		 * @returns {Promise}
		 */
		async confirmUnsend(dialogButton, abortController) {
			console.debug("Workflow final step : confirmUnsend", dialogButton);
			await this.clickElementAndWaitFor(
				dialogButton,
				this.root.ownerDocument.body,
				() => this.root.ownerDocument.querySelector("[role=dialog] button") === null,
				abortController
			);
		}

	}

	/** @module uipi-message API for UIMessage */


	class FailedWorkflowException extends Error {}

	class UIPIMessage {

		/**
		 * @param {UIMessage} uiMessage
		 */
		constructor(uiMessage) {
			this._uiMessage = uiMessage;
		}

		/**
		 * @param {AbortController} abortController
		 * @returns {Promise<boolean>}
		 */
		async unsend(abortController) {
			console.debug("UIPIMessage unsend");
			let actionButton;
			let unsendButton;
			try {
				actionButton = await this.uiMessage.showActionsMenuButton(abortController);
				unsendButton = await this.uiMessage.openActionsMenu(actionButton, abortController);
				console.debug("unsendButton", unsendButton);
				const dialogButton = await this.uiMessage.openConfirmUnsendModal(unsendButton, abortController);
				await this.uiMessage.confirmUnsend(dialogButton, abortController);
				this.uiMessage.root.setAttribute("data-idmu-unsent", "");
				return true
			} catch(ex) {
				console.error(ex);
				this.uiMessage.root.setAttribute("data-idmu-ignore", "");
				// Dismiss any open overlay so the next message starts clean
				try {
					const doc = this.uiMessage.root.ownerDocument;
					doc.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
					await new Promise(resolve => setTimeout(resolve, 200));
					// If dialog is still open, press Escape again
					if (doc.querySelector("[role=dialog]")) {
						doc.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
						await new Promise(resolve => setTimeout(resolve, 200));
					}
				} catch (error) {
					console.error(error);
				}
				throw new FailedWorkflowException("Failed to execute workflow for this message", ex)
			}
		}

		/**
		 * @type {UIMessage}
		 */
		get uiMessage() {
			return this._uiMessage
		}

	}

	/**
	 *
	 * @abstract
	 */
	class UI extends UIComponent {

		/**
		 *
		 * @abstract
		 * @returns {UI}
		 */
		static create() {
		}

		/**
		 *
		 * @abstract
		 * @param {AbortController} abortController
		 * @returns {Promise}
		 */
		/* eslint-disable-next-line no-unused-vars */
		async fetchAndRenderThreadNextMessagePage(abortController) {
		}

		/**
		 *
		 * @abstract
		 * @returns {Promise<UIPIMessage>}
		 */
		async getNextUIPIMessage() {
		}

	}

	/** @module dom-lookup Utils module for looking up elements on the default UI */


	/**
	 * Finds the scrollable messages container inside the conversation panel.
	 * Instagram removed role="grid" — we now locate the container via aria-label
	 * and walk into its scrollable child.
	 *
	 * @param {Window} window
	 * @returns {HTMLDivElement|null}
	 */
	function findMessagesWrapper(window) {
		const conversation = window.document.querySelector("[data-pagelet='IGDMessagesList']");
		if (!conversation) {
			return null
		}
		const scrollable = findScrollableChild(conversation, window);
		if (!scrollable) {
			return null
		}
		return scrollable
	}

	/**
	 * Recursively finds the first scrollable descendant of a given element.
	 *
	 * @param {Element} parent
	 * @param {Window} window
	 * @returns {HTMLDivElement|null}
	 */
	function findScrollableChild(parent, window) {
		for (const child of parent.children) {
			const style = window.getComputedStyle(child);
			if (
				(style.overflowY === "auto" || style.overflowY === "scroll") &&
				child.scrollHeight > child.clientHeight
			) {
				return child
			}
			const found = findScrollableChild(child, window);
			if (found) {
				return found
			}
		}
		return null
	}

	/**
	 * Returns the inner container that holds individual message row divs.
	 * Traverses wrapper layers to find the div with the most children (the message list).
	 *
	 * @param {Element} scrollable
	 * @returns {HTMLDivElement}
	 */
	function getMessagesInnerContainer(scrollable) {
		// Instagram wraps messages in several nested divs.
		// Strategy: find the deepest descendant (within 3 levels) that has the most children,
		// since the actual messages container has many direct children (one per message row).
		let best = scrollable;
		let bestCount = scrollable.children.length;

		function search(el, depth) {
			if (depth > 3) return
			for (const child of el.children) {
				if (child.children.length > bestCount) {
					best = child;
					bestCount = child.children.length;
				}
				search(child, depth + 1);
			}
		}

		search(scrollable, 0);
		return best
	}

	/**
	 * Determines whether a message element was sent by the current user.
	 * Instagram aligns sent messages to the right using flexbox (justify-content: flex-end).
	 *
	 * @param {Element} element
	 * @param {Window} window
	 * @returns {boolean}
	 */
	function isSentByCurrentUser(element, window) {
		// BFS through all descendants up to depth 8.
		// Instagram places justify-content: flex-end on a nested div (depth ~5)
		// that may be on any child branch, not just the first-child path.
		const queue = [{ el: element, depth: 0 }];
		while (queue.length > 0) {
			const { el, depth } = queue.shift();
			const s = window.getComputedStyle(el);
			if (s.justifyContent === "flex-end") {
				return true
			}
			if (depth < 8) {
				for (const child of el.children) {
					queue.push({ el: child, depth: depth + 1 });
				}
			}
		}
		return false
	}

	/**
	 * Gets the first visible message sent by the current user that hasn't been processed yet.
	 *
	 * @param {Element} root - The scrollable messages wrapper
	 * @param {AbortController} abortController
	 * @param {Window} window
	 * @returns {Element|undefined}
	 */
	function getFirstVisibleMessage(root, abortController, window) {
		const innerContainer = getMessagesInnerContainer(root);
		if (!innerContainer) {
			console.debug("getFirstVisibleMessage: no inner container found");
			return
		}

		const elements = [...innerContainer.children]
			.filter(d => {
				if (d.hasAttribute("data-idmu-ignore")) return false
				if (d.hasAttribute("data-idmu-unsent")) return false
				// Must contain message content indicators
				const hasMessageContent = d.querySelector("[role=none]") || d.querySelector("[role=presentation]");
				if (!hasMessageContent) return false
				return isSentByCurrentUser(d, window)
			});

		elements.reverse();
		if(elements.length >= 1) {
			console.debug("getFirstVisibleMessage", elements.length, "candidate elements");
		} else {
			console.debug("getFirstVisibleMessage: no candidate elements found");
		}

		for (const element of elements) {
			if (abortController.signal.aborted) {
				console.debug("abortController interupted the message filtering process: stopping...");
				break
			}
			const visibilityCheck = element.checkVisibility({
				visibilityProperty: true,
				contentVisibilityAuto: true,
				opacityProperty: true,
			});
			if (visibilityCheck === false) {
				console.debug("visibilityCheck", visibilityCheck);
				continue
			}
			const rect = element.getBoundingClientRect();
			// Check if element is at least partially in viewport.
			// For tall elements (images, long text), rect.y can be negative
			// while the element is still visible. Use bottom edge instead.
			if (rect.y + rect.height < 0 || rect.height === 0) {
				console.debug("isInView failed", rect.y, rect.height);
				continue
			}
			element.setAttribute("data-idmu-ignore", "");
			console.debug("Message in view, testing workflow...", element);
			return element
		}
	}

	/**
	 * Scrolls to top to trigger loading of older messages.
	 * Handles both normal and column-reverse layouts.
	 *
	 * In column-reverse (Instagram's current layout):
	 *   scrollTop=0 is the BOTTOM (newest messages)
	 *   scrollTop=-(scrollHeight-clientHeight) is the TOP (oldest messages)
	 *
	 * @param {Element} root
	 * @param {AbortController} abortController
	 * @returns {Promise<boolean>}
	 */
	async function loadMoreMessages(root, abortController) {
		console.debug("loadMoreMessages looking for loader... ");
		const scrollAbortController = new AbortController();
		let findLoaderTimeout;
		let resolveTimeout;
		const abortHandler = () => {
			scrollAbortController.abort("abortHandler was aborted");
			clearTimeout(findLoaderTimeout);
			if (resolveTimeout) {
				resolveTimeout();
			}
		};
		abortController.signal.addEventListener("abort", abortHandler);

		// Detect column-reverse layout
		const style = root.ownerDocument.defaultView.getComputedStyle(root);
		const isReversed = style.flexDirection === "column-reverse";
		// In column-reverse, "scroll to top" means most negative scrollTop
		const scrollToTopValue = isReversed
			? -(root.scrollHeight - root.clientHeight)
			: 0;
		// In column-reverse, "at top" means scrollTop is at or near minimum
		const isAtTop = () => isReversed
			? root.scrollTop <= scrollToTopValue + 5
			: root.scrollTop === 0;

		const beforeScroll = root.scrollTop;
		const beforeHeight = root.scrollHeight;
		root.scrollTop = scrollToTopValue;

		// Helper: find a visible loader within the scrollable root's viewport
		const findVisibleLoader = () => {
			const bars = root.querySelectorAll("[role=progressbar]");
			for (const bar of bars) {
				const rect = bar.getBoundingClientRect();
				const rootRect = root.getBoundingClientRect();
				// Must be within root's horizontal+vertical bounds and have dimensions
				if (rect.height > 0 && rect.y >= rootRect.y - 100 && rect.y <= rootRect.y + rootRect.height + 100) {
					return bar
				}
			}
			return null
		};

		// Short chat: everything fits in viewport, nothing to load
		const noScrollNeeded = isReversed
			? beforeScroll === 0 && root.scrollHeight <= root.clientHeight + 50
			: beforeScroll === 0 && root.scrollHeight <= root.clientHeight + 50;
		if (noScrollNeeded) {
			console.debug("loadMoreMessages: chat fits in viewport, marking as done");
			abortController.signal.removeEventListener("abort", abortHandler);
			return true
		}

		// Already at top after scrolling: wait briefly for new content, then check
		if (isAtTop()) {
			// Give Instagram a moment to start loading older messages
			await new Promise(resolve => setTimeout(resolve, 500));

			// Check if a visible loader appeared
			const loader = findVisibleLoader();
			if (loader) {
				console.debug("loadMoreMessages: Found visible loader after scroll; waiting for removal (max 5s)");
				await Promise.race([
					waitForElement(root, () => findVisibleLoader() === null, abortController),
					new Promise(resolve => setTimeout(resolve, 5000))
				]);
				abortController.signal.removeEventListener("abort", abortHandler);
				const grew = root.scrollHeight > beforeHeight;
				console.debug(`loadMoreMessages: loader phase done, content ${grew ? "grew" : "did not grow"}`);
				return !grew
			}

			// No loader appeared — check if scrollHeight grew (new content loaded without spinner)
			const grew = root.scrollHeight > beforeHeight;
			if (!grew) {
				console.debug("loadMoreMessages: at top, no loader, no new content — reached last page");
				abortController.signal.removeEventListener("abort", abortHandler);
				return true
			}
		}

		// Fallback: wait for progressbar to appear (with shorter timeout)
		let loadingElement;
		try {
			loadingElement = await Promise.race([
				waitForElement(root, () => {
					if (findVisibleLoader() === null) {
						root.scrollTop = scrollToTopValue;
					}
					return findVisibleLoader()
				}, scrollAbortController),
				new Promise(resolve => {
					resolveTimeout = resolve;
					findLoaderTimeout = setTimeout(() => {
						resolve();
					}, 3000);
				})
			]);
		} catch (ex) {
			console.error(ex);
		}
		scrollAbortController.abort("Scrolling took too much time. Timeout after 10s");
		abortController.signal.removeEventListener("abort", abortHandler);
		clearTimeout(findLoaderTimeout);
		if (loadingElement && loadingElement !== true) {
			console.debug("loadMoreMessages: Found loader; Stand-by until it is removed (max 5s)");
			await Promise.race([
				waitForElement(root, () => findVisibleLoader() === null, abortController),
				new Promise(resolve => setTimeout(resolve, 5000))
			]);
		}
		const atTop = isAtTop();
		console.debug(`loadMoreMessages: scrollTop is ${root.scrollTop} — ${atTop ? "reached last page" : "not last page"}`);
		return atTop
	}

	/** @module ui-messages-wrapper UI element representing the messages wrapper */


	class UIMessagesWrapper extends UIComponent {

		/**
		 * @param {AbortController} abortController
		 * @returns {Promise}
		 */
		fetchAndRenderThreadNextMessagePage(abortController) {
			return loadMoreMessages(this.root, abortController)
		}

	}

	/** @module default-ui Default UI / English UI */


	class DefaultUI extends UI {

		constructor(root, identifier = {}) {
			super(root, identifier);
			this.lastScrollTop = null;
		}

		/**
		 * @param {Window} window
		 * @returns {DefaultUI}
		 */
		static create(window) {
			console.debug("UI create: Looking for messagesWrapperElement");
			const messagesWrapperElement = findMessagesWrapper(window);
			if (messagesWrapperElement !== null) {
				console.debug("Found messagesWrapperElement", messagesWrapperElement);
				const uiMessagesWrapper = new UIMessagesWrapper(messagesWrapperElement);
				return new DefaultUI(window, { uiMessagesWrapper })
			} else {
				throw new Error("Unable to find messagesWrapperElement. The query selector might be out of date.")
			}
		}

		/**
		 * @param {AbortController} abortController
		 * @returns {Promise}
		 */
		async fetchAndRenderThreadNextMessagePage(abortController) {
			console.debug("UI fetchAndRenderThreadNextMessagePage");
			return await this.identifier.uiMessagesWrapper.fetchAndRenderThreadNextMessagePage(abortController)
		}

		/**
		 * Scroll until a (visible) message is found and return it.
		 *
		 * Instagram uses flex-direction: column-reverse on the messages container.
		 * This means scrollTop=0 is the BOTTOM (newest messages) and scrolling to
		 * older messages requires NEGATIVE scrollTop values.
		 * In normal (non-reversed) layouts, scrollTop=0 is the top and the max is positive.
		 *
		 * This method detects the layout direction and scrolls accordingly.
		 *
		 * @param {AbortController} abortController
		 * @returns {Promise<UIPIMessage|false>}
		 */
		async getNextUIPIMessage(abortController) {
			console.debug("UI getNextUIPIMessage", this.lastScrollTop);
			const uiMessagesWrapperRoot = this.identifier.uiMessagesWrapper.root;

			// Detect column-reverse: scrollTop can go negative
			const style = this.root.getComputedStyle
				? this.root.getComputedStyle(uiMessagesWrapperRoot)
				: uiMessagesWrapperRoot.ownerDocument.defaultView.getComputedStyle(uiMessagesWrapperRoot);
			const isReversed = style.flexDirection === "column-reverse";

			// Pre-check: try finding a message at the current scroll position without scrolling.
			// This catches messages already visible in viewport (common for short conversations
			// and after unsending when the DOM shrinks).
			try {
				const messageElement = getFirstVisibleMessage(uiMessagesWrapperRoot, abortController, this.root);
				if (messageElement) {
					console.debug("getNextUIPIMessage: found message without scrolling");
					const uiMessage = new UIMessage(messageElement);
					return new UIPIMessage(uiMessage)
				}
			} catch (ex) {
				console.error(ex);
			}

			// Allow up to 3 full passes; covers cases where DOM shrinks after unsends
			for (let pass = 0; pass < 3; pass++) {
				if (abortController.signal.aborted) {
					console.debug("abortController interupted the scrolling: stopping...");
					return false
				}

				if (isReversed) {
					// column-reverse: scrollTop ranges from 0 (bottom/newest) to negative (top/oldest)
					const minScroll = -(uiMessagesWrapperRoot.scrollHeight - uiMessagesWrapperRoot.clientHeight);
					const startPos = (pass === 0 && this.lastScrollTop !== null)
						? Math.max(this.lastScrollTop, minScroll)
						: 0; // Start from bottom (newest)

					// Use smaller increments for short conversations to avoid overshooting
					const totalRange = Math.abs(minScroll);
					const step = totalRange < 500 ? 30 : 150;

					console.debug(`getNextUIPIMessage [reversed] pass=${pass}, startPos=${startPos}, minScroll=${minScroll}, step=${step}`);

					for (let i = startPos; i >= minScroll; i = i - step) {
						if (abortController.signal.aborted) {
							console.debug("abortController interupted the scrolling: stopping...");
							return false
						}
						this.lastScrollTop = i;
						uiMessagesWrapperRoot.scrollTop = i;
						uiMessagesWrapperRoot.dispatchEvent(new this.root.Event("scroll"));
						await new Promise(resolve => setTimeout(resolve, 5));
						try {
							const messageElement = getFirstVisibleMessage(uiMessagesWrapperRoot, abortController, this.root);
							if (messageElement) {
								const uiMessage = new UIMessage(messageElement);
								return new UIPIMessage(uiMessage)
							}
						} catch (ex) {
							console.error(ex);
						}
					}
				} else {
					// Normal layout: scrollTop ranges from 0 (top) to positive max (bottom)
					const maxScroll = uiMessagesWrapperRoot.scrollHeight - uiMessagesWrapperRoot.clientHeight;
					const startScrollTop = (pass === 0 && this.lastScrollTop !== null)
						? Math.min(this.lastScrollTop, maxScroll)
						: maxScroll;

					// Use smaller increments for short conversations
					const step = maxScroll < 500 ? 30 : 150;

					console.debug(`getNextUIPIMessage pass=${pass}, startScrollTop=${startScrollTop}, maxScroll=${maxScroll}, step=${step}`);

					for (let i = Math.max(1, startScrollTop); i > 0; i = i - step) {
						if (abortController.signal.aborted) {
							console.debug("abortController interupted the scrolling: stopping...");
							return false
						}
						this.lastScrollTop = i;
						uiMessagesWrapperRoot.scrollTop = i;
						uiMessagesWrapperRoot.dispatchEvent(new this.root.Event("scroll"));
						await new Promise(resolve => setTimeout(resolve, 5));
						try {
							const messageElement = getFirstVisibleMessage(uiMessagesWrapperRoot, abortController, this.root);
							if (messageElement) {
								const uiMessage = new UIMessage(messageElement);
								return new UIPIMessage(uiMessage)
							}
						} catch (ex) {
							console.error(ex);
						}
					}
				}

				// Reached the end without finding a message.
				// Reset for a fresh pass (DOM may have shrunk after unsends).
				this.lastScrollTop = null;
				console.debug(`getNextUIPIMessage: pass ${pass} found nothing, retrying`);
			}

			console.debug("getNextUIPIMessage: exhausted all passes, no messages left");
			return false
		}

	}

	/** @module get-ui UI loader module. Allow loading of a certain UI based on a given strategy (locale etc..)
	 * There might be need for multiple UI as Instagram might serve different apps based on location for example.
	 * There is also a need to internationalize each ui so that it doesn't fail if we change the language.
	 */


	/**
	 *
	 * @returns {UI}
	 */
	function getUI() {
		return DefaultUI
	}

	/** @module uipi API for UI */


	/**
	 * UI Interface API
	 */
	class UIPI {

		/**
		 *
		 * @param {UI} ui
		 */
		constructor(ui) {
			this._ui = ui;
		}

		/**
		 *
		 * @param {Window} window
		 * @returns {UIPI}
		 */
		static create(window) {
			console.debug("UIPI.create");
			const ui = getUI().create(window);
			return new UIPI(ui)
		}

		/**
		 * @param {AbortController} abortController
		 * @returns {Promise}
		 */
		fetchAndRenderThreadNextMessagePage(abortController) {
			console.debug("UIPI fetchAndRenderThreadNextMessagePage");
			return this.ui.fetchAndRenderThreadNextMessagePage(abortController)
		}

		/**
		 * @param {AbortController} abortController
		 * @returns {Promise<UIPIMessage>}
		 */
		getNextUIPIMessage(abortController) {
			console.debug("UIPI getNextUIPIMessage");
			return this.ui.getNextUIPIMessage(abortController)
		}

		/**
		 *
		 * @type {UI}
		 */
		get ui() {
			return this._ui
		}

	}

	/** @module idmu Global/Main API for interacting with the UI */


	class IDMU {

		/**
		 *
		 * @param {Window} window
		 * @param {callback} onStatusText
		 */
		constructor(window, onStatusText) {
			this.window = window;
			this.uipi = null;
			this.onStatusText = onStatusText;
		}

		/**
		 * @param {AbortController} abortController
		 * @returns {Promise<UIPIMessage>}
		 */
		getNextUIPIMessage(abortController) {
			return this.uipi.getNextUIPIMessage(abortController)
		}

		/**
		 *
		 * @param {string} text
		 */
		setStatusText(text) {
			this.onStatusText(text);
		}


		/**
		 *
		 * @param {AbortController} abortController
		 * @returns {Promise}
		 */
		fetchAndRenderThreadNextMessagePage(abortController) {
			return this.uipi.fetchAndRenderThreadNextMessagePage(abortController)
		}

		/**
		 * Map Instagram UI
		 */
		loadUIPI() {
			console.debug("loadUIPI");
			this.uipi = UIPI.create(this.window);
		}


	}

	/** @module unsend-strategy Various strategies for unsending messages */


	/**
	 *
	 * @abstract
	 */
	class UnsendStrategy {

		/**
		 *
		 * @param {IDMU} idmu
		 */
		constructor(idmu) {
			this._idmu = idmu;
		}

		/**
		 *
		 * @abstract
		 * @returns {boolean}
		 */
		isRunning() {
		}

		/**
		 *
		 * @abstract
		 */
		stop() {
		}

		/**
		 *
		 * @abstract
		 */
		reset() {
		}

		/**
		 *
		 * @abstract
		 */
		async run() {
		}

		/**
		 * @readonly
		 * @type {IDMU}
		 */
		get idmu() {
			return this._idmu
		}

	}

	/** @module unsend-strategy Various strategies for unsending messages */


	/**
	 * Loads all pages first, then unsends messages from bottom to top.
	 * For short conversations (all messages fit in viewport), skips page loading entirely.
	 */
	class DefaultStrategy extends UnsendStrategy {

		/**
		 * @param {IDMU} idmu
		 */
		constructor(idmu) {
			super(idmu);
			this._allPagesLoaded = false;
			this._unsentCount = 0;
			this._pagesLoadedCount = 0;
			this._running = false;
			this._abortController = null;
			this._lastUnsendDate = null;
			this._consecutiveFailures = 0;
			this._MAX_PAGES_PER_RUN = 20;  // Load at most 20 pages before unsending; auto-restart handles the rest
		}

		/**
		 * @returns {boolean}
		 */
		isRunning() {
			return this._running && this._abortController && this._abortController.signal.aborted === false
		}

		stop() {
			console.debug("DefaultStrategy stop");
			this.idmu.setStatusText("Stopping...");
			this._abortController.abort("DefaultStrategy stopped");
		}

		reset() {
			this._allPagesLoaded = false;
			this._unsentCount = 0;
			this._lastUnsendDate = null;
			this._pagesLoadedCount = 0;
			this._consecutiveFailures = 0;
			this.idmu.setStatusText("Ready");
		}

		/**
		 * @returns {Promise}
		 */
		async run() {
			console.debug("DefaultStrategy.run()");
			this._unsentCount = 0;
			this._pagesLoadedCount = 0;
			this._consecutiveFailures = 0;
			this._running = true;
			this._abortController = new AbortController();
			// Clear stale ignore markers from previous runs so messages can be retried
			this.idmu.window.document.querySelectorAll("[data-idmu-ignore]").forEach(el => {
				el.removeAttribute("data-idmu-ignore");
			});
			this.idmu.loadUIPI();
			try {
				if (this._allPagesLoaded) {
					await this.#unsendNextMessage();
				} else {
					await this.#loadNextPage();
				}

				// Race condition: on first page load, Instagram's React may not have
				// finished hydrating message components (role attributes missing).
				// If we found nothing, wait and re-scan up to 3 times.
				if (this._unsentCount === 0 && !this._abortController.signal.aborted) {
					for (let retry = 1; retry <= 3; retry++) {
						this.idmu.setStatusText(`No messages detected, retrying (${retry}/3)...`);
						console.debug(`DefaultStrategy: 0 messages found, retry ${retry}/3`);
						await new Promise(resolve => setTimeout(resolve, 2000));
						if (this._abortController.signal.aborted) break
						// Reset for fresh scan
						this._allPagesLoaded = false;
						this._consecutiveFailures = 0;
						this.idmu.window.document.querySelectorAll("[data-idmu-ignore]").forEach(el => {
							el.removeAttribute("data-idmu-ignore");
						});
						this.idmu.loadUIPI();
						await this.#loadNextPage();
						if (this._unsentCount > 0 || this._abortController.signal.aborted) break
					}
				}

				if (this._abortController.signal.aborted) {
					this.idmu.setStatusText(`Aborted. ${this._unsentCount} message(s) unsent.`);
					console.debug("DefaultStrategy aborted");
				} else {
					this.idmu.setStatusText(`Done. ${this._unsentCount} message(s) unsent.`);
					console.debug("DefaultStrategy done");
				}
			} catch (ex) {
				console.error(ex);
				this.idmu.setStatusText(`Errored. ${this._unsentCount} message(s) unsent.`);
				console.debug("DefaultStrategy errored");
			}
			this._running = false;
		}

		/**
		 * Tries to load the thread next page.
		 * If loadMoreMessages returns true (no more pages), moves to unsending.
		 */
		async #loadNextPage() {
			if (this._abortController.signal.aborted) {
				console.debug("abortController interupted the loading of next page: stopping...");
				return
			}
			this.idmu.setStatusText(`Loading next page... (${this._pagesLoadedCount}/${this._MAX_PAGES_PER_RUN})`);
			try {
				const done = await this.idmu.fetchAndRenderThreadNextMessagePage(this._abortController);
				if (this._abortController.signal.aborted === false) {
					if (done) {
						this.idmu.setStatusText(`All pages loaded (${this._pagesLoadedCount} in total). Unsending...`);
						this._allPagesLoaded = true;
						await this.#unsendNextMessage();
					} else {
						this._pagesLoadedCount++;
						// Cap page loading — start unsending what's in the DOM, auto-restart will get the rest
						if (this._pagesLoadedCount >= this._MAX_PAGES_PER_RUN) {
							this.idmu.setStatusText(`Page cap reached (${this._pagesLoadedCount}). Unsending batch...`);
							this._allPagesLoaded = false;  // Keep false so next run re-loads
							await this.#unsendNextMessage();
						} else {
							await this.#loadNextPage();
						}
					}
				} else {
					console.debug("abortController interupted the loading of next page: stopping...");
				}
			} catch (ex) {
				console.error(ex);
			}
		}

		/**
		 * Unsend first message in viewport.
		 * Uses adaptive delays: fast baseline (1-2s) with exponential backoff on rate limit detection.
		 */
		async #unsendNextMessage() {
			if (this._abortController.signal.aborted) {
				console.debug("abortController interupted the unsending of next message: stopping...");
				return
			}
			if (this._consecutiveFailures >= 5) {
				this.idmu.setStatusText(`Stopped: ${this._consecutiveFailures} consecutive failures. ${this._unsentCount} message(s) unsent.`);
				console.debug("DefaultStrategy stopping due to consecutive failures");
				return
			}
			let canScroll = true;
			let msgElement = null;
			try {
				this.idmu.setStatusText(`Retrieving next message... (${this._unsentCount} unsent so far)`);
				const uipiMessage = await this.idmu.getNextUIPIMessage(this._abortController);
				canScroll = uipiMessage !== false;
				if (uipiMessage) {
					this.idmu.setStatusText(`Unsending message... (${this._unsentCount + 1})`);

					// Adaptive delay: 1-2s randomized baseline between unsends
					if (this._lastUnsendDate !== null) {
						const elapsed = Date.now() - this._lastUnsendDate.getTime();
						const minDelay = 1000 + Math.floor(Math.random() * 1000); // 1-2s
						if (elapsed < minDelay) {
							const waitMs = minDelay - elapsed;
							this.idmu.setStatusText(`Waiting ${(waitMs / 1000).toFixed(1)}s... (${this._unsentCount} unsent so far)`);
							await new Promise(resolve => setTimeout(resolve, waitMs));
						}
					}

					if (this._abortController.signal.aborted) return

					msgElement = uipiMessage.uiMessage.root;
					const unsent = await uipiMessage.unsend(this._abortController);

					if (unsent) {
						// Verify the message actually disappeared from DOM (server accepted the mutation)
						await new Promise(resolve => setTimeout(resolve, 800));
						const stillInDOM = msgElement.isConnected && !msgElement.hasAttribute("data-idmu-unsent");
						if (stillInDOM) {
							// Server likely rejected — the message reappeared after optimistic removal
							console.debug("DefaultStrategy: message still in DOM after unsend, possible rate limit");
							msgElement.removeAttribute("data-idmu-ignore");
							this._consecutiveFailures++;
							const backoffMs = Math.min(60000, 5000 * Math.pow(2, this._consecutiveFailures - 1));
							this.idmu.setStatusText(`Rate limit detected. Backing off ${(backoffMs / 1000).toFixed(0)}s... (${this._unsentCount} unsent)`);
							await new Promise(resolve => setTimeout(resolve, backoffMs));
						} else {
							this._lastUnsendDate = new Date();
							this._unsentCount++;
							this._consecutiveFailures = 0;
							// DOM shrunk after removal; reset scroll for fresh scan
							if (this.idmu.uipi && this.idmu.uipi.ui) {
								this.idmu.uipi.ui.lastScrollTop = null;
							}
						}
					} else {
						// Unsend workflow returned false — allow retry on next pass
						console.debug("DefaultStrategy: unsend returned false, removing ignore marker for retry");
						msgElement.removeAttribute("data-idmu-ignore");
						this._consecutiveFailures++;
					}
				}
			} catch (ex) {
				console.error(ex);
				// Remove ignore marker so this message can be retried
				if (msgElement) {
					msgElement.removeAttribute("data-idmu-ignore");
				}
				this._consecutiveFailures++;
				const backoffMs = Math.min(60000, 3000 * Math.pow(2, this._consecutiveFailures - 1));
				this.idmu.setStatusText(`Workflow failed (${this._consecutiveFailures}/5), retrying in ${(backoffMs / 1000).toFixed(0)}s... (${this._unsentCount} unsent)`);
				await new Promise(resolve => setTimeout(resolve, backoffMs));
			} finally {
				if (canScroll && this._abortController && !this._abortController.signal.aborted) {
					await this.#unsendNextMessage();
				}
			}
		}

	}

	/** @module alert Alert UI */

	/**
	 *
	 * @param {Document} document
	 * @returns {HTMLButtonElement}
	 */
	function createAlertsWrapperElement(document) {
		const alertsWrapperElement = document.createElement("div");
		alertsWrapperElement.id = "idmu-alerts";
		alertsWrapperElement.style.position = "fixed";
		alertsWrapperElement.style.top = "20px";
		alertsWrapperElement.style.right = "20px";
		alertsWrapperElement.style.display = "grid";
		return alertsWrapperElement
	}

	/** @module overlay IDMU's overlay */

	/**
	 * @param {Document} document
	 * @returns {HTMLDivElement}
	 */
	function createOverlayElement(document) {
		const overlayElement = document.createElement("div");
		overlayElement.id = "idmu-overlay";
		overlayElement.tabIndex = 0;
		overlayElement.style.top = "0";
		overlayElement.style.right = "0";
		overlayElement.style.position = "fixed";
		overlayElement.style.width = "100vw";
		overlayElement.style.height = "100vh";
		overlayElement.style.zIndex = "998";
		overlayElement.style.backgroundColor = "#000000d6";
		overlayElement.style.display = "none";
		return overlayElement
	}

	/** @module ui IDMU's own ui/overlay
	 * Provide a button to unsend messages
	 */


	class OSD {
		/**
		 *
		 * @param {Document} document
		 * @param {HTMLDivElement} root
		 * @param {HTMLDivElement} overlayElement
		 * @param {HTMLDivElement} menuElement
		 * @param {HTMLButtonElement} unsendThreadMessagesButton
		 * @param {HTMLDivElement} statusElement
		 */
		constructor(document, root, overlayElement, menuElement, unsendThreadMessagesButton, statusElement) {
			this._document = document;
			this._root = root;
			this._overlayElement = overlayElement;
			this._menuElement = menuElement;
			this._statusElement = statusElement;
			this._unsendThreadMessagesButton = unsendThreadMessagesButton;
			this._idmu = new IDMU(this.window, this.onStatusText.bind(this));
			this._strategy = new DefaultStrategy(this._idmu); // TODO move out
		}

		/**
		 *
		 * @param {window} window
		 * @returns {OSD}
		 */
		static render(window) {
			console.debug("render");
			const ui = OSD.create(window.document);
			window.document.body.appendChild(ui.root);
			return ui
		}

		/**
		 *
		 * @param   {Document} document
		 * @returns {OSD}
		 */
		static create(document) {
			const root = document.createElement("div");
			root.id = "idmu-root";
			const menuElement = createMenuElement(document);
			const overlayElement = createOverlayElement(document);
			const alertsWrapperElement = createAlertsWrapperElement(document);
			const unsendThreadMessagesButton = createMenuButtonElement(document, "Unsend all DMs", BUTTON_STYLE.PRIMARY);
			const statusElement = document.createElement("div");
			statusElement.textContent = "Ready";
			statusElement.id = "idmu-status";
			statusElement.style = "width: 200px";
			document.body.appendChild(overlayElement);
			document.body.appendChild(alertsWrapperElement);
			menuElement.appendChild(unsendThreadMessagesButton);
			menuElement.appendChild(statusElement);
			root.appendChild(menuElement);
			const ui = new OSD(document, root, overlayElement, menuElement, unsendThreadMessagesButton, statusElement);
			document.addEventListener("keydown", (event) => ui.#onWindowKeyEvent(event)); // TODO test
			document.addEventListener("keyup", (event) => ui.#onWindowKeyEvent(event)); // TODO test
			unsendThreadMessagesButton.addEventListener("click", (event) => ui.#onUnsendThreadMessagesButtonClick(event));
			ui._mutationObserver = new MutationObserver((mutations) => ui.#onMutations(ui, mutations));
			ui._mutationObserver.observe(document.body, { childList: true }); // TODO test
			unsendThreadMessagesButton.dataTextContent = unsendThreadMessagesButton.textContent;
			unsendThreadMessagesButton.dataBackgroundColor = unsendThreadMessagesButton.style.backgroundColor;
			return ui
		}

		/**
		 *
		 * @param {string} text
		 */
		onStatusText(text) {
			this.statusElement.textContent = text;
		}

		async #startUnsending() {
	[...this.menuElement.querySelectorAll("button")].filter(button => button !== this.unsendThreadMessagesButton).forEach(button => {
				button.style.visibility = "hidden";
				button.disabled = true;
			});
			this.overlayElement.style.display = "";
			this.overlayElement.focus();
			this.unsendThreadMessagesButton.textContent = "Stop processing";
			this.unsendThreadMessagesButton.style.backgroundColor = "#FA383E";
			this.statusElement.style.color = "white";
			this._mutationObserver.disconnect();
			try {
				await this.strategy.run();
			} catch(error) {
				console.error(error);
				if(this.strategy.isRunning()) {
					this.strategy.stop();
				}
				this.statusElement.innerHTML = `<span style="color: red">An error occured, <a href="https://github.com/thoughtsunificator/instagram-dm-unsender/issues/new?template=bug_report.md">please open an issue</a></span>`;
			} finally {
				this.#onUnsendingFinished();
			}
		}

		/**
		 *
		 * @param {OSD} ui
		 */
		#onMutations(ui) {
			if(ui.root.ownerDocument.querySelector("[id^=mount] > div > div > div") !== null && ui) {
				if(this._mutationObserver) {
					this._mutationObserver.disconnect();
				}
				this._mutationObserver = new MutationObserver(ui.#onMutations.bind(this, ui));
				this._mutationObserver.observe(ui.root.ownerDocument.querySelector("[id^=mount] > div > div > div"), { childList: true, attributes: true });
			}
			if(this.window.location.pathname.startsWith("/direct/t/")) {
				if(!this.strategy.isRunning()) {
					this.strategy.reset();
				}
				this.root.style.display = "";
			} else {
				this.root.style.display = "none";
				if(this.strategy.isRunning()) {
					this.strategy.stop();
				}
			}
		}

		/**
		 *
		 * @param {OSD} ui
		 * @param {Event} event
		 */
		#onUnsendThreadMessagesButtonClick() {
			if(this.strategy.isRunning()) {
				console.debug("User asked for messages unsending to stop");
				this.strategy.stop();
				this.#onUnsendingFinished();
			} else {
				console.debug("User asked for messages unsending to start; UI interaction will be disabled in the meantime");
				this.#startUnsending();
			}
		}

		/**
		 *
		 * @param {Event} event
		 * @returns {boolean}
		 */
		#onWindowKeyEvent(event) {
			if(this.strategy.isRunning()) {
				console.log("User interaction is disabled as the unsending is still running; Please stop the execution first.");
				event.stopImmediatePropagation();
				event.preventDefault();
				event.stopPropagation();
				this.overlayElement.focus();
				return false
			}
		}

		#onUnsendingFinished() {
			console.debug("render onUnsendingFinished")
			;[...this.menuElement.querySelectorAll("button")].filter(button => button !== this.unsendThreadMessagesButton).forEach(button => {
				button.style.visibility = "";
				button.disabled = false;
			});
			this.unsendThreadMessagesButton.textContent = this.unsendThreadMessagesButton.dataTextContent;
			this.unsendThreadMessagesButton.style.backgroundColor = this.unsendThreadMessagesButton.dataBackgroundColor;
			this.overlayElement.style.display = "none";
			this.statusElement.style.color = "";
			this._mutationObserver.observe(this._document.body, { childList: true }); // TODO test
		}

		/**
		 * @readonly
		 * @type {Document}
		 */
		get document() {
			return this._document
		}

		/**
		 * @readonly
		 * @type {Window}
		 */
		get window() {
			return this._document.defaultView
		}

		/**
		 * @readonly
		 * @type {HTMLDivElement}
		 */
		get root() {
			return this._root
		}

		/**
		 * @readonly
		 * @type {HTMLDivElement}
		 */
		get overlayElement() {
			return this._overlayElement
		}

		/**
		 * @readonly
		 * @type {HTMLDivElement}
		 */
		get menuElement() {
			return this._menuElement
		}

		/**
		 * @readonly
		 * @type {HTMLButtonElement}
		 */
		get unsendThreadMessagesButton() {
			return this._unsendThreadMessagesButton
		}

		/**
		 * @readonly
		 * @type {HTMLDivElement}
		 */
		get statusElement() {
			return this._statusElement
		}

		/**
		 * @readonly
		 * @type {UnsendStrategy}
		 */
		get strategy() { // TODO move out
			return this._strategy
		}

		/**
		 * @readonly
		 * @type {IDMU}
		 */
		get idmu() {
			return this._idmu
		}

	}

	/** @module main Main module */


	/**
	 * @param {Window} window
	 */
	function main(window) {
		OSD.render(window);
	}

	if(typeof window !== "undefined") {
		main(window);
	}

	exports.main = main;

	return exports;

})({});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWRtdS51c2VyLmpzIiwic291cmNlcyI6WyIuLi9zcmMvcnVudGltZS91c2Vyc2NyaXB0L29zZC9zdHlsZS9pbnN0YWdyYW0uanMiLCIuLi9zcmMvcnVudGltZS91c2Vyc2NyaXB0L29zZC9tZW51LWJ1dHRvbi5qcyIsIi4uL3NyYy9ydW50aW1lL3VzZXJzY3JpcHQvb3NkL21lbnUuanMiLCIuLi9zcmMvZG9tL2FzeW5jLWV2ZW50cy5qcyIsIi4uL3NyYy91aS91aS1jb21wb25lbnQuanMiLCIuLi9zcmMvdWkvZGVmYXVsdC9zdHJpbmdzLmpzIiwiLi4vc3JjL3VpL2RlZmF1bHQvdWktbWVzc2FnZS5qcyIsIi4uL3NyYy91aXBpL3VpcGktbWVzc2FnZS5qcyIsIi4uL3NyYy91aS91aS5qcyIsIi4uL3NyYy91aS9kZWZhdWx0L2RvbS1sb29rdXAuanMiLCIuLi9zcmMvdWkvZGVmYXVsdC91aS1tZXNzYWdlcy13cmFwcGVyLmpzIiwiLi4vc3JjL3VpL2RlZmF1bHQvZGVmYXVsdC11aS5qcyIsIi4uL3NyYy91aS9nZXQtdWkuanMiLCIuLi9zcmMvdWlwaS91aXBpLmpzIiwiLi4vc3JjL2lkbXUvaWRtdS5qcyIsIi4uL3NyYy91aS91bnNlbmQtc3RyYXRlZ3kuanMiLCIuLi9zcmMvdWkvZGVmYXVsdC91bnNlbmQtc3RyYXRlZ3kuanMiLCIuLi9zcmMvcnVudGltZS91c2Vyc2NyaXB0L29zZC9hbGVydC5qcyIsIi4uL3NyYy9ydW50aW1lL3VzZXJzY3JpcHQvb3NkL292ZXJsYXkuanMiLCIuLi9zcmMvcnVudGltZS91c2Vyc2NyaXB0L29zZC9vc2QuanMiLCIuLi9zcmMvcnVudGltZS91c2Vyc2NyaXB0L21haW4uanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqIEBtb2R1bGUgaW5zdGFncmFtIEhlbHBlcnMgdG8gbWltaWNrIEluc3RhZ3JhbSdzIGxvb2sgYW5kIGZlZWwgKi9cclxuXHJcbmV4cG9ydCBjb25zdCBCVVRUT05fU1RZTEUgPSB7XHJcblx0XCJQUklNQVJZXCI6IFwicHJpbWFyeVwiLFxyXG5cdFwiU0VDT05EQVJZXCI6IFwic2Vjb25kYXJ5XCIsXHJcbn1cclxuXHJcbi8qKlxyXG4gKlxyXG4gKiBAcGFyYW0ge0hUTUxCdXR0b25FbGVtZW50fSBidXR0b25FbGVtZW50XHJcbiAqIEBwYXJhbSB7c3RyaW5nfSAgICAgICAgICAgIHN0eWxlTmFtZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5QnV0dG9uU3R5bGUoYnV0dG9uRWxlbWVudCwgc3R5bGVOYW1lKSB7XHJcblx0YnV0dG9uRWxlbWVudC5zdHlsZS5mb250U2l6ZSA9IFwidmFyKC0tc3lzdGVtLTE0LWZvbnQtc2l6ZSlcIlxyXG5cdGJ1dHRvbkVsZW1lbnQuc3R5bGUuY29sb3IgPSBcIndoaXRlXCJcclxuXHRidXR0b25FbGVtZW50LnN0eWxlLmJvcmRlciA9IFwiMHB4XCJcclxuXHRidXR0b25FbGVtZW50LnN0eWxlLmJvcmRlclJhZGl1cyA9IFwiOHB4XCJcclxuXHRidXR0b25FbGVtZW50LnN0eWxlLnBhZGRpbmcgPSBcIjhweFwiXHJcblx0YnV0dG9uRWxlbWVudC5zdHlsZS5mb250V2VpZ2h0ID0gXCJib2xkXCJcclxuXHRidXR0b25FbGVtZW50LnN0eWxlLmN1cnNvciA9IFwicG9pbnRlclwiXHJcblx0YnV0dG9uRWxlbWVudC5zdHlsZS5saW5lSGVpZ2h0ID0gXCJ2YXIoLS1zeXN0ZW0tMTQtbGluZS1oZWlnaHQpXCJcclxuXHRpZihzdHlsZU5hbWUpIHtcclxuXHRcdGJ1dHRvbkVsZW1lbnQuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gYHJnYih2YXIoLS1pZy0ke3N0eWxlTmFtZX0tYnV0dG9uKSlgXHJcblx0fVxyXG59XHJcbiIsIi8qKiBAbW9kdWxlIG1lbnUtYnV0dG9uIEhlbHBlcnMgdG8gY3JlYXRlIGJ1dHRvbnMgdGhhdCBjYW4gYmUgdXNlZCBpbiBJRE1VJ3MgbWVudSAqL1xyXG5cclxuaW1wb3J0IHsgYXBwbHlCdXR0b25TdHlsZSB9IGZyb20gXCIuL3N0eWxlL2luc3RhZ3JhbS5qc1wiXHJcblxyXG4vKipcclxuICpcclxuICogQHBhcmFtIHtEb2N1bWVudH0gZG9jdW1lbnRcclxuICogQHBhcmFtIHtzdHJpbmd9ICAgdGV4dFxyXG4gKiBAcGFyYW0ge3N0cmluZ30gICBzdHlsZU5hbWVcclxuICogQHJldHVybnMge0hUTUxCdXR0b25FbGVtZW50fVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZU1lbnVCdXR0b25FbGVtZW50KGRvY3VtZW50LCB0ZXh0LCBzdHlsZU5hbWUpIHtcclxuXHRjb25zdCBidXR0b25FbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKVxyXG5cdGJ1dHRvbkVsZW1lbnQudGV4dENvbnRlbnQgPSB0ZXh0XHJcblx0YXBwbHlCdXR0b25TdHlsZShidXR0b25FbGVtZW50LCBzdHlsZU5hbWUpXHJcblx0YnV0dG9uRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2VvdmVyXCIsICgpID0+IHtcclxuXHRcdGJ1dHRvbkVsZW1lbnQuc3R5bGUuZmlsdGVyID0gYGJyaWdodG5lc3MoMS4xNSlgXHJcblx0fSlcclxuXHRidXR0b25FbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW91dFwiLCAoKSA9PiB7XHJcblx0XHRidXR0b25FbGVtZW50LnN0eWxlLmZpbHRlciA9IGBgXHJcblx0fSlcclxuXHRyZXR1cm4gYnV0dG9uRWxlbWVudFxyXG59XHJcbiIsIi8qKiBAbW9kdWxlIG1lbnUgSURNVSdzIG1haW4gbWVudSAqL1xyXG5cclxuLyoqXHJcbiAqIEBwYXJhbSB7RG9jdW1lbnR9IGRvY3VtZW50XHJcbiAqIEByZXR1cm5zIHtIVE1MQnV0dG9uRWxlbWVudH1cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVNZW51RWxlbWVudChkb2N1bWVudCkge1xyXG5cdGNvbnN0IG1lbnVFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxyXG5cdG1lbnVFbGVtZW50LmlkID0gXCJpZG11LW1lbnVcIlxyXG5cdG1lbnVFbGVtZW50LnN0eWxlLnRvcCA9IFwiMjBweFwiXHJcblx0bWVudUVsZW1lbnQuc3R5bGUucmlnaHQgPSBcIjQzMHB4XCJcclxuXHRtZW51RWxlbWVudC5zdHlsZS5wb3NpdGlvbiA9IFwiZml4ZWRcIlxyXG5cdG1lbnVFbGVtZW50LnN0eWxlLnpJbmRleCA9IDk5OVxyXG5cdG1lbnVFbGVtZW50LnN0eWxlLmRpc3BsYXkgPSBcImZsZXhcIlxyXG5cdG1lbnVFbGVtZW50LnN0eWxlLmdhcCA9IFwiMTBweFwiXHJcblx0bWVudUVsZW1lbnQuc3R5bGUucGxhY2VJdGVtcyA9IFwiY2VudGVyXCJcclxuXHRyZXR1cm4gbWVudUVsZW1lbnRcclxufVxyXG4iLCIvKiogQG1vZHVsZSBhc3luYy1ldmVudHMgVXRpbHMgbW9kdWxlIGZvciBmaW5kaW5nIGVsZW1lbnRzIGFzeW5jaHJvbm91c2x5IGluIHRoZSBET00gKi9cclxuXHJcbi8qKlxyXG4gKlxyXG4gKiBAY2FsbGJhY2sgZ2V0RWxlbWVudFxyXG4gKiBAcmV0dXJucyB7RWxlbWVudH1cclxuICovXHJcblxyXG4vKipcclxuICogUnVuIGEgY2FsbGJhY2sgb24gRE9NIG11dGF0aW9uIChhZGRlZE5vZGUpIHRoYXQgdGVzdHMgd2hldGhlciBhIHNwZWNpZmljIGVsZW1lbnQgd2FzIGZvdW5kIChvciB3YXMgbm90IGZvdW5kKVxyXG4gKiBXaGVuIHRoZSBjYWxsYmFjayByZXR1cm5zIHRydWUgdGhlIHByb21pc2UgaXMgcmVzb2x2ZWRcclxuICogQHBhcmFtIHtFbGVtZW50fSB0YXJnZXRcclxuICogQHBhcmFtIHtnZXRFbGVtZW50fSBnZXRFbGVtZW50XHJcbiAqIEBwYXJhbSB7QWJvcnRDb250cm9sbGVyfSBhYm9ydENvbnRyb2xsZXJcclxuICogQHJldHVybnMge1Byb21pc2U8RWxlbWVudD59XHJcbiAqIEBleGFtcGxlXHJcbiAqIHdhaXRGb3JFbGVtZW50KFxyXG4gKlx0XHRib2R5LFxyXG4gKlx0XHQoKSA9PiBib2R5LmNvbnRhaW5zKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJidXR0b24jZm9vXCIpKSxcclxuICpcdFx0YWJvcnRDb250cm9sbGVyXHJcbiAqXHQpXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gd2FpdEZvckVsZW1lbnQodGFyZ2V0LCBnZXRFbGVtZW50LCBhYm9ydENvbnRyb2xsZXIpIHtcclxuXHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG5cdFx0bGV0IG11dGF0aW9uT2JzZXJ2ZXJcclxuXHRcdGNvbnN0IGFib3J0SGFuZGxlciA9ICgpID0+IHtcclxuXHRcdFx0aWYobXV0YXRpb25PYnNlcnZlcikge1xyXG5cdFx0XHRcdG11dGF0aW9uT2JzZXJ2ZXIuZGlzY29ubmVjdCgpXHJcblx0XHRcdH1cclxuXHRcdFx0cmVqZWN0KG5ldyBFcnJvcihgd2FpdEZvckVsZW1lbnQgYWJvcnRlZDogJHthYm9ydENvbnRyb2xsZXIuc2lnbmFsLnJlYXNvbn1gKSlcclxuXHRcdH1cclxuXHRcdGFib3J0Q29udHJvbGxlci5zaWduYWwuYWRkRXZlbnRMaXN0ZW5lcihcImFib3J0XCIsIGFib3J0SGFuZGxlcilcclxuXHRcdGxldCBlbGVtZW50ID0gZ2V0RWxlbWVudCgpXHJcblx0XHRpZihlbGVtZW50KSB7XHJcblx0XHRcdHJlc29sdmUoZWxlbWVudClcclxuXHRcdFx0YWJvcnRDb250cm9sbGVyLnNpZ25hbC5yZW1vdmVFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgYWJvcnRIYW5kbGVyKVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0bXV0YXRpb25PYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKChtdXRhdGlvbnMsIG9ic2VydmVyKSA9PiB7XHJcblx0XHRcdFx0ZWxlbWVudCA9IGdldEVsZW1lbnQobXV0YXRpb25zKVxyXG5cdFx0XHRcdGlmKGVsZW1lbnQpIHtcclxuXHRcdFx0XHRcdG9ic2VydmVyLmRpc2Nvbm5lY3QoKVxyXG5cdFx0XHRcdFx0cmVzb2x2ZShlbGVtZW50KVxyXG5cdFx0XHRcdFx0YWJvcnRDb250cm9sbGVyLnNpZ25hbC5yZW1vdmVFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgYWJvcnRIYW5kbGVyKVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSlcclxuXHRcdFx0bXV0YXRpb25PYnNlcnZlci5vYnNlcnZlKHRhcmdldCwgeyBzdWJ0cmVlOiB0cnVlLCBjaGlsZExpc3Q6IHRydWUgfSlcclxuXHRcdH1cclxuXHR9KVxyXG59XHJcblxyXG4vKipcclxuICogQ2xpY2sgdGFyZ2V0IGFuZCBydW4gd2FpdEZvckVsZW1lbnRcclxuICogQHBhcmFtIHtFbGVtZW50fSBjbGlja1RhcmdldFxyXG4gKiBAcGFyYW0ge0VsZW1lbnR9IHRhcmdldFxyXG4gKiBAcGFyYW0ge2dldEVsZW1lbnR9IGdldEVsZW1lbnRcclxuICogQHBhcmFtIHtBYm9ydENvbnRyb2xsZXJ9IGFib3J0Q29udHJvbGxlclxyXG4gKiBAcmV0dXJucyB7RWxlbWVudHxQcm9taXNlPEVsZW1lbnQ+fVxyXG4gKiBAZXhhbXBsZVxyXG4gKiBJbiB0aGlzIGNhc2UgY2xpY2tpbmcgXCIjZm9vXCIgYnV0dG9uIHdvdWxkIG1ha2UgXCIjYmFyXCIgYXBwZWFyXHJcbiAqIGNsaWNrRWxlbWVudEFuZFdhaXRGb3IoXHJcbiAqXHRcdGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjZm9vXCIpLFxyXG4gKlx0XHRib2R5LFxyXG4gKlx0XHQoKSA9PiBib2R5LmNvbnRhaW5zKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjYmFyXCIpKSxcclxuICpcdFx0YWJvcnRDb250cm9sbGVyXHJcbiAqXHQpXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY2xpY2tFbGVtZW50QW5kV2FpdEZvcihjbGlja1RhcmdldCwgdGFyZ2V0LCBnZXRFbGVtZW50LCBhYm9ydENvbnRyb2xsZXIpIHtcclxuXHRjb25zdCBwcm9taXNlID0gd2FpdEZvckVsZW1lbnQodGFyZ2V0LCBnZXRFbGVtZW50LCBhYm9ydENvbnRyb2xsZXIpXHJcblx0Y2xpY2tUYXJnZXQuY2xpY2soKVxyXG5cdHJldHVybiBnZXRFbGVtZW50KCkgfHwgcHJvbWlzZVxyXG59XHJcbiIsIi8qKiBAbW9kdWxlIHVpLWNvbXBvbmVudCBCYXNlIGNsYXNzIGZvciBhbnkgZWxlbWVudCB0aGF0IGlzIGEgcGFydCBvZiB0aGUgVUkuICovXHJcblxyXG5pbXBvcnQgeyB3YWl0Rm9yRWxlbWVudCwgY2xpY2tFbGVtZW50QW5kV2FpdEZvciB9IGZyb20gXCIuLi9kb20vYXN5bmMtZXZlbnRzLmpzXCJcclxuXHJcbi8qKlxyXG4gKlxyXG4gKiBAYWJzdHJhY3RcclxuICovXHJcbmNsYXNzIFVJQ29tcG9uZW50IHtcclxuXHQvKipcclxuXHQgKlxyXG5cdCAqIEBwYXJhbSB7RWxlbWVudH0gcm9vdFxyXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBpZGVudGlmaWVyXHJcblx0ICovXHJcblx0Y29uc3RydWN0b3Iocm9vdCwgaWRlbnRpZmllcj17fSkge1xyXG5cdFx0dGhpcy5yb290ID0gcm9vdFxyXG5cdFx0dGhpcy5pZGVudGlmaWVyID0gaWRlbnRpZmllclxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQWxpYXMgb2YgZG9tL2FzeW5jLWV2ZW50cyN3YWl0Rm9yRWxlbWVudFxyXG5cdCAqIEBwYXJhbSB7RWxlbWVudH0gdGFyZ2V0XHJcblx0ICogQHBhcmFtIHtmdW5jdGlvbn0gZ2V0RWxlbWVudFxyXG5cdCAqIEBwYXJhbSB7QWJvcnRDb250cm9sbGVyfSBhYm9ydENvbnRyb2xsZXJcclxuXHQgKiBAcmV0dXJucyB7UHJvbWlzZTxFbGVtZW50Pn1cclxuXHQgKi9cclxuXHR3YWl0Rm9yRWxlbWVudCh0YXJnZXQsIGdldEVsZW1lbnQsIGFib3J0Q29udHJvbGxlcikge1xyXG5cdFx0cmV0dXJuIGdldEVsZW1lbnQoKSB8fCB3YWl0Rm9yRWxlbWVudCh0YXJnZXQsIGdldEVsZW1lbnQsIGFib3J0Q29udHJvbGxlcilcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEFsaWFzIG9mIGRvbS9hc3luYy1ldmVudHMjY2xpY2tFbGVtZW50QW5kV2FpdEZvclxyXG5cdCAqIEBwYXJhbSB7RWxlbWVudH0gY2xpY2tUYXJnZXRcclxuXHQgKiBAcGFyYW0ge0VsZW1lbnR9IHRhcmdldFxyXG5cdCAqIEBwYXJhbSB7ZnVuY3Rpb259IGdldEVsZW1lbnRcclxuXHQgKiBAcGFyYW0ge0Fib3J0Q29udHJvbGxlcn0gYWJvcnRDb250cm9sbGVyXHJcblx0ICogQHJldHVybnMge1Byb21pc2U8RWxlbWVudD59XHJcblx0ICovXHJcblx0Y2xpY2tFbGVtZW50QW5kV2FpdEZvcihjbGlja1RhcmdldCwgdGFyZ2V0LCBnZXRFbGVtZW50LCBhYm9ydENvbnRyb2xsZXIpIHtcclxuXHRcdHJldHVybiBjbGlja0VsZW1lbnRBbmRXYWl0Rm9yKGNsaWNrVGFyZ2V0LCB0YXJnZXQsIGdldEVsZW1lbnQsIGFib3J0Q29udHJvbGxlcilcclxuXHR9XHJcblxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBVSUNvbXBvbmVudFxyXG4iLCJleHBvcnQge1xyXG5cdFVOU0VORF9URVhUX1ZBUklBTlRTLFxyXG5cdExBQkVMX1BBVFRFUk5TXHJcbn1cclxuXHJcbi8qKiBMb2NhbGUtaW5kZXBlbmRlbnQgcGF0dGVybnMgZm9yIHRoZSBcIlVuc2VuZFwiIG1lbnUgaXRlbSAqL1xyXG5jb25zdCBVTlNFTkRfVEVYVF9WQVJJQU5UUyA9IFtcclxuXHRcInVuc2VuZFwiLCAgICAgICAgLy8gRW5nbGlzaFxyXG5cdFwiYW5udWxsYSBpbnZpb1wiLCAvLyBJdGFsaWFuXHJcblx0XCJyZXRpcmFyXCIsICAgICAgIC8vIFBvcnR1Z3Vlc2VcclxuXHRcImRlc2hhY2VyXCIsICAgICAgLy8gU3BhbmlzaFxyXG5cdFwicmV0aXJlclwiLCAgICAgICAvLyBGcmVuY2hcclxuXHRcInp1csO8Y2tuZWhtZW5cIiwgIC8vIEdlcm1hblxyXG5dXHJcblxyXG5cclxuLyoqIFJlcHJlc2VudHMgdGhlIGRlc2NyaXB0aW9uIHRleHQgdGhhdCBpcyBhc3NvY2lhdGVkIHdpdGggdGhlIFwiLi4uXCIgYnV0dG9uIHRoYXQgcmV2ZWFscyB0aGUgYWN0aW9ucyBtZW51ICovXHJcbmNvbnN0IExBQkVMX1BBVFRFUk5TID0gW1xyXG5cdFwiW2FyaWEtbGFiZWxePSdTZWUgbW9yZSBvcHRpb25zIGZvciBtZXNzYWdlJ11cIixcclxuXHRcIlthcmlhLWxhYmVsKj0nbW9yZSBvcHRpb25zJ11cIixcclxuXHRcIlthcmlhLWxhYmVsKj0nTW9yZSddXCIsXHJcblx0XCJbYXJpYS1sYWJlbCo9J0FsdHJlIG9wemlvbmknXVwiLFxyXG5cdFwiW2FyaWEtbGFiZWwqPSdvcHppb25pJ11cIixcclxuXHRcIlthcmlhLWxhYmVsKj0nb3BjaW9uZXMnXVwiLFxyXG5cdFwiW2FyaWEtbGFiZWwqPSdvcHRpb25zJ11cIixcclxuXVxyXG5cclxuIiwiLyoqIEBtb2R1bGUgdWktbWVzc2FnZSBVSSBlbGVtZW50IHJlcHJlc2VudGluZyBhIG1lc3NhZ2UgKi9cclxuXHJcbmltcG9ydCBVSUNvbXBvbmVudCBmcm9tIFwiLi4vdWktY29tcG9uZW50LmpzXCJcclxuXHJcbmltcG9ydCAqIGFzIHN0cmluZ3MgZnJvbSBcIi4vc3RyaW5ncy5qc1wiXHJcblxyXG4vKipcclxuICogRGlzcGF0Y2hlcyBwb2ludGVyIGFuZCBtb3VzZSBob3ZlciBldmVudHMgb24gYSB0YXJnZXQgZWxlbWVudC5cclxuICogSW5zdGFncmFtJ3MgUmVhY3QgdXNlcyBwb2ludGVyIGV2ZW50cyBpbnRlcm5hbGx5OyBtb3VzZSBldmVudHMgYWxvbmUgYXJlIGluc3VmZmljaWVudC5cclxuICpcclxuICogQHBhcmFtIHtFbGVtZW50fSB0YXJnZXRcclxuICovXHJcbmZ1bmN0aW9uIGRpc3BhdGNoSG92ZXJJbih0YXJnZXQpIHtcclxuXHRjb25zdCByZWN0ID0gdGFyZ2V0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpXHJcblx0Y29uc3Qgb3B0cyA9IHtcclxuXHRcdGJ1YmJsZXM6IHRydWUsXHJcblx0XHRjYW5jZWxhYmxlOiB0cnVlLFxyXG5cdFx0Y2xpZW50WDogcmVjdC54ICsgcmVjdC53aWR0aCAvIDIsXHJcblx0XHRjbGllbnRZOiByZWN0LnkgKyByZWN0LmhlaWdodCAvIDIsXHJcblx0XHRwb2ludGVySWQ6IDEsXHJcblx0XHRwb2ludGVyVHlwZTogXCJtb3VzZVwiLFxyXG5cdH1cclxuXHR0YXJnZXQuZGlzcGF0Y2hFdmVudChuZXcgUG9pbnRlckV2ZW50KFwicG9pbnRlcmVudGVyXCIsIHsgLi4ub3B0cywgYnViYmxlczogZmFsc2UgfSkpXHJcblx0dGFyZ2V0LmRpc3BhdGNoRXZlbnQobmV3IFBvaW50ZXJFdmVudChcInBvaW50ZXJvdmVyXCIsIG9wdHMpKVxyXG5cdHRhcmdldC5kaXNwYXRjaEV2ZW50KG5ldyBQb2ludGVyRXZlbnQoXCJwb2ludGVybW92ZVwiLCBvcHRzKSlcclxuXHR0YXJnZXQuZGlzcGF0Y2hFdmVudChuZXcgTW91c2VFdmVudChcIm1vdXNlZW50ZXJcIiwgeyAuLi5vcHRzLCBidWJibGVzOiBmYWxzZSB9KSlcclxuXHR0YXJnZXQuZGlzcGF0Y2hFdmVudChuZXcgTW91c2VFdmVudChcIm1vdXNlb3ZlclwiLCBvcHRzKSlcclxuXHR0YXJnZXQuZGlzcGF0Y2hFdmVudChuZXcgTW91c2VFdmVudChcIm1vdXNlbW92ZVwiLCBvcHRzKSlcclxufVxyXG5cclxuLyoqXHJcbiAqIERpc3BhdGNoZXMgcG9pbnRlciBhbmQgbW91c2UgbGVhdmUgZXZlbnRzIG9uIGEgdGFyZ2V0IGVsZW1lbnQuXHJcbiAqXHJcbiAqIEBwYXJhbSB7RWxlbWVudH0gdGFyZ2V0XHJcbiAqL1xyXG5mdW5jdGlvbiBkaXNwYXRjaEhvdmVyT3V0KHRhcmdldCkge1xyXG5cdGNvbnN0IHJlY3QgPSB0YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClcclxuXHRjb25zdCBvcHRzID0ge1xyXG5cdFx0YnViYmxlczogdHJ1ZSxcclxuXHRcdGNhbmNlbGFibGU6IHRydWUsXHJcblx0XHRjbGllbnRYOiByZWN0LnggKyByZWN0LndpZHRoIC8gMixcclxuXHRcdGNsaWVudFk6IHJlY3QueSArIHJlY3QuaGVpZ2h0IC8gMixcclxuXHRcdHBvaW50ZXJJZDogMSxcclxuXHRcdHBvaW50ZXJUeXBlOiBcIm1vdXNlXCIsXHJcblx0fVxyXG5cdHRhcmdldC5kaXNwYXRjaEV2ZW50KG5ldyBQb2ludGVyRXZlbnQoXCJwb2ludGVyb3V0XCIsIG9wdHMpKVxyXG5cdHRhcmdldC5kaXNwYXRjaEV2ZW50KG5ldyBQb2ludGVyRXZlbnQoXCJwb2ludGVybGVhdmVcIiwgeyAuLi5vcHRzLCBidWJibGVzOiBmYWxzZSB9KSlcclxuXHR0YXJnZXQuZGlzcGF0Y2hFdmVudChuZXcgTW91c2VFdmVudChcIm1vdXNlb3V0XCIsIG9wdHMpKVxyXG5cdHRhcmdldC5kaXNwYXRjaEV2ZW50KG5ldyBNb3VzZUV2ZW50KFwibW91c2VsZWF2ZVwiLCB7IC4uLm9wdHMsIGJ1YmJsZXM6IGZhbHNlIH0pKVxyXG59XHJcblxyXG5jbGFzcyBVSU1lc3NhZ2UgZXh0ZW5kcyBVSUNvbXBvbmVudCB7XHJcblxyXG5cdC8qKlxyXG5cdCAqIERpc21pc3MgYW55IHN0YWxlIGRpYWxvZyBvciBkcm9wZG93biBsZWZ0IGZyb20gYSBwcmV2aW91cyBmYWlsZWQgd29ya2Zsb3cuXHJcblx0ICovXHJcblx0X2Rpc21pc3NTdGFsZU92ZXJsYXlzKCkge1xyXG5cdFx0Y29uc3QgZG9jID0gdGhpcy5yb290Lm93bmVyRG9jdW1lbnRcclxuXHRcdC8vIENsb3NlIHN0YWxlIGNvbmZpcm1hdGlvbiBkaWFsb2dzXHJcblx0XHRjb25zdCBzdGFsZURpYWxvZyA9IGRvYy5xdWVyeVNlbGVjdG9yKFwiW3JvbGU9ZGlhbG9nXVwiKVxyXG5cdFx0aWYgKHN0YWxlRGlhbG9nKSB7XHJcblx0XHRcdGNvbnNvbGUuZGVidWcoXCJEaXNtaXNzaW5nIHN0YWxlIGRpYWxvZ1wiKVxyXG5cdFx0XHRjb25zdCBjbG9zZUJ0biA9IHN0YWxlRGlhbG9nLnF1ZXJ5U2VsZWN0b3IoXCJidXR0b25cIilcclxuXHRcdFx0aWYgKGNsb3NlQnRuKSBjbG9zZUJ0bi5jbGljaygpXHJcblx0XHR9XHJcblx0XHQvLyBDbG9zZSBzdGFsZSBkcm9wZG93biBtZW51cyBieSBwcmVzc2luZyBFc2NhcGVcclxuXHRcdGNvbnN0IGFjdGl2ZU1lbnUgPSBkb2MucXVlcnlTZWxlY3RvcihcIltyb2xlPW1lbnVdLCBbcm9sZT1saXN0Ym94XVwiKVxyXG5cdFx0aWYgKGFjdGl2ZU1lbnUpIHtcclxuXHRcdFx0Y29uc29sZS5kZWJ1ZyhcIkRpc21pc3Npbmcgc3RhbGUgbWVudSB2aWEgRXNjYXBlXCIpXHJcblx0XHRcdGRvYy5ib2R5LmRpc3BhdGNoRXZlbnQobmV3IEtleWJvYXJkRXZlbnQoXCJrZXlkb3duXCIsIHsga2V5OiBcIkVzY2FwZVwiLCBidWJibGVzOiB0cnVlIH0pKVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRmluZCB0aGUgYWN0aW9uIGJ1dHRvbiB3aXRoaW4gdGhlIG1lc3NhZ2Ugcm93LlxyXG5cdCAqIEluc3RhZ3JhbSBtb3ZlZCBhcmlhLWxhYmVsIGZyb20gdGhlIGJ1dHRvbiBkaXYgdG8gYSBuZXN0ZWQgU1ZHL3RpdGxlLlxyXG5cdCAqIEFueSBtYXRjaCAoU1ZHIG9yIGRpdikgaXMgd2Fsa2VkIHVwIHRvIHRoZSBuZWFyZXN0IFtyb2xlPWJ1dHRvbl0gYW5jZXN0b3IuXHJcblx0ICpcclxuXHQgKiBAcGFyYW0ge0VsZW1lbnR9IHNjb3BlXHJcblx0ICogQHJldHVybnMge0VsZW1lbnR8bnVsbH1cclxuXHQgKi9cclxuXHRfZmluZEFjdGlvbkJ1dHRvbihzY29wZSkge1xyXG5cdFx0Zm9yIChjb25zdCBzZWwgb2Ygc3RyaW5ncy5MQUJFTF9QQVRURVJOUykge1xyXG5cdFx0XHRjb25zdCBlbCA9IHNjb3BlLnF1ZXJ5U2VsZWN0b3Ioc2VsKVxyXG5cdFx0XHRpZiAoZWwpIHtcclxuXHRcdFx0XHQvLyBBbHdheXMgcmVzb2x2ZSB0byBhIGNsaWNrYWJsZSBidXR0b24gY29udGFpbmVyXHJcblx0XHRcdFx0Y29uc3QgYnRuID0gZWwuY2xvc2VzdChcIltyb2xlPWJ1dHRvbl1cIikgfHwgZWwuY2xvc2VzdChcImJ1dHRvblwiKVxyXG5cdFx0XHRcdGlmIChidG4gJiYgc2NvcGUuY29udGFpbnMoYnRuKSkgcmV0dXJuIGJ0blxyXG5cdFx0XHRcdC8vIGVsIGl0c2VsZiBpcyBhbHJlYWR5IGEgYnV0dG9uLWxpa2UgZWxlbWVudFxyXG5cdFx0XHRcdGlmIChlbC50YWdOYW1lID09PSBcIkJVVFRPTlwiIHx8IGVsLmdldEF0dHJpYnV0ZShcInJvbGVcIikgPT09IFwiYnV0dG9uXCIpIHJldHVybiBlbFxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRmFsbGJhY2s6IGFueSByb2xlPWJ1dHRvbiB3aXRoIGFyaWEtaGFzcG9wdXA9bWVudSBpbnNpZGUgdGhlIG1lc3NhZ2Ugcm93XHJcblx0XHRyZXR1cm4gc2NvcGUucXVlcnlTZWxlY3RvcihcIltyb2xlPWJ1dHRvbl1bYXJpYS1oYXNwb3B1cD1tZW51XVwiKVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQHBhcmFtIHtBYm9ydENvbnRyb2xsZXJ9IGFib3J0Q29udHJvbGxlclxyXG5cdCAqIEByZXR1cm5zIHtQcm9taXNlPEhUTUxCdXR0b25FbGVtZW50Pn1cclxuXHQgKi9cclxuXHRhc3luYyBzaG93QWN0aW9uc01lbnVCdXR0b24oYWJvcnRDb250cm9sbGVyKSB7XHJcblx0XHRjb25zb2xlLmRlYnVnKFwiV29ya2Zsb3cgc3RlcCAxIDogc2hvd0FjdGlvbnNNZW51QnV0dG9uXCIsIHRoaXMucm9vdClcclxuXHRcdHRoaXMuX2Rpc21pc3NTdGFsZU92ZXJsYXlzKClcclxuXHJcblx0XHQvLyBDb2xsZWN0IGFsbCBob3ZlcmFibGUgYW5jZXN0b3JzIGZyb20gcm9vdCBkb3duIHRvIHRoZSBtZXNzYWdlIGJ1YmJsZS5cclxuXHRcdC8vIEluc3RhZ3JhbSBSZWFjdCBsaXN0ZW5zIGF0IGludGVybWVkaWF0ZSBsZXZlbHMgKHJvbGU9Z3JvdXAsIGZsZXgtZW5kIHdyYXBwZXIpLlxyXG5cdFx0Y29uc3QgaG92ZXJUYXJnZXRzID0gW3RoaXMucm9vdF1cclxuXHRcdGNvbnN0IGNvbGxlY3RUYXJnZXRzID0gKGVsLCBkZXB0aCkgPT4ge1xyXG5cdFx0XHRpZiAoZGVwdGggPiA4KSByZXR1cm5cclxuXHRcdFx0Zm9yIChjb25zdCBjaGlsZCBvZiBlbC5jaGlsZHJlbikge1xyXG5cdFx0XHRcdGhvdmVyVGFyZ2V0cy5wdXNoKGNoaWxkKVxyXG5cdFx0XHRcdGNvbGxlY3RUYXJnZXRzKGNoaWxkLCBkZXB0aCArIDEpXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGNvbGxlY3RUYXJnZXRzKHRoaXMucm9vdCwgMClcclxuXHJcblx0XHQvLyBUcnkgdXAgdG8gMyB0aW1lcyDigJQgaG92ZXIgZXZlbnRzIGNhbiBiZSBmbGFreVxyXG5cdFx0Zm9yIChsZXQgYXR0ZW1wdCA9IDA7IGF0dGVtcHQgPCAzOyBhdHRlbXB0KyspIHtcclxuXHRcdFx0aWYgKGFib3J0Q29udHJvbGxlci5zaWduYWwuYWJvcnRlZCkgcmV0dXJuIG51bGxcclxuXHJcblx0XHRcdGZvciAoY29uc3QgdGFyZ2V0IG9mIGhvdmVyVGFyZ2V0cykge1xyXG5cdFx0XHRcdGRpc3BhdGNoSG92ZXJJbih0YXJnZXQpXHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDApKVxyXG5cclxuXHRcdFx0Y29uc3QgYnRuID0gdGhpcy5fZmluZEFjdGlvbkJ1dHRvbih0aGlzLnJvb3QpXHJcblx0XHRcdGlmIChidG4pIHtcclxuXHRcdFx0XHRjb25zb2xlLmRlYnVnKFwiV29ya2Zsb3cgc3RlcCAxIDogZm91bmQgYWN0aW9uIGJ1dHRvbiBvbiBhdHRlbXB0XCIsIGF0dGVtcHQsIGJ0bilcclxuXHRcdFx0XHRyZXR1cm4gYnRuXHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnNvbGUuZGVidWcoXCJXb3JrZmxvdyBzdGVwIDEgOiBhdHRlbXB0XCIsIGF0dGVtcHQsIFwibm8gYnV0dG9uIGZvdW5kLCByZXRyeWluZy4uLlwiKVxyXG5cdFx0XHRkaXNwYXRjaEhvdmVyT3V0KHRoaXMucm9vdClcclxuXHRcdFx0YXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDUwKSlcclxuXHRcdH1cclxuXHJcblx0XHQvLyBGaW5hbCBmYWxsYmFjazogdXNlIHdhaXRGb3JFbGVtZW50IHdpdGggZXh0ZW5kZWQgdGltZW91dFxyXG5cdFx0Y29uc3Qgd2FpdEFib3J0Q29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKVxyXG5cdFx0bGV0IHByb21pc2VUaW1lb3V0XHJcblx0XHRjb25zdCBhYm9ydEhhbmRsZXIgPSAoKSA9PiB7XHJcblx0XHRcdHdhaXRBYm9ydENvbnRyb2xsZXIuYWJvcnQoXCJzaG93QWN0aW9uc01lbnVCdXR0b24gc3RlcCB3YXMgYWJvcnRlZCBieSB0aGUgcGFyZW50IHByb2Nlc3NcIilcclxuXHRcdFx0Y2xlYXJUaW1lb3V0KHByb21pc2VUaW1lb3V0KVxyXG5cdFx0fVxyXG5cdFx0YWJvcnRDb250cm9sbGVyLnNpZ25hbC5hZGRFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgYWJvcnRIYW5kbGVyKVxyXG5cclxuXHRcdGZvciAoY29uc3QgdGFyZ2V0IG9mIGhvdmVyVGFyZ2V0cykge1xyXG5cdFx0XHRkaXNwYXRjaEhvdmVySW4odGFyZ2V0KVxyXG5cdFx0fVxyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IGFjdGlvbkJ1dHRvbiA9IGF3YWl0IFByb21pc2UucmFjZShbXHJcblx0XHRcdFx0dGhpcy53YWl0Rm9yRWxlbWVudChcclxuXHRcdFx0XHRcdHRoaXMucm9vdCxcclxuXHRcdFx0XHRcdCgpID0+IHRoaXMuX2ZpbmRBY3Rpb25CdXR0b24odGhpcy5yb290KSxcclxuXHRcdFx0XHRcdHdhaXRBYm9ydENvbnRyb2xsZXJcclxuXHRcdFx0XHQpLFxyXG5cdFx0XHRcdG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuXHRcdFx0XHRcdHByb21pc2VUaW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiByZWplY3QoXCJUaW1lb3V0IHNob3dBY3Rpb25zTWVudUJ1dHRvblwiKSwgMzAwMClcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHRdKVxyXG5cclxuXHRcdFx0aWYgKGFjdGlvbkJ1dHRvbikge1xyXG5cdFx0XHRcdHJldHVybiBhY3Rpb25CdXR0b25cclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gYWN0aW9uQnV0dG9uXHJcblx0XHR9IGZpbmFsbHkge1xyXG5cdFx0XHR3YWl0QWJvcnRDb250cm9sbGVyLmFib3J0KCkgLy8gQWJvcnRpbmcgd2l0aG91dCByZWFzb24gYmVjYXVzZSB0aGUgcmVhc29uIGlzIHRoZSBlcnJvciBpdHNlbGZcclxuXHRcdFx0Y2xlYXJUaW1lb3V0KHByb21pc2VUaW1lb3V0KVxyXG5cdFx0XHRhYm9ydENvbnRyb2xsZXIuc2lnbmFsLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJhYm9ydFwiLCBhYm9ydEhhbmRsZXIpXHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBAcGFyYW0ge0Fib3J0Q29udHJvbGxlcn0gYWJvcnRDb250cm9sbGVyXHJcblx0ICogQHJldHVybnMge1Byb21pc2U8Ym9vbGVhbj59XHJcblx0ICovXHJcblx0YXN5bmMgaGlkZUFjdGlvbk1lbnVCdXR0b24oYWJvcnRDb250cm9sbGVyKSB7XHJcblx0XHRjb25zb2xlLmRlYnVnKFwiaGlkZUFjdGlvbk1lbnVCdXR0b25cIiwgdGhpcy5yb290KVxyXG5cdFx0ZGlzcGF0Y2hIb3Zlck91dCh0aGlzLnJvb3QpXHJcblxyXG5cdFx0Y29uc3Qgbm9uZUVsID0gdGhpcy5yb290LnF1ZXJ5U2VsZWN0b3IoXCJbcm9sZT1ub25lXVwiKVxyXG5cdFx0aWYgKG5vbmVFbCkge1xyXG5cdFx0XHRkaXNwYXRjaEhvdmVyT3V0KG5vbmVFbClcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCB3YWl0QWJvcnRDb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpXHJcblx0XHRsZXQgcHJvbWlzZVRpbWVvdXRcclxuXHRcdGxldCByZXNvbHZlVGltZW91dFxyXG5cdFx0Y29uc3QgYWJvcnRIYW5kbGVyID0gKCkgPT4ge1xyXG5cdFx0XHR3YWl0QWJvcnRDb250cm9sbGVyLmFib3J0KFwiaGlkZUFjdGlvbk1lbnVCdXR0b24gc3RlcCB3YXMgYWJvcnRlZCBieSB0aGUgcGFyZW50IHByb2Nlc3NcIilcclxuXHRcdFx0Y2xlYXJUaW1lb3V0KHByb21pc2VUaW1lb3V0KVxyXG5cdFx0XHRpZiAocmVzb2x2ZVRpbWVvdXQpIHtcclxuXHRcdFx0XHRyZXNvbHZlVGltZW91dCgpXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGFib3J0Q29udHJvbGxlci5zaWduYWwuYWRkRXZlbnRMaXN0ZW5lcihcImFib3J0XCIsIGFib3J0SGFuZGxlcilcclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBQcm9taXNlLnJhY2UoW1xyXG5cdFx0XHRcdHRoaXMud2FpdEZvckVsZW1lbnQoXHJcblx0XHRcdFx0XHR0aGlzLnJvb3QsXHJcblx0XHRcdFx0XHQoKSA9PiB0aGlzLl9maW5kQWN0aW9uQnV0dG9uKHRoaXMucm9vdCkgPT09IG51bGwsXHJcblx0XHRcdFx0XHR3YWl0QWJvcnRDb250cm9sbGVyXHJcblx0XHRcdFx0KSxcclxuXHRcdFx0XHRuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcblx0XHRcdFx0XHRyZXNvbHZlVGltZW91dCA9IHJlc29sdmVcclxuXHRcdFx0XHRcdHByb21pc2VUaW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiByZWplY3QoXCJUaW1lb3V0IGhpZGVBY3Rpb25NZW51QnV0dG9uXCIpLCA1MDApXHJcblx0XHRcdFx0fSlcclxuXHRcdFx0XSlcclxuXHRcdFx0cmV0dXJuIHJlc3VsdFxyXG5cdFx0fSBmaW5hbGx5IHtcclxuXHRcdFx0d2FpdEFib3J0Q29udHJvbGxlci5hYm9ydCgpIC8vIEFib3J0aW5nIHdpdGhvdXQgcmVhc29uIGJlY2F1c2UgdGhlIHJlYXNvbiBpcyB0aGUgZXJyb3IgaXRzZWxmXHJcblx0XHRcdGNsZWFyVGltZW91dChwcm9taXNlVGltZW91dClcclxuXHRcdFx0YWJvcnRDb250cm9sbGVyLnNpZ25hbC5yZW1vdmVFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgYWJvcnRIYW5kbGVyKVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogT3BlbnMgdGhlIGFjdGlvbnMgbWVudSBieSBjbGlja2luZyB0aGUgYWN0aW9uIGJ1dHRvbiBhbmQgd2FpdGluZyBmb3IgdGhlIFwiVW5zZW5kXCIgaXRlbS5cclxuXHQgKlxyXG5cdCAqIEBwYXJhbSB7SFRNTEJ1dHRvbkVsZW1lbnR9IGFjdGlvbkJ1dHRvblxyXG5cdCAqIEBwYXJhbSB7QWJvcnRDb250cm9sbGVyfSBhYm9ydENvbnRyb2xsZXJcclxuXHQgKiBAcmV0dXJucyB7UHJvbWlzZX1cclxuXHQgKi9cclxuXHRhc3luYyBvcGVuQWN0aW9uc01lbnUoYWN0aW9uQnV0dG9uLCBhYm9ydENvbnRyb2xsZXIpIHtcclxuXHRcdGNvbnNvbGUuZGVidWcoXCJXb3JrZmxvdyBzdGVwIDIgOiBDbGlja2luZyBhY3Rpb25CdXR0b24gYW5kIHdhaXRpbmcgZm9yIHVuc2VuZCBtZW51IGl0ZW0gdG8gYXBwZWFyXCIsIGFjdGlvbkJ1dHRvbilcclxuXHRcdGNvbnN0IHdhaXRBYm9ydENvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKClcclxuXHRcdGxldCBwcm9taXNlVGltZW91dFxyXG5cdFx0bGV0IHJlc29sdmVUaW1lb3V0XHJcblx0XHRjb25zdCBhYm9ydEhhbmRsZXIgPSAoKSA9PiB7XHJcblx0XHRcdHdhaXRBYm9ydENvbnRyb2xsZXIuYWJvcnQoXCJvcGVuQWN0aW9uc01lbnUgc3RlcCB3YXMgYWJvcnRlZCBieSB0aGUgcGFyZW50IHByb2Nlc3NcIilcclxuXHRcdFx0Y2xlYXJUaW1lb3V0KHByb21pc2VUaW1lb3V0KVxyXG5cdFx0XHRpZiAocmVzb2x2ZVRpbWVvdXQpIHtcclxuXHRcdFx0XHRyZXNvbHZlVGltZW91dCgpXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGFib3J0Q29udHJvbGxlci5zaWduYWwuYWRkRXZlbnRMaXN0ZW5lcihcImFib3J0XCIsIGFib3J0SGFuZGxlcilcclxuXHJcblx0XHQvKiogQ2hlY2sgaWYgdGV4dCBtYXRjaGVzIGFueSBrbm93biBcIlVuc2VuZFwiIHZhcmlhbnQgKi9cclxuXHRcdGNvbnN0IGlzVW5zZW5kVGV4dCA9ICh0ZXh0KSA9PiB7XHJcblx0XHRcdGNvbnN0IG5vcm1hbGl6ZWQgPSB0ZXh0LnRyaW0oKS50b0xvY2FsZUxvd2VyQ2FzZSgpXHJcblx0XHRcdHJldHVybiBzdHJpbmdzLlVOU0VORF9URVhUX1ZBUklBTlRTLnNvbWUodiA9PiBub3JtYWxpemVkID09PSB2KVxyXG5cdFx0fVxyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IHVuc2VuZEJ1dHRvbiA9IGF3YWl0IFByb21pc2UucmFjZShbXHJcblx0XHRcdFx0dGhpcy5jbGlja0VsZW1lbnRBbmRXYWl0Rm9yKFxyXG5cdFx0XHRcdFx0YWN0aW9uQnV0dG9uLFxyXG5cdFx0XHRcdFx0dGhpcy5yb290Lm93bmVyRG9jdW1lbnQuYm9keSxcclxuXHRcdFx0XHRcdChtdXRhdGlvbnMpID0+IHtcclxuXHRcdFx0XHRcdFx0aWYgKG11dGF0aW9ucykge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGFkZGVkTm9kZXMgPSBbLi4ubXV0YXRpb25zLm1hcChtdXRhdGlvbiA9PiBbLi4ubXV0YXRpb24uYWRkZWROb2Rlc10pXS5mbGF0KCkuZmlsdGVyKG5vZGUgPT4gbm9kZS5ub2RlVHlwZSA9PT0gMSlcclxuXHRcdFx0XHRcdFx0XHRmb3IgKGNvbnN0IGFkZGVkTm9kZSBvZiBhZGRlZE5vZGVzKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBub2RlID0gWy4uLmFkZGVkTm9kZS5xdWVyeVNlbGVjdG9yQWxsKFwic3BhbixkaXZcIildLmZpbmQobm9kZSA9PiBpc1Vuc2VuZFRleHQobm9kZS50ZXh0Q29udGVudCkgJiYgbm9kZS5maXJzdENoaWxkPy5ub2RlVHlwZSA9PT0gMylcclxuXHRcdFx0XHRcdFx0XHRcdGlmIChub2RlKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUuZGVidWcoXCJXb3JrZmxvdyBzdGVwIDIgOiBmb3VuZCB1bnNlbmQgbm9kZSB2aWEgbXV0YXRpb25cIiwgbm9kZSlcclxuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIG5vZGVcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0Ly8gRmFsbGJhY2s6IHNjYW4gdGhlIHdob2xlIGRvY3VtZW50IGZvciBhbiB1bnNlbmQgbWVudSBpdGVtIGFscmVhZHkgcHJlc2VudFxyXG5cdFx0XHRcdFx0XHRjb25zdCBhbGxTcGFucyA9IHRoaXMucm9vdC5vd25lckRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCJbcm9sZT1tZW51XSBzcGFuLCBbcm9sZT1tZW51XSBkaXYsIFtyb2xlPW1lbnVpdGVtXSBzcGFuLCBbcm9sZT1tZW51aXRlbV0gZGl2XCIpXHJcblx0XHRcdFx0XHRcdGZvciAoY29uc3Qgc3BhbiBvZiBhbGxTcGFucykge1xyXG5cdFx0XHRcdFx0XHRcdGlmIChpc1Vuc2VuZFRleHQoc3Bhbi50ZXh0Q29udGVudCkgJiYgc3Bhbi5maXJzdENoaWxkPy5ub2RlVHlwZSA9PT0gMykge1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5kZWJ1ZyhcIldvcmtmbG93IHN0ZXAgMiA6IGZvdW5kIHVuc2VuZCBub2RlIHZpYSBkb2N1bWVudCBzY2FuXCIsIHNwYW4pXHJcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gc3BhblxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHdhaXRBYm9ydENvbnRyb2xsZXJcclxuXHRcdFx0XHQpLFxyXG5cdFx0XHRcdG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuXHRcdFx0XHRcdHByb21pc2VUaW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiByZWplY3QoXCJUaW1lb3V0IG9wZW5BY3Rpb25zTWVudVwiKSwgMzAwMClcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHRdKVxyXG5cclxuXHRcdFx0Y29uc29sZS5kZWJ1ZyhcIldvcmtmbG93IHN0ZXAgMiA6IEZvdW5kIHVuc2VuZEJ1dHRvblwiLCB1bnNlbmRCdXR0b24pXHJcblx0XHRcdHJldHVybiB1bnNlbmRCdXR0b25cclxuXHRcdH0gZmluYWxseSB7XHJcblx0XHRcdHdhaXRBYm9ydENvbnRyb2xsZXIuYWJvcnQoKSAvLyBBYm9ydGluZyB3aXRob3V0IHJlYXNvbiBiZWNhdXNlIHRoZSByZWFzb24gaXMgdGhlIGVycm9yIGl0c2VsZlxyXG5cdFx0XHRjbGVhclRpbWVvdXQocHJvbWlzZVRpbWVvdXQpXHJcblx0XHRcdGFib3J0Q29udHJvbGxlci5zaWduYWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImFib3J0XCIsIGFib3J0SGFuZGxlcilcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsb3NlcyB0aGUgYWN0aW9ucyBtZW51LlxyXG5cdCAqXHJcblx0ICogQHBhcmFtIHtIVE1MQnV0dG9uRWxlbWVudH0gYWN0aW9uQnV0dG9uXHJcblx0ICogQHBhcmFtIHtIVE1MRGl2RWxlbWVudH0gYWN0aW9uc01lbnVFbGVtZW50XHJcblx0ICogQHBhcmFtIHtBYm9ydENvbnRyb2xsZXJ9IGFib3J0Q29udHJvbGxlclxyXG5cdCAqIEByZXR1cm5zIHtQcm9taXNlPGJvb2xlYW4+fVxyXG5cdCAqL1xyXG5cdGFzeW5jIGNsb3NlQWN0aW9uc01lbnUoYWN0aW9uQnV0dG9uLCBhY3Rpb25zTWVudUVsZW1lbnQsIGFib3J0Q29udHJvbGxlcikge1xyXG5cdFx0Y29uc29sZS5kZWJ1ZyhcImNsb3NlQWN0aW9uc01lbnVcIilcclxuXHRcdGNvbnN0IHdhaXRBYm9ydENvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKClcclxuXHRcdGxldCBwcm9taXNlVGltZW91dFxyXG5cdFx0bGV0IHJlc29sdmVUaW1lb3V0XHJcblx0XHRjb25zdCBhYm9ydEhhbmRsZXIgPSAoKSA9PiB7XHJcblx0XHRcdHdhaXRBYm9ydENvbnRyb2xsZXIuYWJvcnQoXCJjbG9zZUFjdGlvbnNNZW51IHN0ZXAgd2FzIGFib3J0ZWQgYnkgdGhlIHBhcmVudCBwcm9jZXNzXCIpXHJcblx0XHRcdGNsZWFyVGltZW91dChwcm9taXNlVGltZW91dClcclxuXHRcdFx0aWYgKHJlc29sdmVUaW1lb3V0KSB7XHJcblx0XHRcdFx0cmVzb2x2ZVRpbWVvdXQoKVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRhYm9ydENvbnRyb2xsZXIuc2lnbmFsLmFkZEV2ZW50TGlzdGVuZXIoXCJhYm9ydFwiLCBhYm9ydEhhbmRsZXIpXHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgUHJvbWlzZS5yYWNlKFtcclxuXHRcdFx0XHR0aGlzLmNsaWNrRWxlbWVudEFuZFdhaXRGb3IoXHJcblx0XHRcdFx0XHRhY3Rpb25CdXR0b24sXHJcblx0XHRcdFx0XHR0aGlzLnJvb3Qub3duZXJEb2N1bWVudC5ib2R5LFxyXG5cdFx0XHRcdFx0KCkgPT4gdGhpcy5yb290Lm93bmVyRG9jdW1lbnQuYm9keS5jb250YWlucyhhY3Rpb25zTWVudUVsZW1lbnQpID09PSBmYWxzZSxcclxuXHRcdFx0XHRcdGFib3J0Q29udHJvbGxlclxyXG5cdFx0XHRcdCksXHJcblx0XHRcdFx0bmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG5cdFx0XHRcdFx0cHJvbWlzZVRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHJlamVjdChcIlRpbWVvdXQgY2xvc2VBY3Rpb25zTWVudVwiKSwgNTAwKVxyXG5cdFx0XHRcdH0pXHJcblx0XHRcdF0pXHJcblx0XHRcdHJldHVybiByZXN1bHQgIT09IG51bGxcclxuXHRcdH0gZmluYWxseSB7XHJcblx0XHRcdHdhaXRBYm9ydENvbnRyb2xsZXIuYWJvcnQoKVxyXG5cdFx0XHRjbGVhclRpbWVvdXQocHJvbWlzZVRpbWVvdXQpXHJcblx0XHRcdGFib3J0Q29udHJvbGxlci5zaWduYWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImFib3J0XCIsIGFib3J0SGFuZGxlcilcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsaWNrIHVuc2VuZCBidXR0b24gYW5kIHdhaXQgZm9yIHRoZSBjb25maXJtYXRpb24gZGlhbG9nLlxyXG5cdCAqXHJcblx0ICogQHBhcmFtIHtIVE1MU3BhbkVsZW1lbnR9IHVuc2VuZEJ1dHRvblxyXG5cdCAqIEBwYXJhbSB7QWJvcnRDb250cm9sbGVyfSBhYm9ydENvbnRyb2xsZXJcclxuXHQgKiBAcmV0dXJucyB7UHJvbWlzZTxIVE1MQnV0dG9uRWxlbWVudD58UHJvbWlzZTxFcnJvcj59XHJcblx0ICovXHJcblx0b3BlbkNvbmZpcm1VbnNlbmRNb2RhbCh1bnNlbmRCdXR0b24sIGFib3J0Q29udHJvbGxlcikge1xyXG5cdFx0Y29uc29sZS5kZWJ1ZyhcIldvcmtmbG93IHN0ZXAgMyA6IENsaWNraW5nIHVuc2VuZEJ1dHRvbiBhbmQgd2FpdGluZyBmb3IgZGlhbG9nIHRvIGFwcGVhci4uLlwiKVxyXG5cdFx0cmV0dXJuIHRoaXMuY2xpY2tFbGVtZW50QW5kV2FpdEZvcihcclxuXHRcdFx0dW5zZW5kQnV0dG9uLFxyXG5cdFx0XHR0aGlzLnJvb3Qub3duZXJEb2N1bWVudC5ib2R5LFxyXG5cdFx0XHQoKSA9PiB0aGlzLnJvb3Qub3duZXJEb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiW3JvbGU9ZGlhbG9nXSBidXR0b25cIiksXHJcblx0XHRcdGFib3J0Q29udHJvbGxlclxyXG5cdFx0KVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xpY2sgdW5zZW5kIGNvbmZpcm0gYnV0dG9uIGluIHRoZSBtb2RhbCBkaWFsb2cuXHJcblx0ICpcclxuXHQgKiBAcGFyYW0ge0hUTUxCdXR0b25FbGVtZW50fSBkaWFsb2dCdXR0b25cclxuXHQgKiBAcGFyYW0ge0Fib3J0Q29udHJvbGxlcn0gYWJvcnRDb250cm9sbGVyXHJcblx0ICogQHJldHVybnMge1Byb21pc2V9XHJcblx0ICovXHJcblx0YXN5bmMgY29uZmlybVVuc2VuZChkaWFsb2dCdXR0b24sIGFib3J0Q29udHJvbGxlcikge1xyXG5cdFx0Y29uc29sZS5kZWJ1ZyhcIldvcmtmbG93IGZpbmFsIHN0ZXAgOiBjb25maXJtVW5zZW5kXCIsIGRpYWxvZ0J1dHRvbilcclxuXHRcdGF3YWl0IHRoaXMuY2xpY2tFbGVtZW50QW5kV2FpdEZvcihcclxuXHRcdFx0ZGlhbG9nQnV0dG9uLFxyXG5cdFx0XHR0aGlzLnJvb3Qub3duZXJEb2N1bWVudC5ib2R5LFxyXG5cdFx0XHQoKSA9PiB0aGlzLnJvb3Qub3duZXJEb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiW3JvbGU9ZGlhbG9nXSBidXR0b25cIikgPT09IG51bGwsXHJcblx0XHRcdGFib3J0Q29udHJvbGxlclxyXG5cdFx0KVxyXG5cdH1cclxuXHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IFVJTWVzc2FnZVxyXG4iLCIvKiogQG1vZHVsZSB1aXBpLW1lc3NhZ2UgQVBJIGZvciBVSU1lc3NhZ2UgKi9cclxuXHJcbi8qIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11bnVzZWQtdmFycyAqL1xyXG5pbXBvcnQgVUlNZXNzYWdlIGZyb20gXCIuLi91aS9kZWZhdWx0L3VpLW1lc3NhZ2UuanNcIlxyXG5cclxuY2xhc3MgRmFpbGVkV29ya2Zsb3dFeGNlcHRpb24gZXh0ZW5kcyBFcnJvciB7fVxyXG5cclxuY2xhc3MgVUlQSU1lc3NhZ2Uge1xyXG5cclxuXHQvKipcclxuXHQgKiBAcGFyYW0ge1VJTWVzc2FnZX0gdWlNZXNzYWdlXHJcblx0ICovXHJcblx0Y29uc3RydWN0b3IodWlNZXNzYWdlKSB7XHJcblx0XHR0aGlzLl91aU1lc3NhZ2UgPSB1aU1lc3NhZ2VcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEBwYXJhbSB7QWJvcnRDb250cm9sbGVyfSBhYm9ydENvbnRyb2xsZXJcclxuXHQgKiBAcmV0dXJucyB7UHJvbWlzZTxib29sZWFuPn1cclxuXHQgKi9cclxuXHRhc3luYyB1bnNlbmQoYWJvcnRDb250cm9sbGVyKSB7XHJcblx0XHRjb25zb2xlLmRlYnVnKFwiVUlQSU1lc3NhZ2UgdW5zZW5kXCIpXHJcblx0XHRsZXQgYWN0aW9uQnV0dG9uXHJcblx0XHRsZXQgdW5zZW5kQnV0dG9uXHJcblx0XHR0cnkge1xyXG5cdFx0XHRhY3Rpb25CdXR0b24gPSBhd2FpdCB0aGlzLnVpTWVzc2FnZS5zaG93QWN0aW9uc01lbnVCdXR0b24oYWJvcnRDb250cm9sbGVyKVxyXG5cdFx0XHR1bnNlbmRCdXR0b24gPSBhd2FpdCB0aGlzLnVpTWVzc2FnZS5vcGVuQWN0aW9uc01lbnUoYWN0aW9uQnV0dG9uLCBhYm9ydENvbnRyb2xsZXIpXHJcblx0XHRcdGNvbnNvbGUuZGVidWcoXCJ1bnNlbmRCdXR0b25cIiwgdW5zZW5kQnV0dG9uKVxyXG5cdFx0XHRjb25zdCBkaWFsb2dCdXR0b24gPSBhd2FpdCB0aGlzLnVpTWVzc2FnZS5vcGVuQ29uZmlybVVuc2VuZE1vZGFsKHVuc2VuZEJ1dHRvbiwgYWJvcnRDb250cm9sbGVyKVxyXG5cdFx0XHRhd2FpdCB0aGlzLnVpTWVzc2FnZS5jb25maXJtVW5zZW5kKGRpYWxvZ0J1dHRvbiwgYWJvcnRDb250cm9sbGVyKVxyXG5cdFx0XHR0aGlzLnVpTWVzc2FnZS5yb290LnNldEF0dHJpYnV0ZShcImRhdGEtaWRtdS11bnNlbnRcIiwgXCJcIilcclxuXHRcdFx0cmV0dXJuIHRydWVcclxuXHRcdH0gY2F0Y2goZXgpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihleClcclxuXHRcdFx0dGhpcy51aU1lc3NhZ2Uucm9vdC5zZXRBdHRyaWJ1dGUoXCJkYXRhLWlkbXUtaWdub3JlXCIsIFwiXCIpXHJcblx0XHRcdC8vIERpc21pc3MgYW55IG9wZW4gb3ZlcmxheSBzbyB0aGUgbmV4dCBtZXNzYWdlIHN0YXJ0cyBjbGVhblxyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdGNvbnN0IGRvYyA9IHRoaXMudWlNZXNzYWdlLnJvb3Qub3duZXJEb2N1bWVudFxyXG5cdFx0XHRcdGRvYy5ib2R5LmRpc3BhdGNoRXZlbnQobmV3IEtleWJvYXJkRXZlbnQoXCJrZXlkb3duXCIsIHsga2V5OiBcIkVzY2FwZVwiLCBidWJibGVzOiB0cnVlIH0pKVxyXG5cdFx0XHRcdGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAyMDApKVxyXG5cdFx0XHRcdC8vIElmIGRpYWxvZyBpcyBzdGlsbCBvcGVuLCBwcmVzcyBFc2NhcGUgYWdhaW5cclxuXHRcdFx0XHRpZiAoZG9jLnF1ZXJ5U2VsZWN0b3IoXCJbcm9sZT1kaWFsb2ddXCIpKSB7XHJcblx0XHRcdFx0XHRkb2MuYm9keS5kaXNwYXRjaEV2ZW50KG5ldyBLZXlib2FyZEV2ZW50KFwia2V5ZG93blwiLCB7IGtleTogXCJFc2NhcGVcIiwgYnViYmxlczogdHJ1ZSB9KSlcclxuXHRcdFx0XHRcdGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAyMDApKVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKGVycm9yKVxyXG5cdFx0XHR9XHJcblx0XHRcdHRocm93IG5ldyBGYWlsZWRXb3JrZmxvd0V4Y2VwdGlvbihcIkZhaWxlZCB0byBleGVjdXRlIHdvcmtmbG93IGZvciB0aGlzIG1lc3NhZ2VcIiwgZXgpXHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBAdHlwZSB7VUlNZXNzYWdlfVxyXG5cdCAqL1xyXG5cdGdldCB1aU1lc3NhZ2UoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fdWlNZXNzYWdlXHJcblx0fVxyXG5cclxufVxyXG5leHBvcnQgeyBGYWlsZWRXb3JrZmxvd0V4Y2VwdGlvbiB9XHJcbmV4cG9ydCBkZWZhdWx0IFVJUElNZXNzYWdlXHJcbiIsImltcG9ydCBVSUNvbXBvbmVudCBmcm9tIFwiLi91aS1jb21wb25lbnQuanNcIlxyXG5cclxuLyogZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXVudXNlZC12YXJzICovXHJcbmltcG9ydCBVSVBJTWVzc2FnZSBmcm9tIFwiLi4vdWlwaS91aXBpLW1lc3NhZ2UuanNcIlxyXG5cclxuLyoqXHJcbiAqXHJcbiAqIEBhYnN0cmFjdFxyXG4gKi9cclxuY2xhc3MgVUkgZXh0ZW5kcyBVSUNvbXBvbmVudCB7XHJcblxyXG5cdC8qKlxyXG5cdCAqXHJcblx0ICogQGFic3RyYWN0XHJcblx0ICogQHJldHVybnMge1VJfVxyXG5cdCAqL1xyXG5cdHN0YXRpYyBjcmVhdGUoKSB7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKlxyXG5cdCAqIEBhYnN0cmFjdFxyXG5cdCAqIEBwYXJhbSB7QWJvcnRDb250cm9sbGVyfSBhYm9ydENvbnRyb2xsZXJcclxuXHQgKiBAcmV0dXJucyB7UHJvbWlzZX1cclxuXHQgKi9cclxuXHQvKiBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW51c2VkLXZhcnMgKi9cclxuXHRhc3luYyBmZXRjaEFuZFJlbmRlclRocmVhZE5leHRNZXNzYWdlUGFnZShhYm9ydENvbnRyb2xsZXIpIHtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqXHJcblx0ICogQGFic3RyYWN0XHJcblx0ICogQHJldHVybnMge1Byb21pc2U8VUlQSU1lc3NhZ2U+fVxyXG5cdCAqL1xyXG5cdGFzeW5jIGdldE5leHRVSVBJTWVzc2FnZSgpIHtcclxuXHR9XHJcblxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBVSVxyXG4iLCIvKiogQG1vZHVsZSBkb20tbG9va3VwIFV0aWxzIG1vZHVsZSBmb3IgbG9va2luZyB1cCBlbGVtZW50cyBvbiB0aGUgZGVmYXVsdCBVSSAqL1xyXG5cclxuaW1wb3J0IHsgd2FpdEZvckVsZW1lbnQgfSBmcm9tIFwiLi4vLi4vZG9tL2FzeW5jLWV2ZW50cy5qc1wiXHJcblxyXG4vKipcclxuICogRmluZHMgdGhlIHNjcm9sbGFibGUgbWVzc2FnZXMgY29udGFpbmVyIGluc2lkZSB0aGUgY29udmVyc2F0aW9uIHBhbmVsLlxyXG4gKiBJbnN0YWdyYW0gcmVtb3ZlZCByb2xlPVwiZ3JpZFwiIOKAlCB3ZSBub3cgbG9jYXRlIHRoZSBjb250YWluZXIgdmlhIGFyaWEtbGFiZWxcclxuICogYW5kIHdhbGsgaW50byBpdHMgc2Nyb2xsYWJsZSBjaGlsZC5cclxuICpcclxuICogQHBhcmFtIHtXaW5kb3d9IHdpbmRvd1xyXG4gKiBAcmV0dXJucyB7SFRNTERpdkVsZW1lbnR8bnVsbH1cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBmaW5kTWVzc2FnZXNXcmFwcGVyKHdpbmRvdykge1xyXG5cdGNvbnN0IGNvbnZlcnNhdGlvbiA9IHdpbmRvdy5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiW2RhdGEtcGFnZWxldD0nSUdETWVzc2FnZXNMaXN0J11cIilcclxuXHRpZiAoIWNvbnZlcnNhdGlvbikge1xyXG5cdFx0cmV0dXJuIG51bGxcclxuXHR9XHJcblx0Y29uc3Qgc2Nyb2xsYWJsZSA9IGZpbmRTY3JvbGxhYmxlQ2hpbGQoY29udmVyc2F0aW9uLCB3aW5kb3cpXHJcblx0aWYgKCFzY3JvbGxhYmxlKSB7XHJcblx0XHRyZXR1cm4gbnVsbFxyXG5cdH1cclxuXHRyZXR1cm4gc2Nyb2xsYWJsZVxyXG59XHJcblxyXG4vKipcclxuICogUmVjdXJzaXZlbHkgZmluZHMgdGhlIGZpcnN0IHNjcm9sbGFibGUgZGVzY2VuZGFudCBvZiBhIGdpdmVuIGVsZW1lbnQuXHJcbiAqXHJcbiAqIEBwYXJhbSB7RWxlbWVudH0gcGFyZW50XHJcbiAqIEBwYXJhbSB7V2luZG93fSB3aW5kb3dcclxuICogQHJldHVybnMge0hUTUxEaXZFbGVtZW50fG51bGx9XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZmluZFNjcm9sbGFibGVDaGlsZChwYXJlbnQsIHdpbmRvdykge1xyXG5cdGZvciAoY29uc3QgY2hpbGQgb2YgcGFyZW50LmNoaWxkcmVuKSB7XHJcblx0XHRjb25zdCBzdHlsZSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGNoaWxkKVxyXG5cdFx0aWYgKFxyXG5cdFx0XHQoc3R5bGUub3ZlcmZsb3dZID09PSBcImF1dG9cIiB8fCBzdHlsZS5vdmVyZmxvd1kgPT09IFwic2Nyb2xsXCIpICYmXHJcblx0XHRcdGNoaWxkLnNjcm9sbEhlaWdodCA+IGNoaWxkLmNsaWVudEhlaWdodFxyXG5cdFx0KSB7XHJcblx0XHRcdHJldHVybiBjaGlsZFxyXG5cdFx0fVxyXG5cdFx0Y29uc3QgZm91bmQgPSBmaW5kU2Nyb2xsYWJsZUNoaWxkKGNoaWxkLCB3aW5kb3cpXHJcblx0XHRpZiAoZm91bmQpIHtcclxuXHRcdFx0cmV0dXJuIGZvdW5kXHJcblx0XHR9XHJcblx0fVxyXG5cdHJldHVybiBudWxsXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZXR1cm5zIHRoZSBpbm5lciBjb250YWluZXIgdGhhdCBob2xkcyBpbmRpdmlkdWFsIG1lc3NhZ2Ugcm93IGRpdnMuXHJcbiAqIFRyYXZlcnNlcyB3cmFwcGVyIGxheWVycyB0byBmaW5kIHRoZSBkaXYgd2l0aCB0aGUgbW9zdCBjaGlsZHJlbiAodGhlIG1lc3NhZ2UgbGlzdCkuXHJcbiAqXHJcbiAqIEBwYXJhbSB7RWxlbWVudH0gc2Nyb2xsYWJsZVxyXG4gKiBAcmV0dXJucyB7SFRNTERpdkVsZW1lbnR9XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0TWVzc2FnZXNJbm5lckNvbnRhaW5lcihzY3JvbGxhYmxlKSB7XHJcblx0Ly8gSW5zdGFncmFtIHdyYXBzIG1lc3NhZ2VzIGluIHNldmVyYWwgbmVzdGVkIGRpdnMuXHJcblx0Ly8gU3RyYXRlZ3k6IGZpbmQgdGhlIGRlZXBlc3QgZGVzY2VuZGFudCAod2l0aGluIDMgbGV2ZWxzKSB0aGF0IGhhcyB0aGUgbW9zdCBjaGlsZHJlbixcclxuXHQvLyBzaW5jZSB0aGUgYWN0dWFsIG1lc3NhZ2VzIGNvbnRhaW5lciBoYXMgbWFueSBkaXJlY3QgY2hpbGRyZW4gKG9uZSBwZXIgbWVzc2FnZSByb3cpLlxyXG5cdGxldCBiZXN0ID0gc2Nyb2xsYWJsZVxyXG5cdGxldCBiZXN0Q291bnQgPSBzY3JvbGxhYmxlLmNoaWxkcmVuLmxlbmd0aFxyXG5cclxuXHRmdW5jdGlvbiBzZWFyY2goZWwsIGRlcHRoKSB7XHJcblx0XHRpZiAoZGVwdGggPiAzKSByZXR1cm5cclxuXHRcdGZvciAoY29uc3QgY2hpbGQgb2YgZWwuY2hpbGRyZW4pIHtcclxuXHRcdFx0aWYgKGNoaWxkLmNoaWxkcmVuLmxlbmd0aCA+IGJlc3RDb3VudCkge1xyXG5cdFx0XHRcdGJlc3QgPSBjaGlsZFxyXG5cdFx0XHRcdGJlc3RDb3VudCA9IGNoaWxkLmNoaWxkcmVuLmxlbmd0aFxyXG5cdFx0XHR9XHJcblx0XHRcdHNlYXJjaChjaGlsZCwgZGVwdGggKyAxKVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0c2VhcmNoKHNjcm9sbGFibGUsIDApXHJcblx0cmV0dXJuIGJlc3RcclxufVxyXG5cclxuLyoqXHJcbiAqIERldGVybWluZXMgd2hldGhlciBhIG1lc3NhZ2UgZWxlbWVudCB3YXMgc2VudCBieSB0aGUgY3VycmVudCB1c2VyLlxyXG4gKiBJbnN0YWdyYW0gYWxpZ25zIHNlbnQgbWVzc2FnZXMgdG8gdGhlIHJpZ2h0IHVzaW5nIGZsZXhib3ggKGp1c3RpZnktY29udGVudDogZmxleC1lbmQpLlxyXG4gKlxyXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsZW1lbnRcclxuICogQHBhcmFtIHtXaW5kb3d9IHdpbmRvd1xyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpc1NlbnRCeUN1cnJlbnRVc2VyKGVsZW1lbnQsIHdpbmRvdykge1xyXG5cdC8vIEJGUyB0aHJvdWdoIGFsbCBkZXNjZW5kYW50cyB1cCB0byBkZXB0aCA4LlxyXG5cdC8vIEluc3RhZ3JhbSBwbGFjZXMganVzdGlmeS1jb250ZW50OiBmbGV4LWVuZCBvbiBhIG5lc3RlZCBkaXYgKGRlcHRoIH41KVxyXG5cdC8vIHRoYXQgbWF5IGJlIG9uIGFueSBjaGlsZCBicmFuY2gsIG5vdCBqdXN0IHRoZSBmaXJzdC1jaGlsZCBwYXRoLlxyXG5cdGNvbnN0IHF1ZXVlID0gW3sgZWw6IGVsZW1lbnQsIGRlcHRoOiAwIH1dXHJcblx0d2hpbGUgKHF1ZXVlLmxlbmd0aCA+IDApIHtcclxuXHRcdGNvbnN0IHsgZWwsIGRlcHRoIH0gPSBxdWV1ZS5zaGlmdCgpXHJcblx0XHRjb25zdCBzID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoZWwpXHJcblx0XHRpZiAocy5qdXN0aWZ5Q29udGVudCA9PT0gXCJmbGV4LWVuZFwiKSB7XHJcblx0XHRcdHJldHVybiB0cnVlXHJcblx0XHR9XHJcblx0XHRpZiAoZGVwdGggPCA4KSB7XHJcblx0XHRcdGZvciAoY29uc3QgY2hpbGQgb2YgZWwuY2hpbGRyZW4pIHtcclxuXHRcdFx0XHRxdWV1ZS5wdXNoKHsgZWw6IGNoaWxkLCBkZXB0aDogZGVwdGggKyAxIH0pXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblx0cmV0dXJuIGZhbHNlXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZXRzIHRoZSBmaXJzdCB2aXNpYmxlIG1lc3NhZ2Ugc2VudCBieSB0aGUgY3VycmVudCB1c2VyIHRoYXQgaGFzbid0IGJlZW4gcHJvY2Vzc2VkIHlldC5cclxuICpcclxuICogQHBhcmFtIHtFbGVtZW50fSByb290IC0gVGhlIHNjcm9sbGFibGUgbWVzc2FnZXMgd3JhcHBlclxyXG4gKiBAcGFyYW0ge0Fib3J0Q29udHJvbGxlcn0gYWJvcnRDb250cm9sbGVyXHJcbiAqIEBwYXJhbSB7V2luZG93fSB3aW5kb3dcclxuICogQHJldHVybnMge0VsZW1lbnR8dW5kZWZpbmVkfVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEZpcnN0VmlzaWJsZU1lc3NhZ2Uocm9vdCwgYWJvcnRDb250cm9sbGVyLCB3aW5kb3cpIHtcclxuXHRjb25zdCBpbm5lckNvbnRhaW5lciA9IGdldE1lc3NhZ2VzSW5uZXJDb250YWluZXIocm9vdClcclxuXHRpZiAoIWlubmVyQ29udGFpbmVyKSB7XHJcblx0XHRjb25zb2xlLmRlYnVnKFwiZ2V0Rmlyc3RWaXNpYmxlTWVzc2FnZTogbm8gaW5uZXIgY29udGFpbmVyIGZvdW5kXCIpXHJcblx0XHRyZXR1cm5cclxuXHR9XHJcblxyXG5cdGNvbnN0IGVsZW1lbnRzID0gWy4uLmlubmVyQ29udGFpbmVyLmNoaWxkcmVuXVxyXG5cdFx0LmZpbHRlcihkID0+IHtcclxuXHRcdFx0aWYgKGQuaGFzQXR0cmlidXRlKFwiZGF0YS1pZG11LWlnbm9yZVwiKSkgcmV0dXJuIGZhbHNlXHJcblx0XHRcdGlmIChkLmhhc0F0dHJpYnV0ZShcImRhdGEtaWRtdS11bnNlbnRcIikpIHJldHVybiBmYWxzZVxyXG5cdFx0XHQvLyBNdXN0IGNvbnRhaW4gbWVzc2FnZSBjb250ZW50IGluZGljYXRvcnNcclxuXHRcdFx0Y29uc3QgaGFzTWVzc2FnZUNvbnRlbnQgPSBkLnF1ZXJ5U2VsZWN0b3IoXCJbcm9sZT1ub25lXVwiKSB8fCBkLnF1ZXJ5U2VsZWN0b3IoXCJbcm9sZT1wcmVzZW50YXRpb25dXCIpXHJcblx0XHRcdGlmICghaGFzTWVzc2FnZUNvbnRlbnQpIHJldHVybiBmYWxzZVxyXG5cdFx0XHRyZXR1cm4gaXNTZW50QnlDdXJyZW50VXNlcihkLCB3aW5kb3cpXHJcblx0XHR9KVxyXG5cclxuXHRlbGVtZW50cy5yZXZlcnNlKClcclxuXHRpZihlbGVtZW50cy5sZW5ndGggPj0gMSkge1xyXG5cdFx0Y29uc29sZS5kZWJ1ZyhcImdldEZpcnN0VmlzaWJsZU1lc3NhZ2VcIiwgZWxlbWVudHMubGVuZ3RoLCBcImNhbmRpZGF0ZSBlbGVtZW50c1wiKVxyXG5cdH0gZWxzZSB7XHJcblx0XHRjb25zb2xlLmRlYnVnKFwiZ2V0Rmlyc3RWaXNpYmxlTWVzc2FnZTogbm8gY2FuZGlkYXRlIGVsZW1lbnRzIGZvdW5kXCIpXHJcblx0fVxyXG5cclxuXHRmb3IgKGNvbnN0IGVsZW1lbnQgb2YgZWxlbWVudHMpIHtcclxuXHRcdGlmIChhYm9ydENvbnRyb2xsZXIuc2lnbmFsLmFib3J0ZWQpIHtcclxuXHRcdFx0Y29uc29sZS5kZWJ1ZyhcImFib3J0Q29udHJvbGxlciBpbnRlcnVwdGVkIHRoZSBtZXNzYWdlIGZpbHRlcmluZyBwcm9jZXNzOiBzdG9wcGluZy4uLlwiKVxyXG5cdFx0XHRicmVha1xyXG5cdFx0fVxyXG5cdFx0Y29uc3QgdmlzaWJpbGl0eUNoZWNrID0gZWxlbWVudC5jaGVja1Zpc2liaWxpdHkoe1xyXG5cdFx0XHR2aXNpYmlsaXR5UHJvcGVydHk6IHRydWUsXHJcblx0XHRcdGNvbnRlbnRWaXNpYmlsaXR5QXV0bzogdHJ1ZSxcclxuXHRcdFx0b3BhY2l0eVByb3BlcnR5OiB0cnVlLFxyXG5cdFx0fSlcclxuXHRcdGlmICh2aXNpYmlsaXR5Q2hlY2sgPT09IGZhbHNlKSB7XHJcblx0XHRcdGNvbnNvbGUuZGVidWcoXCJ2aXNpYmlsaXR5Q2hlY2tcIiwgdmlzaWJpbGl0eUNoZWNrKVxyXG5cdFx0XHRjb250aW51ZVxyXG5cdFx0fVxyXG5cdFx0Y29uc3QgcmVjdCA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClcclxuXHRcdC8vIENoZWNrIGlmIGVsZW1lbnQgaXMgYXQgbGVhc3QgcGFydGlhbGx5IGluIHZpZXdwb3J0LlxyXG5cdFx0Ly8gRm9yIHRhbGwgZWxlbWVudHMgKGltYWdlcywgbG9uZyB0ZXh0KSwgcmVjdC55IGNhbiBiZSBuZWdhdGl2ZVxyXG5cdFx0Ly8gd2hpbGUgdGhlIGVsZW1lbnQgaXMgc3RpbGwgdmlzaWJsZS4gVXNlIGJvdHRvbSBlZGdlIGluc3RlYWQuXHJcblx0XHRpZiAocmVjdC55ICsgcmVjdC5oZWlnaHQgPCAwIHx8IHJlY3QuaGVpZ2h0ID09PSAwKSB7XHJcblx0XHRcdGNvbnNvbGUuZGVidWcoXCJpc0luVmlldyBmYWlsZWRcIiwgcmVjdC55LCByZWN0LmhlaWdodClcclxuXHRcdFx0Y29udGludWVcclxuXHRcdH1cclxuXHRcdGVsZW1lbnQuc2V0QXR0cmlidXRlKFwiZGF0YS1pZG11LWlnbm9yZVwiLCBcIlwiKVxyXG5cdFx0Y29uc29sZS5kZWJ1ZyhcIk1lc3NhZ2UgaW4gdmlldywgdGVzdGluZyB3b3JrZmxvdy4uLlwiLCBlbGVtZW50KVxyXG5cdFx0cmV0dXJuIGVsZW1lbnRcclxuXHR9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTY3JvbGxzIHRvIHRvcCB0byB0cmlnZ2VyIGxvYWRpbmcgb2Ygb2xkZXIgbWVzc2FnZXMuXHJcbiAqIEhhbmRsZXMgYm90aCBub3JtYWwgYW5kIGNvbHVtbi1yZXZlcnNlIGxheW91dHMuXHJcbiAqXHJcbiAqIEluIGNvbHVtbi1yZXZlcnNlIChJbnN0YWdyYW0ncyBjdXJyZW50IGxheW91dCk6XHJcbiAqICAgc2Nyb2xsVG9wPTAgaXMgdGhlIEJPVFRPTSAobmV3ZXN0IG1lc3NhZ2VzKVxyXG4gKiAgIHNjcm9sbFRvcD0tKHNjcm9sbEhlaWdodC1jbGllbnRIZWlnaHQpIGlzIHRoZSBUT1AgKG9sZGVzdCBtZXNzYWdlcylcclxuICpcclxuICogQHBhcmFtIHtFbGVtZW50fSByb290XHJcbiAqIEBwYXJhbSB7QWJvcnRDb250cm9sbGVyfSBhYm9ydENvbnRyb2xsZXJcclxuICogQHJldHVybnMge1Byb21pc2U8Ym9vbGVhbj59XHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9hZE1vcmVNZXNzYWdlcyhyb290LCBhYm9ydENvbnRyb2xsZXIpIHtcclxuXHRjb25zb2xlLmRlYnVnKFwibG9hZE1vcmVNZXNzYWdlcyBsb29raW5nIGZvciBsb2FkZXIuLi4gXCIpXHJcblx0Y29uc3Qgc2Nyb2xsQWJvcnRDb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpXHJcblx0bGV0IGZpbmRMb2FkZXJUaW1lb3V0XHJcblx0bGV0IHJlc29sdmVUaW1lb3V0XHJcblx0Y29uc3QgYWJvcnRIYW5kbGVyID0gKCkgPT4ge1xyXG5cdFx0c2Nyb2xsQWJvcnRDb250cm9sbGVyLmFib3J0KFwiYWJvcnRIYW5kbGVyIHdhcyBhYm9ydGVkXCIpXHJcblx0XHRjbGVhclRpbWVvdXQoZmluZExvYWRlclRpbWVvdXQpXHJcblx0XHRpZiAocmVzb2x2ZVRpbWVvdXQpIHtcclxuXHRcdFx0cmVzb2x2ZVRpbWVvdXQoKVxyXG5cdFx0fVxyXG5cdH1cclxuXHRhYm9ydENvbnRyb2xsZXIuc2lnbmFsLmFkZEV2ZW50TGlzdGVuZXIoXCJhYm9ydFwiLCBhYm9ydEhhbmRsZXIpXHJcblxyXG5cdC8vIERldGVjdCBjb2x1bW4tcmV2ZXJzZSBsYXlvdXRcclxuXHRjb25zdCBzdHlsZSA9IHJvb3Qub3duZXJEb2N1bWVudC5kZWZhdWx0Vmlldy5nZXRDb21wdXRlZFN0eWxlKHJvb3QpXHJcblx0Y29uc3QgaXNSZXZlcnNlZCA9IHN0eWxlLmZsZXhEaXJlY3Rpb24gPT09IFwiY29sdW1uLXJldmVyc2VcIlxyXG5cdC8vIEluIGNvbHVtbi1yZXZlcnNlLCBcInNjcm9sbCB0byB0b3BcIiBtZWFucyBtb3N0IG5lZ2F0aXZlIHNjcm9sbFRvcFxyXG5cdGNvbnN0IHNjcm9sbFRvVG9wVmFsdWUgPSBpc1JldmVyc2VkXHJcblx0XHQ/IC0ocm9vdC5zY3JvbGxIZWlnaHQgLSByb290LmNsaWVudEhlaWdodClcclxuXHRcdDogMFxyXG5cdC8vIEluIGNvbHVtbi1yZXZlcnNlLCBcImF0IHRvcFwiIG1lYW5zIHNjcm9sbFRvcCBpcyBhdCBvciBuZWFyIG1pbmltdW1cclxuXHRjb25zdCBpc0F0VG9wID0gKCkgPT4gaXNSZXZlcnNlZFxyXG5cdFx0PyByb290LnNjcm9sbFRvcCA8PSBzY3JvbGxUb1RvcFZhbHVlICsgNVxyXG5cdFx0OiByb290LnNjcm9sbFRvcCA9PT0gMFxyXG5cclxuXHRjb25zdCBiZWZvcmVTY3JvbGwgPSByb290LnNjcm9sbFRvcFxyXG5cdGNvbnN0IGJlZm9yZUhlaWdodCA9IHJvb3Quc2Nyb2xsSGVpZ2h0XHJcblx0cm9vdC5zY3JvbGxUb3AgPSBzY3JvbGxUb1RvcFZhbHVlXHJcblxyXG5cdC8vIEhlbHBlcjogZmluZCBhIHZpc2libGUgbG9hZGVyIHdpdGhpbiB0aGUgc2Nyb2xsYWJsZSByb290J3Mgdmlld3BvcnRcclxuXHRjb25zdCBmaW5kVmlzaWJsZUxvYWRlciA9ICgpID0+IHtcclxuXHRcdGNvbnN0IGJhcnMgPSByb290LnF1ZXJ5U2VsZWN0b3JBbGwoXCJbcm9sZT1wcm9ncmVzc2Jhcl1cIilcclxuXHRcdGZvciAoY29uc3QgYmFyIG9mIGJhcnMpIHtcclxuXHRcdFx0Y29uc3QgcmVjdCA9IGJhci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVxyXG5cdFx0XHRjb25zdCByb290UmVjdCA9IHJvb3QuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClcclxuXHRcdFx0Ly8gTXVzdCBiZSB3aXRoaW4gcm9vdCdzIGhvcml6b250YWwrdmVydGljYWwgYm91bmRzIGFuZCBoYXZlIGRpbWVuc2lvbnNcclxuXHRcdFx0aWYgKHJlY3QuaGVpZ2h0ID4gMCAmJiByZWN0LnkgPj0gcm9vdFJlY3QueSAtIDEwMCAmJiByZWN0LnkgPD0gcm9vdFJlY3QueSArIHJvb3RSZWN0LmhlaWdodCArIDEwMCkge1xyXG5cdFx0XHRcdHJldHVybiBiYXJcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIG51bGxcclxuXHR9XHJcblxyXG5cdC8vIFNob3J0IGNoYXQ6IGV2ZXJ5dGhpbmcgZml0cyBpbiB2aWV3cG9ydCwgbm90aGluZyB0byBsb2FkXHJcblx0Y29uc3Qgbm9TY3JvbGxOZWVkZWQgPSBpc1JldmVyc2VkXHJcblx0XHQ/IGJlZm9yZVNjcm9sbCA9PT0gMCAmJiByb290LnNjcm9sbEhlaWdodCA8PSByb290LmNsaWVudEhlaWdodCArIDUwXHJcblx0XHQ6IGJlZm9yZVNjcm9sbCA9PT0gMCAmJiByb290LnNjcm9sbEhlaWdodCA8PSByb290LmNsaWVudEhlaWdodCArIDUwXHJcblx0aWYgKG5vU2Nyb2xsTmVlZGVkKSB7XHJcblx0XHRjb25zb2xlLmRlYnVnKFwibG9hZE1vcmVNZXNzYWdlczogY2hhdCBmaXRzIGluIHZpZXdwb3J0LCBtYXJraW5nIGFzIGRvbmVcIilcclxuXHRcdGFib3J0Q29udHJvbGxlci5zaWduYWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImFib3J0XCIsIGFib3J0SGFuZGxlcilcclxuXHRcdHJldHVybiB0cnVlXHJcblx0fVxyXG5cclxuXHQvLyBBbHJlYWR5IGF0IHRvcCBhZnRlciBzY3JvbGxpbmc6IHdhaXQgYnJpZWZseSBmb3IgbmV3IGNvbnRlbnQsIHRoZW4gY2hlY2tcclxuXHRpZiAoaXNBdFRvcCgpKSB7XHJcblx0XHQvLyBHaXZlIEluc3RhZ3JhbSBhIG1vbWVudCB0byBzdGFydCBsb2FkaW5nIG9sZGVyIG1lc3NhZ2VzXHJcblx0XHRhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTAwKSlcclxuXHJcblx0XHQvLyBDaGVjayBpZiBhIHZpc2libGUgbG9hZGVyIGFwcGVhcmVkXHJcblx0XHRjb25zdCBsb2FkZXIgPSBmaW5kVmlzaWJsZUxvYWRlcigpXHJcblx0XHRpZiAobG9hZGVyKSB7XHJcblx0XHRcdGNvbnNvbGUuZGVidWcoXCJsb2FkTW9yZU1lc3NhZ2VzOiBGb3VuZCB2aXNpYmxlIGxvYWRlciBhZnRlciBzY3JvbGw7IHdhaXRpbmcgZm9yIHJlbW92YWwgKG1heCA1cylcIilcclxuXHRcdFx0YXdhaXQgUHJvbWlzZS5yYWNlKFtcclxuXHRcdFx0XHR3YWl0Rm9yRWxlbWVudChyb290LCAoKSA9PiBmaW5kVmlzaWJsZUxvYWRlcigpID09PSBudWxsLCBhYm9ydENvbnRyb2xsZXIpLFxyXG5cdFx0XHRcdG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCA1MDAwKSlcclxuXHRcdFx0XSlcclxuXHRcdFx0YWJvcnRDb250cm9sbGVyLnNpZ25hbC5yZW1vdmVFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgYWJvcnRIYW5kbGVyKVxyXG5cdFx0XHRjb25zdCBncmV3ID0gcm9vdC5zY3JvbGxIZWlnaHQgPiBiZWZvcmVIZWlnaHRcclxuXHRcdFx0Y29uc29sZS5kZWJ1ZyhgbG9hZE1vcmVNZXNzYWdlczogbG9hZGVyIHBoYXNlIGRvbmUsIGNvbnRlbnQgJHtncmV3ID8gXCJncmV3XCIgOiBcImRpZCBub3QgZ3Jvd1wifWApXHJcblx0XHRcdHJldHVybiAhZ3Jld1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIE5vIGxvYWRlciBhcHBlYXJlZCDigJQgY2hlY2sgaWYgc2Nyb2xsSGVpZ2h0IGdyZXcgKG5ldyBjb250ZW50IGxvYWRlZCB3aXRob3V0IHNwaW5uZXIpXHJcblx0XHRjb25zdCBncmV3ID0gcm9vdC5zY3JvbGxIZWlnaHQgPiBiZWZvcmVIZWlnaHRcclxuXHRcdGlmICghZ3Jldykge1xyXG5cdFx0XHRjb25zb2xlLmRlYnVnKFwibG9hZE1vcmVNZXNzYWdlczogYXQgdG9wLCBubyBsb2FkZXIsIG5vIG5ldyBjb250ZW50IOKAlCByZWFjaGVkIGxhc3QgcGFnZVwiKVxyXG5cdFx0XHRhYm9ydENvbnRyb2xsZXIuc2lnbmFsLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJhYm9ydFwiLCBhYm9ydEhhbmRsZXIpXHJcblx0XHRcdHJldHVybiB0cnVlXHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBGYWxsYmFjazogd2FpdCBmb3IgcHJvZ3Jlc3NiYXIgdG8gYXBwZWFyICh3aXRoIHNob3J0ZXIgdGltZW91dClcclxuXHRsZXQgbG9hZGluZ0VsZW1lbnRcclxuXHR0cnkge1xyXG5cdFx0bG9hZGluZ0VsZW1lbnQgPSBhd2FpdCBQcm9taXNlLnJhY2UoW1xyXG5cdFx0XHR3YWl0Rm9yRWxlbWVudChyb290LCAoKSA9PiB7XHJcblx0XHRcdFx0aWYgKGZpbmRWaXNpYmxlTG9hZGVyKCkgPT09IG51bGwpIHtcclxuXHRcdFx0XHRcdHJvb3Quc2Nyb2xsVG9wID0gc2Nyb2xsVG9Ub3BWYWx1ZVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gZmluZFZpc2libGVMb2FkZXIoKVxyXG5cdFx0XHR9LCBzY3JvbGxBYm9ydENvbnRyb2xsZXIpLFxyXG5cdFx0XHRuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcclxuXHRcdFx0XHRyZXNvbHZlVGltZW91dCA9IHJlc29sdmVcclxuXHRcdFx0XHRmaW5kTG9hZGVyVGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0cmVzb2x2ZSgpXHJcblx0XHRcdFx0fSwgMzAwMClcclxuXHRcdFx0fSlcclxuXHRcdF0pXHJcblx0fSBjYXRjaCAoZXgpIHtcclxuXHRcdGNvbnNvbGUuZXJyb3IoZXgpXHJcblx0fVxyXG5cdHNjcm9sbEFib3J0Q29udHJvbGxlci5hYm9ydChcIlNjcm9sbGluZyB0b29rIHRvbyBtdWNoIHRpbWUuIFRpbWVvdXQgYWZ0ZXIgMTBzXCIpXHJcblx0YWJvcnRDb250cm9sbGVyLnNpZ25hbC5yZW1vdmVFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgYWJvcnRIYW5kbGVyKVxyXG5cdGNsZWFyVGltZW91dChmaW5kTG9hZGVyVGltZW91dClcclxuXHRpZiAobG9hZGluZ0VsZW1lbnQgJiYgbG9hZGluZ0VsZW1lbnQgIT09IHRydWUpIHtcclxuXHRcdGNvbnNvbGUuZGVidWcoXCJsb2FkTW9yZU1lc3NhZ2VzOiBGb3VuZCBsb2FkZXI7IFN0YW5kLWJ5IHVudGlsIGl0IGlzIHJlbW92ZWQgKG1heCA1cylcIilcclxuXHRcdGF3YWl0IFByb21pc2UucmFjZShbXHJcblx0XHRcdHdhaXRGb3JFbGVtZW50KHJvb3QsICgpID0+IGZpbmRWaXNpYmxlTG9hZGVyKCkgPT09IG51bGwsIGFib3J0Q29udHJvbGxlciksXHJcblx0XHRcdG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCA1MDAwKSlcclxuXHRcdF0pXHJcblx0fVxyXG5cdGNvbnN0IGF0VG9wID0gaXNBdFRvcCgpXHJcblx0Y29uc29sZS5kZWJ1ZyhgbG9hZE1vcmVNZXNzYWdlczogc2Nyb2xsVG9wIGlzICR7cm9vdC5zY3JvbGxUb3B9IOKAlCAke2F0VG9wID8gXCJyZWFjaGVkIGxhc3QgcGFnZVwiIDogXCJub3QgbGFzdCBwYWdlXCJ9YClcclxuXHRyZXR1cm4gYXRUb3BcclxufVxyXG4iLCIvKiogQG1vZHVsZSB1aS1tZXNzYWdlcy13cmFwcGVyIFVJIGVsZW1lbnQgcmVwcmVzZW50aW5nIHRoZSBtZXNzYWdlcyB3cmFwcGVyICovXHJcblxyXG5pbXBvcnQgeyBsb2FkTW9yZU1lc3NhZ2VzIH0gZnJvbSBcIi4vZG9tLWxvb2t1cC5qc1wiXHJcbmltcG9ydCBVSUNvbXBvbmVudCBmcm9tIFwiLi4vdWktY29tcG9uZW50LmpzXCJcclxuXHJcbmNsYXNzIFVJTWVzc2FnZXNXcmFwcGVyIGV4dGVuZHMgVUlDb21wb25lbnQge1xyXG5cclxuXHQvKipcclxuXHQgKiBAcGFyYW0ge0Fib3J0Q29udHJvbGxlcn0gYWJvcnRDb250cm9sbGVyXHJcblx0ICogQHJldHVybnMge1Byb21pc2V9XHJcblx0ICovXHJcblx0ZmV0Y2hBbmRSZW5kZXJUaHJlYWROZXh0TWVzc2FnZVBhZ2UoYWJvcnRDb250cm9sbGVyKSB7XHJcblx0XHRyZXR1cm4gbG9hZE1vcmVNZXNzYWdlcyh0aGlzLnJvb3QsIGFib3J0Q29udHJvbGxlcilcclxuXHR9XHJcblxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBVSU1lc3NhZ2VzV3JhcHBlclxyXG4iLCIvKiogQG1vZHVsZSBkZWZhdWx0LXVpIERlZmF1bHQgVUkgLyBFbmdsaXNoIFVJICovXHJcblxyXG5pbXBvcnQgVUkgZnJvbSBcIi4uL3VpLmpzXCJcclxuaW1wb3J0IHsgZmluZE1lc3NhZ2VzV3JhcHBlciwgZ2V0Rmlyc3RWaXNpYmxlTWVzc2FnZSB9IGZyb20gXCIuL2RvbS1sb29rdXAuanNcIlxyXG5pbXBvcnQgVUlQSU1lc3NhZ2UgZnJvbSBcIi4uLy4uL3VpcGkvdWlwaS1tZXNzYWdlLmpzXCJcclxuaW1wb3J0IFVJTWVzc2FnZSBmcm9tIFwiLi91aS1tZXNzYWdlLmpzXCJcclxuaW1wb3J0IFVJTWVzc2FnZXNXcmFwcGVyIGZyb20gXCIuL3VpLW1lc3NhZ2VzLXdyYXBwZXIuanNcIlxyXG5cclxuY2xhc3MgRGVmYXVsdFVJIGV4dGVuZHMgVUkge1xyXG5cclxuXHRjb25zdHJ1Y3Rvcihyb290LCBpZGVudGlmaWVyID0ge30pIHtcclxuXHRcdHN1cGVyKHJvb3QsIGlkZW50aWZpZXIpXHJcblx0XHR0aGlzLmxhc3RTY3JvbGxUb3AgPSBudWxsXHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBAcGFyYW0ge1dpbmRvd30gd2luZG93XHJcblx0ICogQHJldHVybnMge0RlZmF1bHRVSX1cclxuXHQgKi9cclxuXHRzdGF0aWMgY3JlYXRlKHdpbmRvdykge1xyXG5cdFx0Y29uc29sZS5kZWJ1ZyhcIlVJIGNyZWF0ZTogTG9va2luZyBmb3IgbWVzc2FnZXNXcmFwcGVyRWxlbWVudFwiKVxyXG5cdFx0Y29uc3QgbWVzc2FnZXNXcmFwcGVyRWxlbWVudCA9IGZpbmRNZXNzYWdlc1dyYXBwZXIod2luZG93KVxyXG5cdFx0aWYgKG1lc3NhZ2VzV3JhcHBlckVsZW1lbnQgIT09IG51bGwpIHtcclxuXHRcdFx0Y29uc29sZS5kZWJ1ZyhcIkZvdW5kIG1lc3NhZ2VzV3JhcHBlckVsZW1lbnRcIiwgbWVzc2FnZXNXcmFwcGVyRWxlbWVudClcclxuXHRcdFx0Y29uc3QgdWlNZXNzYWdlc1dyYXBwZXIgPSBuZXcgVUlNZXNzYWdlc1dyYXBwZXIobWVzc2FnZXNXcmFwcGVyRWxlbWVudClcclxuXHRcdFx0cmV0dXJuIG5ldyBEZWZhdWx0VUkod2luZG93LCB7IHVpTWVzc2FnZXNXcmFwcGVyIH0pXHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJVbmFibGUgdG8gZmluZCBtZXNzYWdlc1dyYXBwZXJFbGVtZW50LiBUaGUgcXVlcnkgc2VsZWN0b3IgbWlnaHQgYmUgb3V0IG9mIGRhdGUuXCIpXHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBAcGFyYW0ge0Fib3J0Q29udHJvbGxlcn0gYWJvcnRDb250cm9sbGVyXHJcblx0ICogQHJldHVybnMge1Byb21pc2V9XHJcblx0ICovXHJcblx0YXN5bmMgZmV0Y2hBbmRSZW5kZXJUaHJlYWROZXh0TWVzc2FnZVBhZ2UoYWJvcnRDb250cm9sbGVyKSB7XHJcblx0XHRjb25zb2xlLmRlYnVnKFwiVUkgZmV0Y2hBbmRSZW5kZXJUaHJlYWROZXh0TWVzc2FnZVBhZ2VcIilcclxuXHRcdHJldHVybiBhd2FpdCB0aGlzLmlkZW50aWZpZXIudWlNZXNzYWdlc1dyYXBwZXIuZmV0Y2hBbmRSZW5kZXJUaHJlYWROZXh0TWVzc2FnZVBhZ2UoYWJvcnRDb250cm9sbGVyKVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2Nyb2xsIHVudGlsIGEgKHZpc2libGUpIG1lc3NhZ2UgaXMgZm91bmQgYW5kIHJldHVybiBpdC5cclxuXHQgKlxyXG5cdCAqIEluc3RhZ3JhbSB1c2VzIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW4tcmV2ZXJzZSBvbiB0aGUgbWVzc2FnZXMgY29udGFpbmVyLlxyXG5cdCAqIFRoaXMgbWVhbnMgc2Nyb2xsVG9wPTAgaXMgdGhlIEJPVFRPTSAobmV3ZXN0IG1lc3NhZ2VzKSBhbmQgc2Nyb2xsaW5nIHRvXHJcblx0ICogb2xkZXIgbWVzc2FnZXMgcmVxdWlyZXMgTkVHQVRJVkUgc2Nyb2xsVG9wIHZhbHVlcy5cclxuXHQgKiBJbiBub3JtYWwgKG5vbi1yZXZlcnNlZCkgbGF5b3V0cywgc2Nyb2xsVG9wPTAgaXMgdGhlIHRvcCBhbmQgdGhlIG1heCBpcyBwb3NpdGl2ZS5cclxuXHQgKlxyXG5cdCAqIFRoaXMgbWV0aG9kIGRldGVjdHMgdGhlIGxheW91dCBkaXJlY3Rpb24gYW5kIHNjcm9sbHMgYWNjb3JkaW5nbHkuXHJcblx0ICpcclxuXHQgKiBAcGFyYW0ge0Fib3J0Q29udHJvbGxlcn0gYWJvcnRDb250cm9sbGVyXHJcblx0ICogQHJldHVybnMge1Byb21pc2U8VUlQSU1lc3NhZ2V8ZmFsc2U+fVxyXG5cdCAqL1xyXG5cdGFzeW5jIGdldE5leHRVSVBJTWVzc2FnZShhYm9ydENvbnRyb2xsZXIpIHtcclxuXHRcdGNvbnNvbGUuZGVidWcoXCJVSSBnZXROZXh0VUlQSU1lc3NhZ2VcIiwgdGhpcy5sYXN0U2Nyb2xsVG9wKVxyXG5cdFx0Y29uc3QgdWlNZXNzYWdlc1dyYXBwZXJSb290ID0gdGhpcy5pZGVudGlmaWVyLnVpTWVzc2FnZXNXcmFwcGVyLnJvb3RcclxuXHJcblx0XHQvLyBEZXRlY3QgY29sdW1uLXJldmVyc2U6IHNjcm9sbFRvcCBjYW4gZ28gbmVnYXRpdmVcclxuXHRcdGNvbnN0IHN0eWxlID0gdGhpcy5yb290LmdldENvbXB1dGVkU3R5bGVcclxuXHRcdFx0PyB0aGlzLnJvb3QuZ2V0Q29tcHV0ZWRTdHlsZSh1aU1lc3NhZ2VzV3JhcHBlclJvb3QpXHJcblx0XHRcdDogdWlNZXNzYWdlc1dyYXBwZXJSb290Lm93bmVyRG9jdW1lbnQuZGVmYXVsdFZpZXcuZ2V0Q29tcHV0ZWRTdHlsZSh1aU1lc3NhZ2VzV3JhcHBlclJvb3QpXHJcblx0XHRjb25zdCBpc1JldmVyc2VkID0gc3R5bGUuZmxleERpcmVjdGlvbiA9PT0gXCJjb2x1bW4tcmV2ZXJzZVwiXHJcblxyXG5cdFx0Ly8gUHJlLWNoZWNrOiB0cnkgZmluZGluZyBhIG1lc3NhZ2UgYXQgdGhlIGN1cnJlbnQgc2Nyb2xsIHBvc2l0aW9uIHdpdGhvdXQgc2Nyb2xsaW5nLlxyXG5cdFx0Ly8gVGhpcyBjYXRjaGVzIG1lc3NhZ2VzIGFscmVhZHkgdmlzaWJsZSBpbiB2aWV3cG9ydCAoY29tbW9uIGZvciBzaG9ydCBjb252ZXJzYXRpb25zXHJcblx0XHQvLyBhbmQgYWZ0ZXIgdW5zZW5kaW5nIHdoZW4gdGhlIERPTSBzaHJpbmtzKS5cclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IG1lc3NhZ2VFbGVtZW50ID0gZ2V0Rmlyc3RWaXNpYmxlTWVzc2FnZSh1aU1lc3NhZ2VzV3JhcHBlclJvb3QsIGFib3J0Q29udHJvbGxlciwgdGhpcy5yb290KVxyXG5cdFx0XHRpZiAobWVzc2FnZUVsZW1lbnQpIHtcclxuXHRcdFx0XHRjb25zb2xlLmRlYnVnKFwiZ2V0TmV4dFVJUElNZXNzYWdlOiBmb3VuZCBtZXNzYWdlIHdpdGhvdXQgc2Nyb2xsaW5nXCIpXHJcblx0XHRcdFx0Y29uc3QgdWlNZXNzYWdlID0gbmV3IFVJTWVzc2FnZShtZXNzYWdlRWxlbWVudClcclxuXHRcdFx0XHRyZXR1cm4gbmV3IFVJUElNZXNzYWdlKHVpTWVzc2FnZSlcclxuXHRcdFx0fVxyXG5cdFx0fSBjYXRjaCAoZXgpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihleClcclxuXHRcdH1cclxuXHJcblx0XHQvLyBBbGxvdyB1cCB0byAzIGZ1bGwgcGFzc2VzOyBjb3ZlcnMgY2FzZXMgd2hlcmUgRE9NIHNocmlua3MgYWZ0ZXIgdW5zZW5kc1xyXG5cdFx0Zm9yIChsZXQgcGFzcyA9IDA7IHBhc3MgPCAzOyBwYXNzKyspIHtcclxuXHRcdFx0aWYgKGFib3J0Q29udHJvbGxlci5zaWduYWwuYWJvcnRlZCkge1xyXG5cdFx0XHRcdGNvbnNvbGUuZGVidWcoXCJhYm9ydENvbnRyb2xsZXIgaW50ZXJ1cHRlZCB0aGUgc2Nyb2xsaW5nOiBzdG9wcGluZy4uLlwiKVxyXG5cdFx0XHRcdHJldHVybiBmYWxzZVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoaXNSZXZlcnNlZCkge1xyXG5cdFx0XHRcdC8vIGNvbHVtbi1yZXZlcnNlOiBzY3JvbGxUb3AgcmFuZ2VzIGZyb20gMCAoYm90dG9tL25ld2VzdCkgdG8gbmVnYXRpdmUgKHRvcC9vbGRlc3QpXHJcblx0XHRcdFx0Y29uc3QgbWluU2Nyb2xsID0gLSh1aU1lc3NhZ2VzV3JhcHBlclJvb3Quc2Nyb2xsSGVpZ2h0IC0gdWlNZXNzYWdlc1dyYXBwZXJSb290LmNsaWVudEhlaWdodClcclxuXHRcdFx0XHRjb25zdCBzdGFydFBvcyA9IChwYXNzID09PSAwICYmIHRoaXMubGFzdFNjcm9sbFRvcCAhPT0gbnVsbClcclxuXHRcdFx0XHRcdD8gTWF0aC5tYXgodGhpcy5sYXN0U2Nyb2xsVG9wLCBtaW5TY3JvbGwpXHJcblx0XHRcdFx0XHQ6IDAgLy8gU3RhcnQgZnJvbSBib3R0b20gKG5ld2VzdClcclxuXHJcblx0XHRcdFx0Ly8gVXNlIHNtYWxsZXIgaW5jcmVtZW50cyBmb3Igc2hvcnQgY29udmVyc2F0aW9ucyB0byBhdm9pZCBvdmVyc2hvb3RpbmdcclxuXHRcdFx0XHRjb25zdCB0b3RhbFJhbmdlID0gTWF0aC5hYnMobWluU2Nyb2xsKVxyXG5cdFx0XHRcdGNvbnN0IHN0ZXAgPSB0b3RhbFJhbmdlIDwgNTAwID8gMzAgOiAxNTBcclxuXHJcblx0XHRcdFx0Y29uc29sZS5kZWJ1ZyhgZ2V0TmV4dFVJUElNZXNzYWdlIFtyZXZlcnNlZF0gcGFzcz0ke3Bhc3N9LCBzdGFydFBvcz0ke3N0YXJ0UG9zfSwgbWluU2Nyb2xsPSR7bWluU2Nyb2xsfSwgc3RlcD0ke3N0ZXB9YClcclxuXHJcblx0XHRcdFx0Zm9yIChsZXQgaSA9IHN0YXJ0UG9zOyBpID49IG1pblNjcm9sbDsgaSA9IGkgLSBzdGVwKSB7XHJcblx0XHRcdFx0XHRpZiAoYWJvcnRDb250cm9sbGVyLnNpZ25hbC5hYm9ydGVkKSB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUuZGVidWcoXCJhYm9ydENvbnRyb2xsZXIgaW50ZXJ1cHRlZCB0aGUgc2Nyb2xsaW5nOiBzdG9wcGluZy4uLlwiKVxyXG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2VcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdHRoaXMubGFzdFNjcm9sbFRvcCA9IGlcclxuXHRcdFx0XHRcdHVpTWVzc2FnZXNXcmFwcGVyUm9vdC5zY3JvbGxUb3AgPSBpXHJcblx0XHRcdFx0XHR1aU1lc3NhZ2VzV3JhcHBlclJvb3QuZGlzcGF0Y2hFdmVudChuZXcgdGhpcy5yb290LkV2ZW50KFwic2Nyb2xsXCIpKVxyXG5cdFx0XHRcdFx0YXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDUpKVxyXG5cdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgbWVzc2FnZUVsZW1lbnQgPSBnZXRGaXJzdFZpc2libGVNZXNzYWdlKHVpTWVzc2FnZXNXcmFwcGVyUm9vdCwgYWJvcnRDb250cm9sbGVyLCB0aGlzLnJvb3QpXHJcblx0XHRcdFx0XHRcdGlmIChtZXNzYWdlRWxlbWVudCkge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHVpTWVzc2FnZSA9IG5ldyBVSU1lc3NhZ2UobWVzc2FnZUVsZW1lbnQpXHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIG5ldyBVSVBJTWVzc2FnZSh1aU1lc3NhZ2UpXHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoZXgpXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIE5vcm1hbCBsYXlvdXQ6IHNjcm9sbFRvcCByYW5nZXMgZnJvbSAwICh0b3ApIHRvIHBvc2l0aXZlIG1heCAoYm90dG9tKVxyXG5cdFx0XHRcdGNvbnN0IG1heFNjcm9sbCA9IHVpTWVzc2FnZXNXcmFwcGVyUm9vdC5zY3JvbGxIZWlnaHQgLSB1aU1lc3NhZ2VzV3JhcHBlclJvb3QuY2xpZW50SGVpZ2h0XHJcblx0XHRcdFx0Y29uc3Qgc3RhcnRTY3JvbGxUb3AgPSAocGFzcyA9PT0gMCAmJiB0aGlzLmxhc3RTY3JvbGxUb3AgIT09IG51bGwpXHJcblx0XHRcdFx0XHQ/IE1hdGgubWluKHRoaXMubGFzdFNjcm9sbFRvcCwgbWF4U2Nyb2xsKVxyXG5cdFx0XHRcdFx0OiBtYXhTY3JvbGxcclxuXHJcblx0XHRcdFx0Ly8gVXNlIHNtYWxsZXIgaW5jcmVtZW50cyBmb3Igc2hvcnQgY29udmVyc2F0aW9uc1xyXG5cdFx0XHRcdGNvbnN0IHN0ZXAgPSBtYXhTY3JvbGwgPCA1MDAgPyAzMCA6IDE1MFxyXG5cclxuXHRcdFx0XHRjb25zb2xlLmRlYnVnKGBnZXROZXh0VUlQSU1lc3NhZ2UgcGFzcz0ke3Bhc3N9LCBzdGFydFNjcm9sbFRvcD0ke3N0YXJ0U2Nyb2xsVG9wfSwgbWF4U2Nyb2xsPSR7bWF4U2Nyb2xsfSwgc3RlcD0ke3N0ZXB9YClcclxuXHJcblx0XHRcdFx0Zm9yIChsZXQgaSA9IE1hdGgubWF4KDEsIHN0YXJ0U2Nyb2xsVG9wKTsgaSA+IDA7IGkgPSBpIC0gc3RlcCkge1xyXG5cdFx0XHRcdFx0aWYgKGFib3J0Q29udHJvbGxlci5zaWduYWwuYWJvcnRlZCkge1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmRlYnVnKFwiYWJvcnRDb250cm9sbGVyIGludGVydXB0ZWQgdGhlIHNjcm9sbGluZzogc3RvcHBpbmcuLi5cIilcclxuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR0aGlzLmxhc3RTY3JvbGxUb3AgPSBpXHJcblx0XHRcdFx0XHR1aU1lc3NhZ2VzV3JhcHBlclJvb3Quc2Nyb2xsVG9wID0gaVxyXG5cdFx0XHRcdFx0dWlNZXNzYWdlc1dyYXBwZXJSb290LmRpc3BhdGNoRXZlbnQobmV3IHRoaXMucm9vdC5FdmVudChcInNjcm9sbFwiKSlcclxuXHRcdFx0XHRcdGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCA1KSlcclxuXHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IG1lc3NhZ2VFbGVtZW50ID0gZ2V0Rmlyc3RWaXNpYmxlTWVzc2FnZSh1aU1lc3NhZ2VzV3JhcHBlclJvb3QsIGFib3J0Q29udHJvbGxlciwgdGhpcy5yb290KVxyXG5cdFx0XHRcdFx0XHRpZiAobWVzc2FnZUVsZW1lbnQpIHtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCB1aU1lc3NhZ2UgPSBuZXcgVUlNZXNzYWdlKG1lc3NhZ2VFbGVtZW50KVxyXG5cdFx0XHRcdFx0XHRcdHJldHVybiBuZXcgVUlQSU1lc3NhZ2UodWlNZXNzYWdlKVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9IGNhdGNoIChleCkge1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmVycm9yKGV4KVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gUmVhY2hlZCB0aGUgZW5kIHdpdGhvdXQgZmluZGluZyBhIG1lc3NhZ2UuXHJcblx0XHRcdC8vIFJlc2V0IGZvciBhIGZyZXNoIHBhc3MgKERPTSBtYXkgaGF2ZSBzaHJ1bmsgYWZ0ZXIgdW5zZW5kcykuXHJcblx0XHRcdHRoaXMubGFzdFNjcm9sbFRvcCA9IG51bGxcclxuXHRcdFx0Y29uc29sZS5kZWJ1ZyhgZ2V0TmV4dFVJUElNZXNzYWdlOiBwYXNzICR7cGFzc30gZm91bmQgbm90aGluZywgcmV0cnlpbmdgKVxyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnNvbGUuZGVidWcoXCJnZXROZXh0VUlQSU1lc3NhZ2U6IGV4aGF1c3RlZCBhbGwgcGFzc2VzLCBubyBtZXNzYWdlcyBsZWZ0XCIpXHJcblx0XHRyZXR1cm4gZmFsc2VcclxuXHR9XHJcblxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBEZWZhdWx0VUlcclxuIiwiLyoqIEBtb2R1bGUgZ2V0LXVpIFVJIGxvYWRlciBtb2R1bGUuIEFsbG93IGxvYWRpbmcgb2YgYSBjZXJ0YWluIFVJIGJhc2VkIG9uIGEgZ2l2ZW4gc3RyYXRlZ3kgKGxvY2FsZSBldGMuLilcclxuICogVGhlcmUgbWlnaHQgYmUgbmVlZCBmb3IgbXVsdGlwbGUgVUkgYXMgSW5zdGFncmFtIG1pZ2h0IHNlcnZlIGRpZmZlcmVudCBhcHBzIGJhc2VkIG9uIGxvY2F0aW9uIGZvciBleGFtcGxlLlxyXG4gKiBUaGVyZSBpcyBhbHNvIGEgbmVlZCB0byBpbnRlcm5hdGlvbmFsaXplIGVhY2ggdWkgc28gdGhhdCBpdCBkb2Vzbid0IGZhaWwgaWYgd2UgY2hhbmdlIHRoZSBsYW5ndWFnZS5cclxuICovXHJcblxyXG5pbXBvcnQgRGVmYXVsdFVJIGZyb20gXCIuL2RlZmF1bHQvZGVmYXVsdC11aS5qc1wiXHJcbi8qIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11bnVzZWQtdmFycyAqL1xyXG5pbXBvcnQgVUkgZnJvbSBcIi4vdWkuanNcIlxyXG5cclxuLyoqXHJcbiAqXHJcbiAqIEByZXR1cm5zIHtVSX1cclxuICovXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGdldFVJKCkge1xyXG5cdHJldHVybiBEZWZhdWx0VUlcclxufVxyXG4iLCIvKiogQG1vZHVsZSB1aXBpIEFQSSBmb3IgVUkgKi9cclxuXHJcbmltcG9ydCBnZXRVSSBmcm9tIFwiLi4vdWkvZ2V0LXVpLmpzXCJcclxuXHJcbi8qIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11bnVzZWQtdmFycyAqL1xyXG5pbXBvcnQgVUkgZnJvbSBcIi4uL3VpL3VpLmpzXCJcclxuLyogZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXVudXNlZC12YXJzICovXHJcbmltcG9ydCBVSVBJTWVzc2FnZSBmcm9tIFwiLi91aXBpLW1lc3NhZ2UuanNcIlxyXG5cclxuLyoqXHJcbiAqIFVJIEludGVyZmFjZSBBUElcclxuICovXHJcbmNsYXNzIFVJUEkge1xyXG5cclxuXHQvKipcclxuXHQgKlxyXG5cdCAqIEBwYXJhbSB7VUl9IHVpXHJcblx0ICovXHJcblx0Y29uc3RydWN0b3IodWkpIHtcclxuXHRcdHRoaXMuX3VpID0gdWlcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqXHJcblx0ICogQHBhcmFtIHtXaW5kb3d9IHdpbmRvd1xyXG5cdCAqIEByZXR1cm5zIHtVSVBJfVxyXG5cdCAqL1xyXG5cdHN0YXRpYyBjcmVhdGUod2luZG93KSB7XHJcblx0XHRjb25zb2xlLmRlYnVnKFwiVUlQSS5jcmVhdGVcIilcclxuXHRcdGNvbnN0IHVpID0gZ2V0VUkoKS5jcmVhdGUod2luZG93KVxyXG5cdFx0cmV0dXJuIG5ldyBVSVBJKHVpKVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQHBhcmFtIHtBYm9ydENvbnRyb2xsZXJ9IGFib3J0Q29udHJvbGxlclxyXG5cdCAqIEByZXR1cm5zIHtQcm9taXNlfVxyXG5cdCAqL1xyXG5cdGZldGNoQW5kUmVuZGVyVGhyZWFkTmV4dE1lc3NhZ2VQYWdlKGFib3J0Q29udHJvbGxlcikge1xyXG5cdFx0Y29uc29sZS5kZWJ1ZyhcIlVJUEkgZmV0Y2hBbmRSZW5kZXJUaHJlYWROZXh0TWVzc2FnZVBhZ2VcIilcclxuXHRcdHJldHVybiB0aGlzLnVpLmZldGNoQW5kUmVuZGVyVGhyZWFkTmV4dE1lc3NhZ2VQYWdlKGFib3J0Q29udHJvbGxlcilcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEBwYXJhbSB7QWJvcnRDb250cm9sbGVyfSBhYm9ydENvbnRyb2xsZXJcclxuXHQgKiBAcmV0dXJucyB7UHJvbWlzZTxVSVBJTWVzc2FnZT59XHJcblx0ICovXHJcblx0Z2V0TmV4dFVJUElNZXNzYWdlKGFib3J0Q29udHJvbGxlcikge1xyXG5cdFx0Y29uc29sZS5kZWJ1ZyhcIlVJUEkgZ2V0TmV4dFVJUElNZXNzYWdlXCIpXHJcblx0XHRyZXR1cm4gdGhpcy51aS5nZXROZXh0VUlQSU1lc3NhZ2UoYWJvcnRDb250cm9sbGVyKVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICpcclxuXHQgKiBAdHlwZSB7VUl9XHJcblx0ICovXHJcblx0Z2V0IHVpKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX3VpXHJcblx0fVxyXG5cclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgVUlQSVxyXG4iLCIvKiogQG1vZHVsZSBpZG11IEdsb2JhbC9NYWluIEFQSSBmb3IgaW50ZXJhY3Rpbmcgd2l0aCB0aGUgVUkgKi9cclxuXHJcbmltcG9ydCBVSVBJIGZyb20gXCIuLi91aXBpL3VpcGkuanNcIlxyXG4vKiBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW51c2VkLXZhcnMgKi9cclxuaW1wb3J0IFVJUElNZXNzYWdlIGZyb20gXCIuLi91aXBpL3VpcGktbWVzc2FnZS5qc1wiXHJcblxyXG5jbGFzcyBJRE1VIHtcclxuXHJcblx0LyoqXHJcblx0ICpcclxuXHQgKiBAcGFyYW0ge1dpbmRvd30gd2luZG93XHJcblx0ICogQHBhcmFtIHtjYWxsYmFja30gb25TdGF0dXNUZXh0XHJcblx0ICovXHJcblx0Y29uc3RydWN0b3Iod2luZG93LCBvblN0YXR1c1RleHQpIHtcclxuXHRcdHRoaXMud2luZG93ID0gd2luZG93XHJcblx0XHR0aGlzLnVpcGkgPSBudWxsXHJcblx0XHR0aGlzLm9uU3RhdHVzVGV4dCA9IG9uU3RhdHVzVGV4dFxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQHBhcmFtIHtBYm9ydENvbnRyb2xsZXJ9IGFib3J0Q29udHJvbGxlclxyXG5cdCAqIEByZXR1cm5zIHtQcm9taXNlPFVJUElNZXNzYWdlPn1cclxuXHQgKi9cclxuXHRnZXROZXh0VUlQSU1lc3NhZ2UoYWJvcnRDb250cm9sbGVyKSB7XHJcblx0XHRyZXR1cm4gdGhpcy51aXBpLmdldE5leHRVSVBJTWVzc2FnZShhYm9ydENvbnRyb2xsZXIpXHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKlxyXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0XHJcblx0ICovXHJcblx0c2V0U3RhdHVzVGV4dCh0ZXh0KSB7XHJcblx0XHR0aGlzLm9uU3RhdHVzVGV4dCh0ZXh0KVxyXG5cdH1cclxuXHJcblxyXG5cdC8qKlxyXG5cdCAqXHJcblx0ICogQHBhcmFtIHtBYm9ydENvbnRyb2xsZXJ9IGFib3J0Q29udHJvbGxlclxyXG5cdCAqIEByZXR1cm5zIHtQcm9taXNlfVxyXG5cdCAqL1xyXG5cdGZldGNoQW5kUmVuZGVyVGhyZWFkTmV4dE1lc3NhZ2VQYWdlKGFib3J0Q29udHJvbGxlcikge1xyXG5cdFx0cmV0dXJuIHRoaXMudWlwaS5mZXRjaEFuZFJlbmRlclRocmVhZE5leHRNZXNzYWdlUGFnZShhYm9ydENvbnRyb2xsZXIpXHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBNYXAgSW5zdGFncmFtIFVJXHJcblx0ICovXHJcblx0bG9hZFVJUEkoKSB7XHJcblx0XHRjb25zb2xlLmRlYnVnKFwibG9hZFVJUElcIilcclxuXHRcdHRoaXMudWlwaSA9IFVJUEkuY3JlYXRlKHRoaXMud2luZG93KVxyXG5cdH1cclxuXHJcblxyXG59XHJcbmV4cG9ydCBkZWZhdWx0IElETVVcclxuIiwiLyoqIEBtb2R1bGUgdW5zZW5kLXN0cmF0ZWd5IFZhcmlvdXMgc3RyYXRlZ2llcyBmb3IgdW5zZW5kaW5nIG1lc3NhZ2VzICovXHJcblxyXG4vKiBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW51c2VkLXZhcnMgKi9cclxuaW1wb3J0IElETVUgZnJvbSBcIi4uL2lkbXUvaWRtdS5qc1wiXHJcblxyXG4vKipcclxuICpcclxuICogQGFic3RyYWN0XHJcbiAqL1xyXG5jbGFzcyBVbnNlbmRTdHJhdGVneSB7XHJcblxyXG5cdC8qKlxyXG5cdCAqXHJcblx0ICogQHBhcmFtIHtJRE1VfSBpZG11XHJcblx0ICovXHJcblx0Y29uc3RydWN0b3IoaWRtdSkge1xyXG5cdFx0dGhpcy5faWRtdSA9IGlkbXVcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqXHJcblx0ICogQGFic3RyYWN0XHJcblx0ICogQHJldHVybnMge2Jvb2xlYW59XHJcblx0ICovXHJcblx0aXNSdW5uaW5nKCkge1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICpcclxuXHQgKiBAYWJzdHJhY3RcclxuXHQgKi9cclxuXHRzdG9wKCkge1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICpcclxuXHQgKiBAYWJzdHJhY3RcclxuXHQgKi9cclxuXHRyZXNldCgpIHtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqXHJcblx0ICogQGFic3RyYWN0XHJcblx0ICovXHJcblx0YXN5bmMgcnVuKCkge1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQHJlYWRvbmx5XHJcblx0ICogQHR5cGUge0lETVV9XHJcblx0ICovXHJcblx0Z2V0IGlkbXUoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5faWRtdVxyXG5cdH1cclxuXHJcbn1cclxuXHJcbmV4cG9ydCB7IFVuc2VuZFN0cmF0ZWd5IH1cclxuIiwiLyoqIEBtb2R1bGUgdW5zZW5kLXN0cmF0ZWd5IFZhcmlvdXMgc3RyYXRlZ2llcyBmb3IgdW5zZW5kaW5nIG1lc3NhZ2VzICovXHJcblxyXG4vKiBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW51c2VkLXZhcnMgKi9cclxuaW1wb3J0IElETVUgZnJvbSBcIi4uLy4uL2lkbXUvaWRtdS5qc1wiXHJcbmltcG9ydCB7IFVuc2VuZFN0cmF0ZWd5IH0gZnJvbSBcIi4uL3Vuc2VuZC1zdHJhdGVneS5qc1wiXHJcblxyXG4vKipcclxuICogTG9hZHMgYWxsIHBhZ2VzIGZpcnN0LCB0aGVuIHVuc2VuZHMgbWVzc2FnZXMgZnJvbSBib3R0b20gdG8gdG9wLlxyXG4gKiBGb3Igc2hvcnQgY29udmVyc2F0aW9ucyAoYWxsIG1lc3NhZ2VzIGZpdCBpbiB2aWV3cG9ydCksIHNraXBzIHBhZ2UgbG9hZGluZyBlbnRpcmVseS5cclxuICovXHJcbmNsYXNzIERlZmF1bHRTdHJhdGVneSBleHRlbmRzIFVuc2VuZFN0cmF0ZWd5IHtcclxuXHJcblx0LyoqXHJcblx0ICogQHBhcmFtIHtJRE1VfSBpZG11XHJcblx0ICovXHJcblx0Y29uc3RydWN0b3IoaWRtdSkge1xyXG5cdFx0c3VwZXIoaWRtdSlcclxuXHRcdHRoaXMuX2FsbFBhZ2VzTG9hZGVkID0gZmFsc2VcclxuXHRcdHRoaXMuX3Vuc2VudENvdW50ID0gMFxyXG5cdFx0dGhpcy5fcGFnZXNMb2FkZWRDb3VudCA9IDBcclxuXHRcdHRoaXMuX3J1bm5pbmcgPSBmYWxzZVxyXG5cdFx0dGhpcy5fYWJvcnRDb250cm9sbGVyID0gbnVsbFxyXG5cdFx0dGhpcy5fbGFzdFVuc2VuZERhdGUgPSBudWxsXHJcblx0XHR0aGlzLl9jb25zZWN1dGl2ZUZhaWx1cmVzID0gMFxyXG5cdFx0dGhpcy5fTUFYX1BBR0VTX1BFUl9SVU4gPSAyMCAgLy8gTG9hZCBhdCBtb3N0IDIwIHBhZ2VzIGJlZm9yZSB1bnNlbmRpbmc7IGF1dG8tcmVzdGFydCBoYW5kbGVzIHRoZSByZXN0XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cclxuXHQgKi9cclxuXHRpc1J1bm5pbmcoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fcnVubmluZyAmJiB0aGlzLl9hYm9ydENvbnRyb2xsZXIgJiYgdGhpcy5fYWJvcnRDb250cm9sbGVyLnNpZ25hbC5hYm9ydGVkID09PSBmYWxzZVxyXG5cdH1cclxuXHJcblx0c3RvcCgpIHtcclxuXHRcdGNvbnNvbGUuZGVidWcoXCJEZWZhdWx0U3RyYXRlZ3kgc3RvcFwiKVxyXG5cdFx0dGhpcy5pZG11LnNldFN0YXR1c1RleHQoXCJTdG9wcGluZy4uLlwiKVxyXG5cdFx0dGhpcy5fYWJvcnRDb250cm9sbGVyLmFib3J0KFwiRGVmYXVsdFN0cmF0ZWd5IHN0b3BwZWRcIilcclxuXHR9XHJcblxyXG5cdHJlc2V0KCkge1xyXG5cdFx0dGhpcy5fYWxsUGFnZXNMb2FkZWQgPSBmYWxzZVxyXG5cdFx0dGhpcy5fdW5zZW50Q291bnQgPSAwXHJcblx0XHR0aGlzLl9sYXN0VW5zZW5kRGF0ZSA9IG51bGxcclxuXHRcdHRoaXMuX3BhZ2VzTG9hZGVkQ291bnQgPSAwXHJcblx0XHR0aGlzLl9jb25zZWN1dGl2ZUZhaWx1cmVzID0gMFxyXG5cdFx0dGhpcy5pZG11LnNldFN0YXR1c1RleHQoXCJSZWFkeVwiKVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQHJldHVybnMge1Byb21pc2V9XHJcblx0ICovXHJcblx0YXN5bmMgcnVuKCkge1xyXG5cdFx0Y29uc29sZS5kZWJ1ZyhcIkRlZmF1bHRTdHJhdGVneS5ydW4oKVwiKVxyXG5cdFx0dGhpcy5fdW5zZW50Q291bnQgPSAwXHJcblx0XHR0aGlzLl9wYWdlc0xvYWRlZENvdW50ID0gMFxyXG5cdFx0dGhpcy5fY29uc2VjdXRpdmVGYWlsdXJlcyA9IDBcclxuXHRcdHRoaXMuX3J1bm5pbmcgPSB0cnVlXHJcblx0XHR0aGlzLl9hYm9ydENvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKClcclxuXHRcdC8vIENsZWFyIHN0YWxlIGlnbm9yZSBtYXJrZXJzIGZyb20gcHJldmlvdXMgcnVucyBzbyBtZXNzYWdlcyBjYW4gYmUgcmV0cmllZFxyXG5cdFx0dGhpcy5pZG11LndpbmRvdy5kb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiW2RhdGEtaWRtdS1pZ25vcmVdXCIpLmZvckVhY2goZWwgPT4ge1xyXG5cdFx0XHRlbC5yZW1vdmVBdHRyaWJ1dGUoXCJkYXRhLWlkbXUtaWdub3JlXCIpXHJcblx0XHR9KVxyXG5cdFx0dGhpcy5pZG11LmxvYWRVSVBJKClcclxuXHRcdHRyeSB7XHJcblx0XHRcdGlmICh0aGlzLl9hbGxQYWdlc0xvYWRlZCkge1xyXG5cdFx0XHRcdGF3YWl0IHRoaXMuI3Vuc2VuZE5leHRNZXNzYWdlKClcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRhd2FpdCB0aGlzLiNsb2FkTmV4dFBhZ2UoKVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBSYWNlIGNvbmRpdGlvbjogb24gZmlyc3QgcGFnZSBsb2FkLCBJbnN0YWdyYW0ncyBSZWFjdCBtYXkgbm90IGhhdmVcclxuXHRcdFx0Ly8gZmluaXNoZWQgaHlkcmF0aW5nIG1lc3NhZ2UgY29tcG9uZW50cyAocm9sZSBhdHRyaWJ1dGVzIG1pc3NpbmcpLlxyXG5cdFx0XHQvLyBJZiB3ZSBmb3VuZCBub3RoaW5nLCB3YWl0IGFuZCByZS1zY2FuIHVwIHRvIDMgdGltZXMuXHJcblx0XHRcdGlmICh0aGlzLl91bnNlbnRDb3VudCA9PT0gMCAmJiAhdGhpcy5fYWJvcnRDb250cm9sbGVyLnNpZ25hbC5hYm9ydGVkKSB7XHJcblx0XHRcdFx0Zm9yIChsZXQgcmV0cnkgPSAxOyByZXRyeSA8PSAzOyByZXRyeSsrKSB7XHJcblx0XHRcdFx0XHR0aGlzLmlkbXUuc2V0U3RhdHVzVGV4dChgTm8gbWVzc2FnZXMgZGV0ZWN0ZWQsIHJldHJ5aW5nICgke3JldHJ5fS8zKS4uLmApXHJcblx0XHRcdFx0XHRjb25zb2xlLmRlYnVnKGBEZWZhdWx0U3RyYXRlZ3k6IDAgbWVzc2FnZXMgZm91bmQsIHJldHJ5ICR7cmV0cnl9LzNgKVxyXG5cdFx0XHRcdFx0YXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDIwMDApKVxyXG5cdFx0XHRcdFx0aWYgKHRoaXMuX2Fib3J0Q29udHJvbGxlci5zaWduYWwuYWJvcnRlZCkgYnJlYWtcclxuXHRcdFx0XHRcdC8vIFJlc2V0IGZvciBmcmVzaCBzY2FuXHJcblx0XHRcdFx0XHR0aGlzLl9hbGxQYWdlc0xvYWRlZCA9IGZhbHNlXHJcblx0XHRcdFx0XHR0aGlzLl9jb25zZWN1dGl2ZUZhaWx1cmVzID0gMFxyXG5cdFx0XHRcdFx0dGhpcy5pZG11LndpbmRvdy5kb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiW2RhdGEtaWRtdS1pZ25vcmVdXCIpLmZvckVhY2goZWwgPT4ge1xyXG5cdFx0XHRcdFx0XHRlbC5yZW1vdmVBdHRyaWJ1dGUoXCJkYXRhLWlkbXUtaWdub3JlXCIpXHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdFx0dGhpcy5pZG11LmxvYWRVSVBJKClcclxuXHRcdFx0XHRcdGF3YWl0IHRoaXMuI2xvYWROZXh0UGFnZSgpXHJcblx0XHRcdFx0XHRpZiAodGhpcy5fdW5zZW50Q291bnQgPiAwIHx8IHRoaXMuX2Fib3J0Q29udHJvbGxlci5zaWduYWwuYWJvcnRlZCkgYnJlYWtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmICh0aGlzLl9hYm9ydENvbnRyb2xsZXIuc2lnbmFsLmFib3J0ZWQpIHtcclxuXHRcdFx0XHR0aGlzLmlkbXUuc2V0U3RhdHVzVGV4dChgQWJvcnRlZC4gJHt0aGlzLl91bnNlbnRDb3VudH0gbWVzc2FnZShzKSB1bnNlbnQuYClcclxuXHRcdFx0XHRjb25zb2xlLmRlYnVnKFwiRGVmYXVsdFN0cmF0ZWd5IGFib3J0ZWRcIilcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0aGlzLmlkbXUuc2V0U3RhdHVzVGV4dChgRG9uZS4gJHt0aGlzLl91bnNlbnRDb3VudH0gbWVzc2FnZShzKSB1bnNlbnQuYClcclxuXHRcdFx0XHRjb25zb2xlLmRlYnVnKFwiRGVmYXVsdFN0cmF0ZWd5IGRvbmVcIilcclxuXHRcdFx0fVxyXG5cdFx0fSBjYXRjaCAoZXgpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihleClcclxuXHRcdFx0dGhpcy5pZG11LnNldFN0YXR1c1RleHQoYEVycm9yZWQuICR7dGhpcy5fdW5zZW50Q291bnR9IG1lc3NhZ2UocykgdW5zZW50LmApXHJcblx0XHRcdGNvbnNvbGUuZGVidWcoXCJEZWZhdWx0U3RyYXRlZ3kgZXJyb3JlZFwiKVxyXG5cdFx0fVxyXG5cdFx0dGhpcy5fcnVubmluZyA9IGZhbHNlXHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBUcmllcyB0byBsb2FkIHRoZSB0aHJlYWQgbmV4dCBwYWdlLlxyXG5cdCAqIElmIGxvYWRNb3JlTWVzc2FnZXMgcmV0dXJucyB0cnVlIChubyBtb3JlIHBhZ2VzKSwgbW92ZXMgdG8gdW5zZW5kaW5nLlxyXG5cdCAqL1xyXG5cdGFzeW5jICNsb2FkTmV4dFBhZ2UoKSB7XHJcblx0XHRpZiAodGhpcy5fYWJvcnRDb250cm9sbGVyLnNpZ25hbC5hYm9ydGVkKSB7XHJcblx0XHRcdGNvbnNvbGUuZGVidWcoXCJhYm9ydENvbnRyb2xsZXIgaW50ZXJ1cHRlZCB0aGUgbG9hZGluZyBvZiBuZXh0IHBhZ2U6IHN0b3BwaW5nLi4uXCIpXHJcblx0XHRcdHJldHVyblxyXG5cdFx0fVxyXG5cdFx0dGhpcy5pZG11LnNldFN0YXR1c1RleHQoYExvYWRpbmcgbmV4dCBwYWdlLi4uICgke3RoaXMuX3BhZ2VzTG9hZGVkQ291bnR9LyR7dGhpcy5fTUFYX1BBR0VTX1BFUl9SVU59KWApXHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBkb25lID0gYXdhaXQgdGhpcy5pZG11LmZldGNoQW5kUmVuZGVyVGhyZWFkTmV4dE1lc3NhZ2VQYWdlKHRoaXMuX2Fib3J0Q29udHJvbGxlcilcclxuXHRcdFx0aWYgKHRoaXMuX2Fib3J0Q29udHJvbGxlci5zaWduYWwuYWJvcnRlZCA9PT0gZmFsc2UpIHtcclxuXHRcdFx0XHRpZiAoZG9uZSkge1xyXG5cdFx0XHRcdFx0dGhpcy5pZG11LnNldFN0YXR1c1RleHQoYEFsbCBwYWdlcyBsb2FkZWQgKCR7dGhpcy5fcGFnZXNMb2FkZWRDb3VudH0gaW4gdG90YWwpLiBVbnNlbmRpbmcuLi5gKVxyXG5cdFx0XHRcdFx0dGhpcy5fYWxsUGFnZXNMb2FkZWQgPSB0cnVlXHJcblx0XHRcdFx0XHRhd2FpdCB0aGlzLiN1bnNlbmROZXh0TWVzc2FnZSgpXHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHRoaXMuX3BhZ2VzTG9hZGVkQ291bnQrK1xyXG5cdFx0XHRcdFx0Ly8gQ2FwIHBhZ2UgbG9hZGluZyDigJQgc3RhcnQgdW5zZW5kaW5nIHdoYXQncyBpbiB0aGUgRE9NLCBhdXRvLXJlc3RhcnQgd2lsbCBnZXQgdGhlIHJlc3RcclxuXHRcdFx0XHRcdGlmICh0aGlzLl9wYWdlc0xvYWRlZENvdW50ID49IHRoaXMuX01BWF9QQUdFU19QRVJfUlVOKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMuaWRtdS5zZXRTdGF0dXNUZXh0KGBQYWdlIGNhcCByZWFjaGVkICgke3RoaXMuX3BhZ2VzTG9hZGVkQ291bnR9KS4gVW5zZW5kaW5nIGJhdGNoLi4uYClcclxuXHRcdFx0XHRcdFx0dGhpcy5fYWxsUGFnZXNMb2FkZWQgPSBmYWxzZSAgLy8gS2VlcCBmYWxzZSBzbyBuZXh0IHJ1biByZS1sb2Fkc1xyXG5cdFx0XHRcdFx0XHRhd2FpdCB0aGlzLiN1bnNlbmROZXh0TWVzc2FnZSgpXHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRhd2FpdCB0aGlzLiNsb2FkTmV4dFBhZ2UoKVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRjb25zb2xlLmRlYnVnKFwiYWJvcnRDb250cm9sbGVyIGludGVydXB0ZWQgdGhlIGxvYWRpbmcgb2YgbmV4dCBwYWdlOiBzdG9wcGluZy4uLlwiKVxyXG5cdFx0XHR9XHJcblx0XHR9IGNhdGNoIChleCkge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKGV4KVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVW5zZW5kIGZpcnN0IG1lc3NhZ2UgaW4gdmlld3BvcnQuXHJcblx0ICogVXNlcyBhZGFwdGl2ZSBkZWxheXM6IGZhc3QgYmFzZWxpbmUgKDEtMnMpIHdpdGggZXhwb25lbnRpYWwgYmFja29mZiBvbiByYXRlIGxpbWl0IGRldGVjdGlvbi5cclxuXHQgKi9cclxuXHRhc3luYyAjdW5zZW5kTmV4dE1lc3NhZ2UoKSB7XHJcblx0XHRpZiAodGhpcy5fYWJvcnRDb250cm9sbGVyLnNpZ25hbC5hYm9ydGVkKSB7XHJcblx0XHRcdGNvbnNvbGUuZGVidWcoXCJhYm9ydENvbnRyb2xsZXIgaW50ZXJ1cHRlZCB0aGUgdW5zZW5kaW5nIG9mIG5leHQgbWVzc2FnZTogc3RvcHBpbmcuLi5cIilcclxuXHRcdFx0cmV0dXJuXHJcblx0XHR9XHJcblx0XHRpZiAodGhpcy5fY29uc2VjdXRpdmVGYWlsdXJlcyA+PSA1KSB7XHJcblx0XHRcdHRoaXMuaWRtdS5zZXRTdGF0dXNUZXh0KGBTdG9wcGVkOiAke3RoaXMuX2NvbnNlY3V0aXZlRmFpbHVyZXN9IGNvbnNlY3V0aXZlIGZhaWx1cmVzLiAke3RoaXMuX3Vuc2VudENvdW50fSBtZXNzYWdlKHMpIHVuc2VudC5gKVxyXG5cdFx0XHRjb25zb2xlLmRlYnVnKFwiRGVmYXVsdFN0cmF0ZWd5IHN0b3BwaW5nIGR1ZSB0byBjb25zZWN1dGl2ZSBmYWlsdXJlc1wiKVxyXG5cdFx0XHRyZXR1cm5cclxuXHRcdH1cclxuXHRcdGxldCBjYW5TY3JvbGwgPSB0cnVlXHJcblx0XHRsZXQgbXNnRWxlbWVudCA9IG51bGxcclxuXHRcdHRyeSB7XHJcblx0XHRcdHRoaXMuaWRtdS5zZXRTdGF0dXNUZXh0KGBSZXRyaWV2aW5nIG5leHQgbWVzc2FnZS4uLiAoJHt0aGlzLl91bnNlbnRDb3VudH0gdW5zZW50IHNvIGZhcilgKVxyXG5cdFx0XHRjb25zdCB1aXBpTWVzc2FnZSA9IGF3YWl0IHRoaXMuaWRtdS5nZXROZXh0VUlQSU1lc3NhZ2UodGhpcy5fYWJvcnRDb250cm9sbGVyKVxyXG5cdFx0XHRjYW5TY3JvbGwgPSB1aXBpTWVzc2FnZSAhPT0gZmFsc2VcclxuXHRcdFx0aWYgKHVpcGlNZXNzYWdlKSB7XHJcblx0XHRcdFx0dGhpcy5pZG11LnNldFN0YXR1c1RleHQoYFVuc2VuZGluZyBtZXNzYWdlLi4uICgke3RoaXMuX3Vuc2VudENvdW50ICsgMX0pYClcclxuXHJcblx0XHRcdFx0Ly8gQWRhcHRpdmUgZGVsYXk6IDEtMnMgcmFuZG9taXplZCBiYXNlbGluZSBiZXR3ZWVuIHVuc2VuZHNcclxuXHRcdFx0XHRpZiAodGhpcy5fbGFzdFVuc2VuZERhdGUgIT09IG51bGwpIHtcclxuXHRcdFx0XHRcdGNvbnN0IGVsYXBzZWQgPSBEYXRlLm5vdygpIC0gdGhpcy5fbGFzdFVuc2VuZERhdGUuZ2V0VGltZSgpXHJcblx0XHRcdFx0XHRjb25zdCBtaW5EZWxheSA9IDEwMDAgKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwKSAvLyAxLTJzXHJcblx0XHRcdFx0XHRpZiAoZWxhcHNlZCA8IG1pbkRlbGF5KSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IHdhaXRNcyA9IG1pbkRlbGF5IC0gZWxhcHNlZFxyXG5cdFx0XHRcdFx0XHR0aGlzLmlkbXUuc2V0U3RhdHVzVGV4dChgV2FpdGluZyAkeyh3YWl0TXMgLyAxMDAwKS50b0ZpeGVkKDEpfXMuLi4gKCR7dGhpcy5fdW5zZW50Q291bnR9IHVuc2VudCBzbyBmYXIpYClcclxuXHRcdFx0XHRcdFx0YXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIHdhaXRNcykpXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRpZiAodGhpcy5fYWJvcnRDb250cm9sbGVyLnNpZ25hbC5hYm9ydGVkKSByZXR1cm5cclxuXHJcblx0XHRcdFx0bXNnRWxlbWVudCA9IHVpcGlNZXNzYWdlLnVpTWVzc2FnZS5yb290XHJcblx0XHRcdFx0Y29uc3QgdW5zZW50ID0gYXdhaXQgdWlwaU1lc3NhZ2UudW5zZW5kKHRoaXMuX2Fib3J0Q29udHJvbGxlcilcclxuXHJcblx0XHRcdFx0aWYgKHVuc2VudCkge1xyXG5cdFx0XHRcdFx0Ly8gVmVyaWZ5IHRoZSBtZXNzYWdlIGFjdHVhbGx5IGRpc2FwcGVhcmVkIGZyb20gRE9NIChzZXJ2ZXIgYWNjZXB0ZWQgdGhlIG11dGF0aW9uKVxyXG5cdFx0XHRcdFx0YXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDgwMCkpXHJcblx0XHRcdFx0XHRjb25zdCBzdGlsbEluRE9NID0gbXNnRWxlbWVudC5pc0Nvbm5lY3RlZCAmJiAhbXNnRWxlbWVudC5oYXNBdHRyaWJ1dGUoXCJkYXRhLWlkbXUtdW5zZW50XCIpXHJcblx0XHRcdFx0XHRpZiAoc3RpbGxJbkRPTSkge1xyXG5cdFx0XHRcdFx0XHQvLyBTZXJ2ZXIgbGlrZWx5IHJlamVjdGVkIOKAlCB0aGUgbWVzc2FnZSByZWFwcGVhcmVkIGFmdGVyIG9wdGltaXN0aWMgcmVtb3ZhbFxyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmRlYnVnKFwiRGVmYXVsdFN0cmF0ZWd5OiBtZXNzYWdlIHN0aWxsIGluIERPTSBhZnRlciB1bnNlbmQsIHBvc3NpYmxlIHJhdGUgbGltaXRcIilcclxuXHRcdFx0XHRcdFx0bXNnRWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoXCJkYXRhLWlkbXUtaWdub3JlXCIpXHJcblx0XHRcdFx0XHRcdHRoaXMuX2NvbnNlY3V0aXZlRmFpbHVyZXMrK1xyXG5cdFx0XHRcdFx0XHRjb25zdCBiYWNrb2ZmTXMgPSBNYXRoLm1pbig2MDAwMCwgNTAwMCAqIE1hdGgucG93KDIsIHRoaXMuX2NvbnNlY3V0aXZlRmFpbHVyZXMgLSAxKSlcclxuXHRcdFx0XHRcdFx0dGhpcy5pZG11LnNldFN0YXR1c1RleHQoYFJhdGUgbGltaXQgZGV0ZWN0ZWQuIEJhY2tpbmcgb2ZmICR7KGJhY2tvZmZNcyAvIDEwMDApLnRvRml4ZWQoMCl9cy4uLiAoJHt0aGlzLl91bnNlbnRDb3VudH0gdW5zZW50KWApXHJcblx0XHRcdFx0XHRcdGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCBiYWNrb2ZmTXMpKVxyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5fbGFzdFVuc2VuZERhdGUgPSBuZXcgRGF0ZSgpXHJcblx0XHRcdFx0XHRcdHRoaXMuX3Vuc2VudENvdW50KytcclxuXHRcdFx0XHRcdFx0dGhpcy5fY29uc2VjdXRpdmVGYWlsdXJlcyA9IDBcclxuXHRcdFx0XHRcdFx0Ly8gRE9NIHNocnVuayBhZnRlciByZW1vdmFsOyByZXNldCBzY3JvbGwgZm9yIGZyZXNoIHNjYW5cclxuXHRcdFx0XHRcdFx0aWYgKHRoaXMuaWRtdS51aXBpICYmIHRoaXMuaWRtdS51aXBpLnVpKSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5pZG11LnVpcGkudWkubGFzdFNjcm9sbFRvcCA9IG51bGxcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHQvLyBVbnNlbmQgd29ya2Zsb3cgcmV0dXJuZWQgZmFsc2Ug4oCUIGFsbG93IHJldHJ5IG9uIG5leHQgcGFzc1xyXG5cdFx0XHRcdFx0Y29uc29sZS5kZWJ1ZyhcIkRlZmF1bHRTdHJhdGVneTogdW5zZW5kIHJldHVybmVkIGZhbHNlLCByZW1vdmluZyBpZ25vcmUgbWFya2VyIGZvciByZXRyeVwiKVxyXG5cdFx0XHRcdFx0bXNnRWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoXCJkYXRhLWlkbXUtaWdub3JlXCIpXHJcblx0XHRcdFx0XHR0aGlzLl9jb25zZWN1dGl2ZUZhaWx1cmVzKytcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0gY2F0Y2ggKGV4KSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoZXgpXHJcblx0XHRcdC8vIFJlbW92ZSBpZ25vcmUgbWFya2VyIHNvIHRoaXMgbWVzc2FnZSBjYW4gYmUgcmV0cmllZFxyXG5cdFx0XHRpZiAobXNnRWxlbWVudCkge1xyXG5cdFx0XHRcdG1zZ0VsZW1lbnQucmVtb3ZlQXR0cmlidXRlKFwiZGF0YS1pZG11LWlnbm9yZVwiKVxyXG5cdFx0XHR9XHJcblx0XHRcdHRoaXMuX2NvbnNlY3V0aXZlRmFpbHVyZXMrK1xyXG5cdFx0XHRjb25zdCBiYWNrb2ZmTXMgPSBNYXRoLm1pbig2MDAwMCwgMzAwMCAqIE1hdGgucG93KDIsIHRoaXMuX2NvbnNlY3V0aXZlRmFpbHVyZXMgLSAxKSlcclxuXHRcdFx0dGhpcy5pZG11LnNldFN0YXR1c1RleHQoYFdvcmtmbG93IGZhaWxlZCAoJHt0aGlzLl9jb25zZWN1dGl2ZUZhaWx1cmVzfS81KSwgcmV0cnlpbmcgaW4gJHsoYmFja29mZk1zIC8gMTAwMCkudG9GaXhlZCgwKX1zLi4uICgke3RoaXMuX3Vuc2VudENvdW50fSB1bnNlbnQpYClcclxuXHRcdFx0YXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIGJhY2tvZmZNcykpXHJcblx0XHR9IGZpbmFsbHkge1xyXG5cdFx0XHRpZiAoY2FuU2Nyb2xsICYmIHRoaXMuX2Fib3J0Q29udHJvbGxlciAmJiAhdGhpcy5fYWJvcnRDb250cm9sbGVyLnNpZ25hbC5hYm9ydGVkKSB7XHJcblx0XHRcdFx0YXdhaXQgdGhpcy4jdW5zZW5kTmV4dE1lc3NhZ2UoKVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxufVxyXG5cclxuZXhwb3J0IHsgRGVmYXVsdFN0cmF0ZWd5IH1cclxuIiwiLyoqIEBtb2R1bGUgYWxlcnQgQWxlcnQgVUkgKi9cclxuXHJcbi8qKlxyXG4gKlxyXG4gKiBAcGFyYW0ge0RvY3VtZW50fSBkb2N1bWVudFxyXG4gKiBAcmV0dXJucyB7SFRNTEJ1dHRvbkVsZW1lbnR9XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQWxlcnRzV3JhcHBlckVsZW1lbnQoZG9jdW1lbnQpIHtcclxuXHRjb25zdCBhbGVydHNXcmFwcGVyRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcclxuXHRhbGVydHNXcmFwcGVyRWxlbWVudC5pZCA9IFwiaWRtdS1hbGVydHNcIlxyXG5cdGFsZXJ0c1dyYXBwZXJFbGVtZW50LnN0eWxlLnBvc2l0aW9uID0gXCJmaXhlZFwiXHJcblx0YWxlcnRzV3JhcHBlckVsZW1lbnQuc3R5bGUudG9wID0gXCIyMHB4XCJcclxuXHRhbGVydHNXcmFwcGVyRWxlbWVudC5zdHlsZS5yaWdodCA9IFwiMjBweFwiXHJcblx0YWxlcnRzV3JhcHBlckVsZW1lbnQuc3R5bGUuZGlzcGxheSA9IFwiZ3JpZFwiXHJcblx0cmV0dXJuIGFsZXJ0c1dyYXBwZXJFbGVtZW50XHJcbn1cclxuXHJcbi8qKlxyXG4gKlxyXG4gKiBAcGFyYW0ge0RvY3VtZW50fSBkb2N1bWVudFxyXG4gKiBAcGFyYW0ge3N0cmluZ30gICB0ZXh0XHJcbiAqIEByZXR1cm5zIHtIVE1MQnV0dG9uRWxlbWVudH1cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVBbGVydEVsZW1lbnQoZG9jdW1lbnQsIHRleHQpIHtcclxuXHRjb25zdCBhbGVydEVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXHJcblx0YWxlcnRFbGVtZW50LnRleHRDb250ZW50ID0gdGV4dFxyXG5cdHJldHVybiBhbGVydEVsZW1lbnRcclxufVxyXG4iLCIvKiogQG1vZHVsZSBvdmVybGF5IElETVUncyBvdmVybGF5ICovXHJcblxyXG4vKipcclxuICogQHBhcmFtIHtEb2N1bWVudH0gZG9jdW1lbnRcclxuICogQHJldHVybnMge0hUTUxEaXZFbGVtZW50fVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZU92ZXJsYXlFbGVtZW50KGRvY3VtZW50KSB7XHJcblx0Y29uc3Qgb3ZlcmxheUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXHJcblx0b3ZlcmxheUVsZW1lbnQuaWQgPSBcImlkbXUtb3ZlcmxheVwiXHJcblx0b3ZlcmxheUVsZW1lbnQudGFiSW5kZXggPSAwXHJcblx0b3ZlcmxheUVsZW1lbnQuc3R5bGUudG9wID0gXCIwXCJcclxuXHRvdmVybGF5RWxlbWVudC5zdHlsZS5yaWdodCA9IFwiMFwiXHJcblx0b3ZlcmxheUVsZW1lbnQuc3R5bGUucG9zaXRpb24gPSBcImZpeGVkXCJcclxuXHRvdmVybGF5RWxlbWVudC5zdHlsZS53aWR0aCA9IFwiMTAwdndcIlxyXG5cdG92ZXJsYXlFbGVtZW50LnN0eWxlLmhlaWdodCA9IFwiMTAwdmhcIlxyXG5cdG92ZXJsYXlFbGVtZW50LnN0eWxlLnpJbmRleCA9IFwiOTk4XCJcclxuXHRvdmVybGF5RWxlbWVudC5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBcIiMwMDAwMDBkNlwiXHJcblx0b3ZlcmxheUVsZW1lbnQuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiXHJcblx0cmV0dXJuIG92ZXJsYXlFbGVtZW50XHJcbn1cclxuIiwiLyoqIEBtb2R1bGUgdWkgSURNVSdzIG93biB1aS9vdmVybGF5XHJcbiAqIFByb3ZpZGUgYSBidXR0b24gdG8gdW5zZW5kIG1lc3NhZ2VzXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgY3JlYXRlTWVudUJ1dHRvbkVsZW1lbnQgfSBmcm9tIFwiLi9tZW51LWJ1dHRvbi5qc1wiXHJcbmltcG9ydCB7IGNyZWF0ZU1lbnVFbGVtZW50IH0gZnJvbSBcIi4vbWVudS5qc1wiXHJcbmltcG9ydCBJRE1VIGZyb20gXCIuLi8uLi8uLi9pZG11L2lkbXUuanNcIlxyXG5pbXBvcnQgeyBEZWZhdWx0U3RyYXRlZ3kgfSBmcm9tIFwiLi4vLi4vLi4vdWkvZGVmYXVsdC91bnNlbmQtc3RyYXRlZ3kuanNcIlxyXG5pbXBvcnQgeyBjcmVhdGVBbGVydHNXcmFwcGVyRWxlbWVudCB9IGZyb20gXCIuL2FsZXJ0LmpzXCJcclxuaW1wb3J0IHsgY3JlYXRlT3ZlcmxheUVsZW1lbnQgfSBmcm9tIFwiLi9vdmVybGF5LmpzXCJcclxuaW1wb3J0IHsgQlVUVE9OX1NUWUxFIH0gZnJvbSBcIi4vc3R5bGUvaW5zdGFncmFtLmpzXCJcclxuLyogZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXVudXNlZC12YXJzICovXHJcbmltcG9ydCB7IFVuc2VuZFN0cmF0ZWd5IH0gZnJvbSBcIi4uLy4uLy4uL3VpL3Vuc2VuZC1zdHJhdGVneS5qc1wiXHJcblxyXG5jbGFzcyBPU0Qge1xyXG5cdC8qKlxyXG5cdCAqXHJcblx0ICogQHBhcmFtIHtEb2N1bWVudH0gZG9jdW1lbnRcclxuXHQgKiBAcGFyYW0ge0hUTUxEaXZFbGVtZW50fSByb290XHJcblx0ICogQHBhcmFtIHtIVE1MRGl2RWxlbWVudH0gb3ZlcmxheUVsZW1lbnRcclxuXHQgKiBAcGFyYW0ge0hUTUxEaXZFbGVtZW50fSBtZW51RWxlbWVudFxyXG5cdCAqIEBwYXJhbSB7SFRNTEJ1dHRvbkVsZW1lbnR9IHVuc2VuZFRocmVhZE1lc3NhZ2VzQnV0dG9uXHJcblx0ICogQHBhcmFtIHtIVE1MRGl2RWxlbWVudH0gc3RhdHVzRWxlbWVudFxyXG5cdCAqL1xyXG5cdGNvbnN0cnVjdG9yKGRvY3VtZW50LCByb290LCBvdmVybGF5RWxlbWVudCwgbWVudUVsZW1lbnQsIHVuc2VuZFRocmVhZE1lc3NhZ2VzQnV0dG9uLCBzdGF0dXNFbGVtZW50KSB7XHJcblx0XHR0aGlzLl9kb2N1bWVudCA9IGRvY3VtZW50XHJcblx0XHR0aGlzLl9yb290ID0gcm9vdFxyXG5cdFx0dGhpcy5fb3ZlcmxheUVsZW1lbnQgPSBvdmVybGF5RWxlbWVudFxyXG5cdFx0dGhpcy5fbWVudUVsZW1lbnQgPSBtZW51RWxlbWVudFxyXG5cdFx0dGhpcy5fc3RhdHVzRWxlbWVudCA9IHN0YXR1c0VsZW1lbnRcclxuXHRcdHRoaXMuX3Vuc2VuZFRocmVhZE1lc3NhZ2VzQnV0dG9uID0gdW5zZW5kVGhyZWFkTWVzc2FnZXNCdXR0b25cclxuXHRcdHRoaXMuX2lkbXUgPSBuZXcgSURNVSh0aGlzLndpbmRvdywgdGhpcy5vblN0YXR1c1RleHQuYmluZCh0aGlzKSlcclxuXHRcdHRoaXMuX3N0cmF0ZWd5ID0gbmV3IERlZmF1bHRTdHJhdGVneSh0aGlzLl9pZG11KSAvLyBUT0RPIG1vdmUgb3V0XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKlxyXG5cdCAqIEBwYXJhbSB7d2luZG93fSB3aW5kb3dcclxuXHQgKiBAcmV0dXJucyB7T1NEfVxyXG5cdCAqL1xyXG5cdHN0YXRpYyByZW5kZXIod2luZG93KSB7XHJcblx0XHRjb25zb2xlLmRlYnVnKFwicmVuZGVyXCIpXHJcblx0XHRjb25zdCB1aSA9IE9TRC5jcmVhdGUod2luZG93LmRvY3VtZW50KVxyXG5cdFx0d2luZG93LmRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodWkucm9vdClcclxuXHRcdHJldHVybiB1aVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICpcclxuXHQgKiBAcGFyYW0gICB7RG9jdW1lbnR9IGRvY3VtZW50XHJcblx0ICogQHJldHVybnMge09TRH1cclxuXHQgKi9cclxuXHRzdGF0aWMgY3JlYXRlKGRvY3VtZW50KSB7XHJcblx0XHRjb25zdCByb290ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxyXG5cdFx0cm9vdC5pZCA9IFwiaWRtdS1yb290XCJcclxuXHRcdGNvbnN0IG1lbnVFbGVtZW50ID0gY3JlYXRlTWVudUVsZW1lbnQoZG9jdW1lbnQpXHJcblx0XHRjb25zdCBvdmVybGF5RWxlbWVudCA9IGNyZWF0ZU92ZXJsYXlFbGVtZW50KGRvY3VtZW50KVxyXG5cdFx0Y29uc3QgYWxlcnRzV3JhcHBlckVsZW1lbnQgPSBjcmVhdGVBbGVydHNXcmFwcGVyRWxlbWVudChkb2N1bWVudClcclxuXHRcdGNvbnN0IHVuc2VuZFRocmVhZE1lc3NhZ2VzQnV0dG9uID0gY3JlYXRlTWVudUJ1dHRvbkVsZW1lbnQoZG9jdW1lbnQsIFwiVW5zZW5kIGFsbCBETXNcIiwgQlVUVE9OX1NUWUxFLlBSSU1BUlkpXHJcblx0XHRjb25zdCBzdGF0dXNFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxyXG5cdFx0c3RhdHVzRWxlbWVudC50ZXh0Q29udGVudCA9IFwiUmVhZHlcIlxyXG5cdFx0c3RhdHVzRWxlbWVudC5pZCA9IFwiaWRtdS1zdGF0dXNcIlxyXG5cdFx0c3RhdHVzRWxlbWVudC5zdHlsZSA9IFwid2lkdGg6IDIwMHB4XCJcclxuXHRcdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQob3ZlcmxheUVsZW1lbnQpXHJcblx0XHRkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGFsZXJ0c1dyYXBwZXJFbGVtZW50KVxyXG5cdFx0bWVudUVsZW1lbnQuYXBwZW5kQ2hpbGQodW5zZW5kVGhyZWFkTWVzc2FnZXNCdXR0b24pXHJcblx0XHRtZW51RWxlbWVudC5hcHBlbmRDaGlsZChzdGF0dXNFbGVtZW50KVxyXG5cdFx0cm9vdC5hcHBlbmRDaGlsZChtZW51RWxlbWVudClcclxuXHRcdGNvbnN0IHVpID0gbmV3IE9TRChkb2N1bWVudCwgcm9vdCwgb3ZlcmxheUVsZW1lbnQsIG1lbnVFbGVtZW50LCB1bnNlbmRUaHJlYWRNZXNzYWdlc0J1dHRvbiwgc3RhdHVzRWxlbWVudClcclxuXHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIChldmVudCkgPT4gdWkuI29uV2luZG93S2V5RXZlbnQoZXZlbnQpKSAvLyBUT0RPIHRlc3RcclxuXHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCAoZXZlbnQpID0+IHVpLiNvbldpbmRvd0tleUV2ZW50KGV2ZW50KSkgLy8gVE9ETyB0ZXN0XHJcblx0XHR1bnNlbmRUaHJlYWRNZXNzYWdlc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGV2ZW50KSA9PiB1aS4jb25VbnNlbmRUaHJlYWRNZXNzYWdlc0J1dHRvbkNsaWNrKGV2ZW50KSlcclxuXHRcdHVpLl9tdXRhdGlvbk9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoKG11dGF0aW9ucykgPT4gdWkuI29uTXV0YXRpb25zKHVpLCBtdXRhdGlvbnMpKVxyXG5cdFx0dWkuX211dGF0aW9uT2JzZXJ2ZXIub2JzZXJ2ZShkb2N1bWVudC5ib2R5LCB7IGNoaWxkTGlzdDogdHJ1ZSB9KSAvLyBUT0RPIHRlc3RcclxuXHRcdHVuc2VuZFRocmVhZE1lc3NhZ2VzQnV0dG9uLmRhdGFUZXh0Q29udGVudCA9IHVuc2VuZFRocmVhZE1lc3NhZ2VzQnV0dG9uLnRleHRDb250ZW50XHJcblx0XHR1bnNlbmRUaHJlYWRNZXNzYWdlc0J1dHRvbi5kYXRhQmFja2dyb3VuZENvbG9yID0gdW5zZW5kVGhyZWFkTWVzc2FnZXNCdXR0b24uc3R5bGUuYmFja2dyb3VuZENvbG9yXHJcblx0XHRyZXR1cm4gdWlcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqXHJcblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHRcclxuXHQgKi9cclxuXHRvblN0YXR1c1RleHQodGV4dCkge1xyXG5cdFx0dGhpcy5zdGF0dXNFbGVtZW50LnRleHRDb250ZW50ID0gdGV4dFxyXG5cdH1cclxuXHJcblx0YXN5bmMgI3N0YXJ0VW5zZW5kaW5nKCkge1xyXG5cdFx0O1suLi50aGlzLm1lbnVFbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCJidXR0b25cIildLmZpbHRlcihidXR0b24gPT4gYnV0dG9uICE9PSB0aGlzLnVuc2VuZFRocmVhZE1lc3NhZ2VzQnV0dG9uKS5mb3JFYWNoKGJ1dHRvbiA9PiB7XHJcblx0XHRcdGJ1dHRvbi5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIlxyXG5cdFx0XHRidXR0b24uZGlzYWJsZWQgPSB0cnVlXHJcblx0XHR9KVxyXG5cdFx0dGhpcy5vdmVybGF5RWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gXCJcIlxyXG5cdFx0dGhpcy5vdmVybGF5RWxlbWVudC5mb2N1cygpXHJcblx0XHR0aGlzLnVuc2VuZFRocmVhZE1lc3NhZ2VzQnV0dG9uLnRleHRDb250ZW50ID0gXCJTdG9wIHByb2Nlc3NpbmdcIlxyXG5cdFx0dGhpcy51bnNlbmRUaHJlYWRNZXNzYWdlc0J1dHRvbi5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBcIiNGQTM4M0VcIlxyXG5cdFx0dGhpcy5zdGF0dXNFbGVtZW50LnN0eWxlLmNvbG9yID0gXCJ3aGl0ZVwiXHJcblx0XHR0aGlzLl9tdXRhdGlvbk9ic2VydmVyLmRpc2Nvbm5lY3QoKVxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0YXdhaXQgdGhpcy5zdHJhdGVneS5ydW4oKVxyXG5cdFx0fSBjYXRjaChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKGVycm9yKVxyXG5cdFx0XHRpZih0aGlzLnN0cmF0ZWd5LmlzUnVubmluZygpKSB7XHJcblx0XHRcdFx0dGhpcy5zdHJhdGVneS5zdG9wKClcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLnN0YXR1c0VsZW1lbnQuaW5uZXJIVE1MID0gYDxzcGFuIHN0eWxlPVwiY29sb3I6IHJlZFwiPkFuIGVycm9yIG9jY3VyZWQsIDxhIGhyZWY9XCJodHRwczovL2dpdGh1Yi5jb20vdGhvdWdodHN1bmlmaWNhdG9yL2luc3RhZ3JhbS1kbS11bnNlbmRlci9pc3N1ZXMvbmV3P3RlbXBsYXRlPWJ1Z19yZXBvcnQubWRcIj5wbGVhc2Ugb3BlbiBhbiBpc3N1ZTwvYT48L3NwYW4+YFxyXG5cdFx0fSBmaW5hbGx5IHtcclxuXHRcdFx0dGhpcy4jb25VbnNlbmRpbmdGaW5pc2hlZCgpXHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKlxyXG5cdCAqIEBwYXJhbSB7T1NEfSB1aVxyXG5cdCAqL1xyXG5cdCNvbk11dGF0aW9ucyh1aSkge1xyXG5cdFx0aWYodWkucm9vdC5vd25lckRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJbaWRePW1vdW50XSA+IGRpdiA+IGRpdiA+IGRpdlwiKSAhPT0gbnVsbCAmJiB1aSkge1xyXG5cdFx0XHRpZih0aGlzLl9tdXRhdGlvbk9ic2VydmVyKSB7XHJcblx0XHRcdFx0dGhpcy5fbXV0YXRpb25PYnNlcnZlci5kaXNjb25uZWN0KClcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLl9tdXRhdGlvbk9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIodWkuI29uTXV0YXRpb25zLmJpbmQodGhpcywgdWkpKVxyXG5cdFx0XHR0aGlzLl9tdXRhdGlvbk9ic2VydmVyLm9ic2VydmUodWkucm9vdC5vd25lckRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJbaWRePW1vdW50XSA+IGRpdiA+IGRpdiA+IGRpdlwiKSwgeyBjaGlsZExpc3Q6IHRydWUsIGF0dHJpYnV0ZXM6IHRydWUgfSlcclxuXHRcdH1cclxuXHRcdGlmKHRoaXMud2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnN0YXJ0c1dpdGgoXCIvZGlyZWN0L3QvXCIpKSB7XHJcblx0XHRcdGlmKCF0aGlzLnN0cmF0ZWd5LmlzUnVubmluZygpKSB7XHJcblx0XHRcdFx0dGhpcy5zdHJhdGVneS5yZXNldCgpXHJcblx0XHRcdH1cclxuXHRcdFx0dGhpcy5yb290LnN0eWxlLmRpc3BsYXkgPSBcIlwiXHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLnJvb3Quc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiXHJcblx0XHRcdGlmKHRoaXMuc3RyYXRlZ3kuaXNSdW5uaW5nKCkpIHtcclxuXHRcdFx0XHR0aGlzLnN0cmF0ZWd5LnN0b3AoKVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKlxyXG5cdCAqIEBwYXJhbSB7T1NEfSB1aVxyXG5cdCAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50XHJcblx0ICovXHJcblx0I29uVW5zZW5kVGhyZWFkTWVzc2FnZXNCdXR0b25DbGljaygpIHtcclxuXHRcdGlmKHRoaXMuc3RyYXRlZ3kuaXNSdW5uaW5nKCkpIHtcclxuXHRcdFx0Y29uc29sZS5kZWJ1ZyhcIlVzZXIgYXNrZWQgZm9yIG1lc3NhZ2VzIHVuc2VuZGluZyB0byBzdG9wXCIpXHJcblx0XHRcdHRoaXMuc3RyYXRlZ3kuc3RvcCgpXHJcblx0XHRcdHRoaXMuI29uVW5zZW5kaW5nRmluaXNoZWQoKVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Y29uc29sZS5kZWJ1ZyhcIlVzZXIgYXNrZWQgZm9yIG1lc3NhZ2VzIHVuc2VuZGluZyB0byBzdGFydDsgVUkgaW50ZXJhY3Rpb24gd2lsbCBiZSBkaXNhYmxlZCBpbiB0aGUgbWVhbnRpbWVcIilcclxuXHRcdFx0dGhpcy4jc3RhcnRVbnNlbmRpbmcoKVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICpcclxuXHQgKiBAcGFyYW0ge0V2ZW50fSBldmVudFxyXG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxyXG5cdCAqL1xyXG5cdCNvbldpbmRvd0tleUV2ZW50KGV2ZW50KSB7XHJcblx0XHRpZih0aGlzLnN0cmF0ZWd5LmlzUnVubmluZygpKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiVXNlciBpbnRlcmFjdGlvbiBpcyBkaXNhYmxlZCBhcyB0aGUgdW5zZW5kaW5nIGlzIHN0aWxsIHJ1bm5pbmc7IFBsZWFzZSBzdG9wIHRoZSBleGVjdXRpb24gZmlyc3QuXCIpXHJcblx0XHRcdGV2ZW50LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXHJcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KClcclxuXHRcdFx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKClcclxuXHRcdFx0dGhpcy5vdmVybGF5RWxlbWVudC5mb2N1cygpXHJcblx0XHRcdHJldHVybiBmYWxzZVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0I29uVW5zZW5kaW5nRmluaXNoZWQoKSB7XHJcblx0XHRjb25zb2xlLmRlYnVnKFwicmVuZGVyIG9uVW5zZW5kaW5nRmluaXNoZWRcIilcclxuXHRcdDtbLi4udGhpcy5tZW51RWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiYnV0dG9uXCIpXS5maWx0ZXIoYnV0dG9uID0+IGJ1dHRvbiAhPT0gdGhpcy51bnNlbmRUaHJlYWRNZXNzYWdlc0J1dHRvbikuZm9yRWFjaChidXR0b24gPT4ge1xyXG5cdFx0XHRidXR0b24uc3R5bGUudmlzaWJpbGl0eSA9IFwiXCJcclxuXHRcdFx0YnV0dG9uLmRpc2FibGVkID0gZmFsc2VcclxuXHRcdH0pXHJcblx0XHR0aGlzLnVuc2VuZFRocmVhZE1lc3NhZ2VzQnV0dG9uLnRleHRDb250ZW50ID0gdGhpcy51bnNlbmRUaHJlYWRNZXNzYWdlc0J1dHRvbi5kYXRhVGV4dENvbnRlbnRcclxuXHRcdHRoaXMudW5zZW5kVGhyZWFkTWVzc2FnZXNCdXR0b24uc3R5bGUuYmFja2dyb3VuZENvbG9yID0gdGhpcy51bnNlbmRUaHJlYWRNZXNzYWdlc0J1dHRvbi5kYXRhQmFja2dyb3VuZENvbG9yXHJcblx0XHR0aGlzLm92ZXJsYXlFbGVtZW50LnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIlxyXG5cdFx0dGhpcy5zdGF0dXNFbGVtZW50LnN0eWxlLmNvbG9yID0gXCJcIlxyXG5cdFx0dGhpcy5fbXV0YXRpb25PYnNlcnZlci5vYnNlcnZlKHRoaXMuX2RvY3VtZW50LmJvZHksIHsgY2hpbGRMaXN0OiB0cnVlIH0pIC8vIFRPRE8gdGVzdFxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQHJlYWRvbmx5XHJcblx0ICogQHR5cGUge0RvY3VtZW50fVxyXG5cdCAqL1xyXG5cdGdldCBkb2N1bWVudCgpIHtcclxuXHRcdHJldHVybiB0aGlzLl9kb2N1bWVudFxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQHJlYWRvbmx5XHJcblx0ICogQHR5cGUge1dpbmRvd31cclxuXHQgKi9cclxuXHRnZXQgd2luZG93KCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX2RvY3VtZW50LmRlZmF1bHRWaWV3XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBAcmVhZG9ubHlcclxuXHQgKiBAdHlwZSB7SFRNTERpdkVsZW1lbnR9XHJcblx0ICovXHJcblx0Z2V0IHJvb3QoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fcm9vdFxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQHJlYWRvbmx5XHJcblx0ICogQHR5cGUge0hUTUxEaXZFbGVtZW50fVxyXG5cdCAqL1xyXG5cdGdldCBvdmVybGF5RWxlbWVudCgpIHtcclxuXHRcdHJldHVybiB0aGlzLl9vdmVybGF5RWxlbWVudFxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQHJlYWRvbmx5XHJcblx0ICogQHR5cGUge0hUTUxEaXZFbGVtZW50fVxyXG5cdCAqL1xyXG5cdGdldCBtZW51RWxlbWVudCgpIHtcclxuXHRcdHJldHVybiB0aGlzLl9tZW51RWxlbWVudFxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQHJlYWRvbmx5XHJcblx0ICogQHR5cGUge0hUTUxCdXR0b25FbGVtZW50fVxyXG5cdCAqL1xyXG5cdGdldCB1bnNlbmRUaHJlYWRNZXNzYWdlc0J1dHRvbigpIHtcclxuXHRcdHJldHVybiB0aGlzLl91bnNlbmRUaHJlYWRNZXNzYWdlc0J1dHRvblxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQHJlYWRvbmx5XHJcblx0ICogQHR5cGUge0hUTUxEaXZFbGVtZW50fVxyXG5cdCAqL1xyXG5cdGdldCBzdGF0dXNFbGVtZW50KCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX3N0YXR1c0VsZW1lbnRcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEByZWFkb25seVxyXG5cdCAqIEB0eXBlIHtVbnNlbmRTdHJhdGVneX1cclxuXHQgKi9cclxuXHRnZXQgc3RyYXRlZ3koKSB7IC8vIFRPRE8gbW92ZSBvdXRcclxuXHRcdHJldHVybiB0aGlzLl9zdHJhdGVneVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQHJlYWRvbmx5XHJcblx0ICogQHR5cGUge0lETVV9XHJcblx0ICovXHJcblx0Z2V0IGlkbXUoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5faWRtdVxyXG5cdH1cclxuXHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IE9TRFxyXG4iLCIvKiogQG1vZHVsZSBtYWluIE1haW4gbW9kdWxlICovXHJcblxyXG5pbXBvcnQgT1NEIGZyb20gXCIuL29zZC9vc2QuanNcIlxyXG5cclxuLyoqXHJcbiAqIEBwYXJhbSB7V2luZG93fSB3aW5kb3dcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBtYWluKHdpbmRvdykge1xyXG5cdE9TRC5yZW5kZXIod2luZG93KVxyXG59XHJcblxyXG5pZih0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XHJcblx0bWFpbih3aW5kb3cpXHJcbn1cclxuIl0sIm5hbWVzIjpbInN0cmluZ3MuTEFCRUxfUEFUVEVSTlMiLCJzdHJpbmdzLlVOU0VORF9URVhUX1ZBUklBTlRTIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBQUE7QUFDQTtDQUNPLE1BQU0sWUFBWSxHQUFHO0NBQzVCLENBQUMsU0FBUyxFQUFFLFNBQVM7Q0FDckIsQ0FBQyxXQUFXLEVBQUUsV0FBVztDQUN6QixFQUFDO0FBQ0Q7Q0FDQTtDQUNBO0NBQ0E7Q0FDQTtDQUNBO0NBQ08sU0FBUyxnQkFBZ0IsQ0FBQyxhQUFhLEVBQUUsU0FBUyxFQUFFO0NBQzNELENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxRQUFR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
