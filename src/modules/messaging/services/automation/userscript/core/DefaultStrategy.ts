import { UnsendStrategy } from "./UnsendStrategy";

export class DefaultStrategy extends UnsendStrategy {
	private _allPagesLoaded: boolean = false;
	private _unsentCount: number = 0;
	private _totalPagesLoaded: number = 0;
	private _running: boolean = false;
	private _abortController: AbortController | null = null;
	private _lastUnsendDate: Date | null = null;
	private _consecutiveFailures: number = 0;
	private _maxConsecutiveFailures: number = 5;
	private _minDelayMs: number = 400;
	private _topFirst: boolean = false;

	setConfig(config: any) {
		if (config?.maxFailures) this._maxConsecutiveFailures = config.maxFailures;
		if (config?.delayMs) this._minDelayMs = config.delayMs;
		if (config?.topFirst !== undefined) this._topFirst = config.topFirst;
	}

	isRunning(): boolean {
		return (
			this._running &&
			this._abortController !== null &&
			this._abortController.signal.aborted === false
		);
	}

	stop(): void {
		this.idmu.setStatusText("Stopping...");
		if (this._abortController) {
			this._abortController.abort("DefaultStrategy stopped");
		}
	}

	reset(): void {
		this._allPagesLoaded = false;
		this._unsentCount = 0;
		this._lastUnsendDate = null;
		this._totalPagesLoaded = 0;
		this._consecutiveFailures = 0;
		this.idmu.setStatusText("Ready");
	}

	getUnsentCount(): number {
		return this._unsentCount;
	}

	async run(): Promise<void> {
		this._unsentCount = 0;
		this._totalPagesLoaded = 0;
		this._consecutiveFailures = 0;
		this._running = true;
		this._abortController = new AbortController();

		const doc = this.idmu.window.document;
		doc.querySelectorAll("[data-idmu-ignore]").forEach((el) => {
			el.removeAttribute("data-idmu-ignore");
		});

		this.idmu.loadUIPI();

		try {
			if (this._topFirst) {
				// 1. Load all pages to the absolute top first
				while (!this._allPagesLoaded && !this._abortController.signal.aborted) {
					const moreToLoad = await this.loadNextPage();
					if (!moreToLoad) {
						this._allPagesLoaded = true;
						if (this.idmu.uipi?.ui) this.idmu.uipi.ui.lastScrollTop = null;
					}
				}
				// 2. Unsend from top to bottom
				while (!this._abortController.signal.aborted) {
					const didUnsend = await this.unsendNextMessage();
					if (!didUnsend) break;
				}
			} else {
				// Normal: Unsend newest to oldest, loading pages as we go up
				while (!this._abortController.signal.aborted) {
					const didUnsend = await this.unsendNextMessage();
					if (!didUnsend) {
						if (this._allPagesLoaded) break;

						const moreToLoad = await this.loadNextPage();
						if (!moreToLoad) {
							this._allPagesLoaded = true;
						}
					}
				}
			}

			if (this._unsentCount === 0 && !this._abortController.signal.aborted) {
				for (let retry = 1; retry <= 3; retry++) {
					this.idmu.setStatusText(
						`No messages detected, retrying (${retry}/3)...`,
					);
					await new Promise((resolve) => setTimeout(resolve, 2000));
					if (this._abortController.signal.aborted) break;

					doc.querySelectorAll("[data-idmu-ignore]").forEach((el) => {
						el.removeAttribute("data-idmu-ignore");
					});
					this.idmu.loadUIPI();

					// Re-check current page
					const didUnsend = await this.unsendNextMessage();
					if (
						didUnsend ||
						this._unsentCount > 0 ||
						this._abortController.signal.aborted
					)
						break;
				}
			}

			if (this._abortController.signal.aborted) {
				this.idmu.setStatusText(
					`Aborted. ${this._unsentCount} message(s) unsent.`,
				);
			} else {
				this.idmu.setStatusText(
					`Done. ${this._unsentCount} message(s) unsent.`,
				);
			}
		} catch (ex) {
			console.error(ex);
			this.idmu.setStatusText(
				`Errored. ${this._unsentCount} message(s) unsent.`,
			);
		}
		this._running = false;
	}

	private async loadNextPage(): Promise<boolean> {
		if (!this._abortController || this._abortController.signal.aborted)
			return false;

		this._totalPagesLoaded++;
		this.idmu.setStatusText(
			`Loading history... | Total Scrolled: ${this._totalPagesLoaded}`,
		);
		try {
			const isAtTop = await this.idmu.fetchAndRenderThreadNextMessagePage(
				this._abortController,
			);
			if (!this._abortController.signal.aborted) {
				if (isAtTop) {
					this.idmu.setStatusText(
						`All pages loaded (${this._totalPagesLoaded} total). Unsending...`,
					);
					return false; // No more to load
				}
				return true; // More to load
			}
		} catch (ex) {
			console.error(ex);
		}
		return false;
	}

	private async unsendNextMessage(): Promise<boolean> {
		if (!this._abortController || this._abortController.signal.aborted)
			return false;

		if (this._consecutiveFailures >= this._maxConsecutiveFailures) {
			this.idmu.setStatusText(
				`Stopped: ${this._consecutiveFailures} consecutive failures. ${this._unsentCount} message(s) unsent.`,
			);
			return false;
		}

		let canScroll = true;
		let msgElement: Element | null = null;

		try {
			this.idmu.setStatusText(
				`Retrieving next message... (${this._unsentCount} unsent so far)`,
			);
			const uipiMessage = await this.idmu.getNextUIPIMessage(
				this._abortController,
				this._topFirst,
			);
			canScroll = uipiMessage !== false;

			if (uipiMessage) {
				this.idmu.setStatusText(
					`Unsending message... (${this._unsentCount + 1})`,
				);

				if (this._lastUnsendDate !== null) {
					const elapsed = Date.now() - this._lastUnsendDate.getTime();
					const minDelay =
						this._minDelayMs +
						Math.floor(Math.random() * (this._minDelayMs / 2));
					if (elapsed < minDelay) {
						const waitMs = minDelay - elapsed;
						this.idmu.setStatusText(
							`Waiting ${(waitMs / 1000).toFixed(1)}s... (${this._unsentCount} unsent so far)`,
						);
						await new Promise((resolve) => setTimeout(resolve, waitMs));
					}
				}

				if (this._abortController.signal.aborted) return false;

				msgElement = uipiMessage.uiMessage.root;
				const unsent = await uipiMessage.unsend(this._abortController);

				if (unsent) {
					// Wait up to 1500ms for the message to be removed from DOM
					for (let i = 0; i < 30; i++) {
						if (!msgElement.isConnected) break;
						await new Promise((resolve) => setTimeout(resolve, 50));
					}
					const stillInDOM =
						msgElement.isConnected &&
						!msgElement.hasAttribute("data-idmu-unsent");
					if (stillInDOM) {
						msgElement.removeAttribute("data-idmu-ignore");
						this._consecutiveFailures++;
						const backoffMs = Math.min(
							60000,
							5000 * 2 ** (this._consecutiveFailures - 1),
						);
						this.idmu.setStatusText(
							`Rate limit detected. Backing off ${(backoffMs / 1000).toFixed(0)}s... (${this._unsentCount} unsent)`,
						);
						await new Promise((resolve) => setTimeout(resolve, backoffMs));
					} else {
						this._lastUnsendDate = new Date();
						this._unsentCount++;
						this._consecutiveFailures = 0;
						if (this.idmu.uipi?.ui) {
							// Rewind slightly to ensure we don't miss adjacent messages
							// after the DOM shifts due to removal.
							const ui = this.idmu.uipi.ui;
							if (ui.lastScrollTop !== null) {
								if (this._topFirst) {
									// Moving top to bottom (oldest to newest): when DOM shifts,
									// messages shift up. We stay in place or move slightly up.
									ui.lastScrollTop = Math.min(0, ui.lastScrollTop + 800);
								} else {
									// Moving bottom to top: rewind slightly.
									if (ui.lastScrollTop <= 0) {
										ui.lastScrollTop = Math.min(0, ui.lastScrollTop + 800);
									} else {
										ui.lastScrollTop = Math.max(0, ui.lastScrollTop - 800);
									}
								}
							}
						}
					}
				} else {
					msgElement.removeAttribute("data-idmu-ignore");
					this._consecutiveFailures++;
					const backoffMs = Math.min(
						60000,
						3000 * 2 ** (this._consecutiveFailures - 1),
					);
					this.idmu.setStatusText(
						`Unsend blocked. Backing off ${(backoffMs / 1000).toFixed(0)}s... (${this._unsentCount} unsent)`,
					);
					await new Promise((resolve) => setTimeout(resolve, backoffMs));
				}
			}
		} catch (ex) {
			console.error(ex);
			if (msgElement) {
				msgElement.removeAttribute("data-idmu-ignore");
			}
			this._consecutiveFailures++;
			const backoffMs = Math.min(
				60000,
				3000 * 2 ** (this._consecutiveFailures - 1),
			);
			this.idmu.setStatusText(
				`Workflow failed (${this._consecutiveFailures}/${this._maxConsecutiveFailures}), retrying in ${(backoffMs / 1000).toFixed(0)}s... (${this._unsentCount} unsent)`,
			);
			await new Promise((resolve) => setTimeout(resolve, backoffMs));
		}

		if (canScroll && !this._abortController.signal.aborted) {
			return true;
		}

		return false;
	}
}
