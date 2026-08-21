// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/models.md (§ timeline.ts)
//     If fields are added/removed from TimelineItem, CommentItem, or StoryItem, update the docs AND csv schemas in docs/ui.md.
export interface TimelineItem {
	id: string;
	username: string;
	full_name: string;
	code: string;
	caption: string;
	like_count: number;
	comment_count: number;
	media_urls: string[];
	media_type?: number;
	taken_at?: number;
	location?: string;
	has_liked?: boolean;
	view_count?: number;
	url: string;
}

export interface CommentItem {
	id: string;
	username: string;
	text: string;
	like_count: number;
	created_at?: number;
	reply_count?: number;
}

export interface StoryItem {
	id: string;
	username: string;
	code: string;
	taken_at: number;
	expiring_at: number;
	media_type: number;
	media_url: string;
}
