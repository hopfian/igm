/**
 * Instagram API response schemas for runtime validation using Zod.
 * These define the expected shapes of raw IG API responses
 * before they are parsed into our domain models.
 */
import { z } from "zod";

// ─── User Schema ─────────────────────────────────────────────────────────────

// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/models.md (§ schemas/ig-api.ts)
//     If API payload shapes change, update the interface descriptions.
export const IGUserNodeSchema = z.object({
	pk: z.string(),
	username: z.string(),
	full_name: z.string(),
	is_private: z.boolean(),
	is_verified: z.boolean(),
	profile_pic_url: z.string(),
	biography: z.string().optional(),
	external_url: z.string().optional(),
	follower_count: z.number().optional(),
	following_count: z.number().optional(),
	media_count: z.number().optional(),
	mutual_followers_count: z.number().optional(),
	category: z.string().optional(),
	show_account_transparency_details: z.boolean().optional(),
});
export type IGUserNode = z.infer<typeof IGUserNodeSchema>;

// ─── Media Schema ────────────────────────────────────────────────────────────

// Note: circular dependency if carousel_media is recursive, but let's keep it simple.
// To handle recursive schemas in Zod, we use z.lazy()
export const IGMediaNodeSchema: z.ZodType<any> = z.lazy(() =>
	z.object({
		id: z.string(),
		code: z.string(),
		media_type: z.number(), // 1=photo, 2=video, 8=carousel
		user: IGUserNodeSchema,
		caption: z
			.object({ text: z.string(), created_at: z.number().optional() })
			.optional(),
		like_count: z.number().optional(),
		comment_count: z.number().optional(),
		taken_at: z.number().optional(),
		video_versions: z
			.array(
				z.object({ url: z.string(), width: z.number(), height: z.number() }),
			)
			.optional(),
		image_versions2: z
			.object({
				candidates: z.array(
					z.object({ url: z.string(), width: z.number(), height: z.number() }),
				),
			})
			.optional(),
		carousel_media: z.array(IGMediaNodeSchema).optional(),
		location: z.object({ name: z.string(), pk: z.string() }).optional(),
		has_liked: z.boolean().optional(),
		has_saved: z.boolean().optional(),
		view_count: z.number().optional(),
		play_count: z.number().optional(),
	}),
);

// We export a manual interface if we want explicit typing, or just the inferred type (which might be complex due to any)
export interface IGMediaNode {
	id: string;
	code: string;
	media_type: number;
	user: IGUserNode;
	caption?: { text: string; created_at?: number };
	like_count?: number;
	comment_count?: number;
	taken_at?: number;
	video_versions?: { url: string; width: number; height: number }[];
	image_versions2?: {
		candidates: { url: string; width: number; height: number }[];
	};
	carousel_media?: IGMediaNode[];
	location?: { name: string; pk: string };
	has_liked?: boolean;
	has_saved?: boolean;
	view_count?: number;
	play_count?: number;
}

// ─── Comment Schema ──────────────────────────────────────────────────────────

export const IGCommentNodeSchema: z.ZodType<any> = z.lazy(() =>
	z.object({
		pk: z.string(),
		text: z.string(),
		created_at: z.number(),
		user: IGUserNodeSchema,
		comment_like_count: z.number(),
		child_comment_count: z.number().optional(),
		has_liked_comment: z.boolean().optional(),
		preview_child_comments: z.array(IGCommentNodeSchema).optional(),
	}),
);

export interface IGCommentNode {
	pk: string;
	text: string;
	created_at: number;
	user: IGUserNode;
	comment_like_count: number;
	child_comment_count?: number;
	has_liked_comment?: boolean;
	preview_child_comments?: IGCommentNode[];
}

// ─── DM Schema ───────────────────────────────────────────────────────────────

export const IGThreadNodeSchema = z.object({
	thread_id: z.string(),
	thread_title: z.string(),
	thread_type: z.string().optional(), // sometimes missing
	users: z.array(IGUserNodeSchema).optional(),
	last_permanent_item: z
		.object({
			text: z.string().optional(),
			item_type: z.string(),
			timestamp: z.string(),
			user_id: z.string(),
		})
		.optional(),
	is_group: z.boolean().optional(),
	muted: z.boolean().optional(),
	read_state: z.number().optional(),
});
export type IGThreadNode = z.infer<typeof IGThreadNodeSchema>;

export const IGDirectItemNodeSchema = z.object({
	item_id: z.string(),
	user_id: z.string(),
	timestamp: z.string(),
	item_type: z.string(),
	text: z.string().optional(),
	media: IGMediaNodeSchema.optional(),
	link: z
		.object({
			text: z.string(),
			link_context: z.object({ link_url: z.string() }),
		})
		.optional(),
	reel_share: z
		.object({ text: z.string(), media: IGMediaNodeSchema })
		.optional(),
});
export type IGDirectItemNode = z.infer<typeof IGDirectItemNodeSchema>;

// ─── Notification Schema ─────────────────────────────────────────────────────

export const IGNotificationNodeSchema = z.object({
	pk: z.string(),
	type: z.number(),
	args: z.object({
		text: z.string(),
		timestamp: z.number(),
		links: z.array(z.object({ id: z.string(), type: z.string() })).optional(),
		profile_image: z.string().optional(),
		media: z.array(z.object({ id: z.string(), image: z.string() })).optional(),
	}),
});
export type IGNotificationNode = z.infer<typeof IGNotificationNodeSchema>;

// ─── Timeline Feed Response ──────────────────────────────────────────────────

export const IGTimelineFeedResponseSchema = z.object({
	feed_items: z.array(z.object({ media_or_ad: IGMediaNodeSchema.optional() })),
	next_max_id: z.string().optional(),
	more_available: z.boolean().optional(),
	status: z.string().optional(),
});
export type IGTimelineFeedResponse = z.infer<
	typeof IGTimelineFeedResponseSchema
>;

// ─── Explore Response ────────────────────────────────────────────────────────

export const IGExploreResponseSchema = z.object({
	sectional_items: z.array(
		z.object({
			layout_type: z.string(),
			layout_content: z.object({
				fill_items: z.array(z.object({ media: IGMediaNodeSchema })).optional(),
				medias: z.array(z.object({ media: IGMediaNodeSchema })).optional(),
			}),
		}),
	),
	next_max_id: z.string().optional(),
	more_available: z.boolean().optional(),
	status: z.string().optional(),
});
export type IGExploreResponse = z.infer<typeof IGExploreResponseSchema>;

// ─── Clips (Reels) GraphQL Response ──────────────────────────────────────────

export const IGClipsEdgeSchema = z.object({
	node: z.object({ media: IGMediaNodeSchema }),
});
export type IGClipsEdge = z.infer<typeof IGClipsEdgeSchema>;

export const IGClipsResponseSchema = z.object({
	data: z
		.object({
			xdt_api__v1__clips__home__connection_v2: z
				.object({
					edges: z.array(IGClipsEdgeSchema),
					page_info: z.object({
						has_next_page: z.boolean(),
						end_cursor: z.string().optional(),
					}),
				})
				.optional(),
		})
		.optional(),
});
export type IGClipsResponse = z.infer<typeof IGClipsResponseSchema>;

// ─── Story Response ──────────────────────────────────────────────────────────

export const IGStoryItemSchema = z.object({
	id: z.string(),
	code: z.string(),
	taken_at: z.number(),
	expiring_at: z.number(),
	user: IGUserNodeSchema,
	media_type: z.number(),
	video_versions: z.array(z.object({ url: z.string() })).optional(),
	image_versions2: z
		.object({ candidates: z.array(z.object({ url: z.string() })) })
		.optional(),
});
export type IGStoryItem = z.infer<typeof IGStoryItemSchema>;

export const IGStoryTraySchema = z.object({
	id: z.string(),
	user: IGUserNodeSchema,
	items: z.array(IGStoryItemSchema),
	seen: z.number().optional(),
});
export type IGStoryTray = z.infer<typeof IGStoryTraySchema>;
