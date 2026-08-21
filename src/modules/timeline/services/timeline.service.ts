// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/features.md (§ timeline/timeline.ts)
//     If methods, API endpoints, or return types change, update the method table in the docs.
import type { IGClient } from "../../../core/http/ig-client";
import type { CommentItem, TimelineItem } from "../models/timeline.model";
import { parseMediaNode } from "../utils/media-extractor";

export class Timeline {
	private client: IGClient;

	constructor(client: IGClient) {
		this.client = client;
	}

	public async getFeed(): Promise<TimelineItem[]> {
		const response = await this.client.apiCall("feed/timeline/", "POST", {
			is_prefetch: "0",
			is_pull_to_refresh: "0",
		});

		const items = response.feed_items || [];
		const parsed: TimelineItem[] = [];

		for (const item of items) {
			const media = item.media_or_ad || item.explore_story?.media_or_ad || null;
			const result = parseMediaNode(media);
			if (result) parsed.push(result);
		}

		return parsed;
	}

	public async getComments(mediaId: string): Promise<CommentItem[]> {
		const response = await this.client.apiCall(
			`media/${mediaId}/comments/`,
			"GET",
		);
		return (response.comments || []).map((c: any) => ({
			id: c.pk || c.id,
			username: c.user?.username || "unknown",
			text: c.text || "",
			like_count: c.comment_like_count || 0,
			created_at: c.created_at,
			reply_count: c.child_comment_count || 0,
		}));
	}

	public async addComment(mediaId: string, text: string): Promise<any> {
		return await this.client.apiCall(`web/comments/${mediaId}/add/`, "POST", {
			comment_text: text,
		});
	}

	public async likePost(mediaId: string): Promise<any> {
		return await this.client.apiCall(`web/likes/${mediaId}/like/`, "POST", {
			d: "0",
		});
	}

	public async unlikePost(mediaId: string): Promise<any> {
		return await this.client.apiCall(`web/likes/${mediaId}/unlike/`, "POST", {
			d: "0",
		});
	}

	public async savePost(mediaId: string): Promise<any> {
		return await this.client.apiCall(`web/save/${mediaId}/save/`, "POST", {
			d: "0",
		});
	}

	public async unsavePost(mediaId: string): Promise<any> {
		return await this.client.apiCall(`web/save/${mediaId}/unsave/`, "POST", {
			d: "0",
		});
	}

	public async getPostInfo(mediaId: string): Promise<TimelineItem | null> {
		const response = await this.client.apiCall(`media/${mediaId}/info/`, "GET");
		if (!response.items?.length) return null;
		return parseMediaNode(response.items[0]);
	}
}
