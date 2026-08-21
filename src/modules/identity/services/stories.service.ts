// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/features.md (§ users/stories.ts)
//     If methods, API endpoints, or return types change, update the docs.
import type { IGClient } from "../../../core/http/ig-client";
import type { StoryItem } from "../models/user.model";

export class Stories {
	private client: IGClient;

	constructor(client: IGClient) {
		this.client = client;
	}

	/** Fetch the stories tray (list of users who have active stories). */
	public async getStoryTray(): Promise<
		{ id: string; username: string; has_unseen: boolean }[]
	> {
		const response = await this.client.apiCall("feed/reels_tray/", "GET");
		const tray = response.tray || [];

		return tray.map((t: any) => ({
			id: t.id || t.user?.pk,
			username: t.user?.username || "unknown",
			has_unseen: (t.seen || 0) < (t.latest_reel_media || 0),
		}));
	}

	/** Fetch stories for a specific user. */
	public async getUserStories(userId: string): Promise<StoryItem[]> {
		const response = await this.client.apiCall(
			`feed/user/${userId}/story/`,
			"GET",
		);
		const items = response.reel?.items || [];

		return items.map((item: any) => {
			let mediaUrl = "";
			if (item.video_versions?.length > 0) {
				mediaUrl = item.video_versions[0].url;
			} else if (item.image_versions2?.candidates?.length > 0) {
				mediaUrl = item.image_versions2.candidates[0].url;
			}

			return {
				id: item.id,
				username: item.user?.username || "unknown",
				code: item.code || "",
				taken_at: item.taken_at,
				expiring_at: item.expiring_at,
				media_type: item.media_type,
				media_url: mediaUrl,
			};
		});
	}
}
