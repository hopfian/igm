// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/features.md (§ users/profile.ts)
//     If methods, API endpoints, or return types change, update the method table in the docs.
import type { IGClient } from "../../../core/http/ig-client";
import type { TimelineItem } from "../../../modules/timeline/models/timeline.model";
import { parseMediaNode } from "../../../modules/timeline/utils/media-extractor";
import type { FriendshipStatus, ProfileInfo } from "../models/user.model";

export class Profile {
	private client: IGClient;

	constructor(client: IGClient) {
		this.client = client;
	}

	public async getProfile(userId: string): Promise<ProfileInfo> {
		const response = await this.client.apiCall(`users/${userId}/info/`, "GET");
		const u = response.user;

		return {
			id: u.pk,
			username: u.username,
			full_name: u.full_name,
			biography: u.biography,
			external_url: u.external_url,
			follower_count: u.follower_count,
			following_count: u.following_count,
			media_count: u.media_count,
			is_private: u.is_private,
			is_verified: u.is_verified,
			category: u.category,
			mutual_followers_count: u.mutual_followers_count,
			show_account_transparency_details: u.show_account_transparency_details,
		};
	}

	public async getProfileByUsername(username: string): Promise<ProfileInfo> {
		const response = await this.client.apiCall(
			`users/web_profile_info/?username=${encodeURIComponent(username)}`,
			"GET",
		);
		const u = response.data?.user;
		if (!u) throw new Error(`User @${username} not found`);

		return {
			id: u.id,
			username: u.username,
			full_name: u.full_name,
			biography: u.biography,
			external_url: u.external_url || u.bio_links?.[0]?.url || "",
			follower_count: u.edge_followed_by?.count || 0,
			following_count: u.edge_follow?.count || 0,
			media_count: u.edge_owner_to_timeline_media?.count || 0,
			is_private: u.is_private,
			is_verified: u.is_verified,
			category: u.category_name,
			mutual_followers_count: u.edge_mutual_followed_by?.count,
			show_account_transparency_details: u.transparency_product_enabled,
		};
	}

	public async getProfileFeed(userId: string): Promise<TimelineItem[]> {
		const response = await this.client.apiCall(`feed/user/${userId}/`, "GET");
		const items = response.items || [];

		const parsed: TimelineItem[] = [];
		for (const media of items) {
			const result = parseMediaNode(media);
			if (result) parsed.push(result);
		}
		return parsed;
	}

	public async getFriendshipStatus(userId: string): Promise<FriendshipStatus> {
		const response = await this.client.apiCall(
			`friendships/show/${userId}/`,
			"GET",
		);
		return {
			following: response.following || false,
			followed_by: response.followed_by || false,
			blocking: response.blocking || false,
			muting: response.muting || false,
			is_restricted: response.is_restricted || false,
			incoming_request: response.incoming_request || false,
			outgoing_request: response.outgoing_request || false,
		};
	}

	public async followUser(userId: string): Promise<any> {
		return await this.client.apiCall(`friendships/create/${userId}/`, "POST");
	}

	public async unfollowUser(userId: string): Promise<any> {
		return await this.client.apiCall(`friendships/destroy/${userId}/`, "POST");
	}

	public async blockUser(userId: string): Promise<any> {
		return await this.client.apiCall(`friendships/block/${userId}/`, "POST");
	}

	public async unblockUser(userId: string): Promise<any> {
		return await this.client.apiCall(`friendships/unblock/${userId}/`, "POST");
	}

	public async restrictUser(userId: string): Promise<any> {
		return await this.client.apiCall("restrict_action/restrict/", "POST", {
			target_user_id: userId,
		});
	}

	public async muteUser(userId: string): Promise<any> {
		return await this.client.apiCall(
			`friendships/mute_posts_or_story_from_follow/`,
			"POST",
			{
				target_posts_author_id: userId,
				target_reel_author_id: userId,
			},
		);
	}

	public async getSavedPosts(): Promise<TimelineItem[]> {
		const response = await this.client.apiCall("feed/saved/posts/", "GET");
		const items = response.items || [];

		const parsed: TimelineItem[] = [];
		for (const item of items) {
			const media = item.media;
			const result = parseMediaNode(media);
			if (result) parsed.push(result);
		}
		return parsed;
	}
}
