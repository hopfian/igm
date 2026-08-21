// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/utils.md (§ media.ts — Media Extraction)
//     If extraction logic or function signatures change, update the method tables.
import type { TimelineItem } from "../models/timeline.model";

/**
 * Extract all media URLs from a single media node (handles carousel, video, image).
 */
export function extractMediaUrls(media: any): string[] {
	const urls: string[] = [];

	if (media.carousel_media) {
		for (const item of media.carousel_media) {
			if (item.video_versions?.length > 0) {
				urls.push(item.video_versions[0].url);
			} else if (item.image_versions2?.candidates?.length > 0) {
				urls.push(item.image_versions2.candidates[0].url);
			}
		}
	} else {
		if (media.video_versions?.length > 0) {
			urls.push(media.video_versions[0].url);
		} else if (media.image_versions2?.candidates?.length > 0) {
			urls.push(media.image_versions2.candidates[0].url);
		}
	}

	return urls;
}

/**
 * Parse a raw IG media node into a TimelineItem.
 */
export function parseMediaNode(media: any): TimelineItem | null {
	if (!media) return null;
	const user = media.user || {};
	const caption = media.caption || {};

	return {
		id: media.id,
		username: user.username || "unknown",
		full_name: user.full_name || "",
		code: media.code || "",
		caption: caption.text || "",
		like_count: media.like_count || 0,
		comment_count: media.comment_count || 0,
		media_urls: extractMediaUrls(media),
		media_type: media.media_type,
		taken_at: media.taken_at,
		location: media.location?.name,
		has_liked: media.has_liked,
		view_count: media.view_count || media.play_count,
		url: `https://www.instagram.com/p/${media.code}/`,
	};
}
