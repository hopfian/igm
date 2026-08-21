import type { UIMessage } from "../ui/UIMessage";

export class FailedWorkflowException extends Error {}

export class UIPIMessage {
	private _uiMessage: UIMessage;

	constructor(uiMessage: UIMessage) {
		this._uiMessage = uiMessage;
	}

	async unsend(abortController: AbortController): Promise<boolean> {
		let actionButton: HTMLButtonElement | null = null;
		let unsendButton: HTMLElement | null = null;
		try {
			actionButton =
				await this.uiMessage.showActionsMenuButton(abortController);
			if (!actionButton) throw new Error("Action button not found");

			unsendButton = await this.uiMessage.openActionsMenu(
				actionButton,
				abortController,
			);
			if (!unsendButton) throw new Error("Unsend menu button not found");

			const dialogButton = await this.uiMessage.openConfirmUnsendModal(
				unsendButton,
				abortController,
			);
			await this.uiMessage.confirmUnsend(dialogButton, abortController);
			this.uiMessage.root.setAttribute("data-idmu-unsent", "");
			return true;
		} catch (ex) {
			console.error(ex);
			this.uiMessage.root.setAttribute("data-idmu-ignore", "");
			try {
				const doc = this.uiMessage.root.ownerDocument;
				doc.body.dispatchEvent(
					new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
				);
				await new Promise((resolve) => setTimeout(resolve, 200));
				if (doc.querySelector("[role=dialog]")) {
					doc.body.dispatchEvent(
						new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
					);
					await new Promise((resolve) => setTimeout(resolve, 200));
				}
			} catch (error) {
				console.error(error);
			}
			throw new FailedWorkflowException(
				`Failed to execute workflow for this message: ${ex}`,
			);
		}
	}

	get uiMessage(): UIMessage {
		return this._uiMessage;
	}
}
