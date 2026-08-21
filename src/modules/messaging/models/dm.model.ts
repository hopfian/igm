// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/models.md (§ dm.ts)
//     If fields are added/removed from DMThread or DMMessage, update the docs.
export interface DMThread {
	thread_id: string;
	thread_title: string;
	last_message: string;
	users: string[];
}

export interface DMMessage {
	id: string;
	user_id: string;
	text: string;
	timestamp: number;
}
