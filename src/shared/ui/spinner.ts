// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/ui.md (§ spinner.ts — Status Indicators)
//     If spinner initialization or clear functions change, update the docs.
import { spinner } from "@clack/prompts";

let activeSpinner: ReturnType<typeof spinner> | null = null;

export function spin(message: string) {
	if (activeSpinner) {
		activeSpinner.stop();
	}
	const s = spinner();
	s.start(message);
	activeSpinner = s;
	return {
		update: (msg: string) => {
			activeSpinner?.message(msg);
		},
		succeed: (msg?: string) => {
			activeSpinner?.stop(msg || "Done.");
			activeSpinner = null;
		},
		fail: (msg?: string) => {
			activeSpinner?.stop(msg || "Failed.");
			activeSpinner = null;
		},
	};
}

export function clearActiveSpinner() {
	if (activeSpinner) {
		activeSpinner.stop("Cancelled.");
		activeSpinner = null;
	}
}
