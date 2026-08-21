/**
 * Instagram API response schemas for runtime validation.
 * These define the expected shapes of raw IG API responses
 * before they are parsed into our domain models.
 */

// ─── Media Schema ────────────────────────────────────────────────────────────

export interface IGMediaNode {
    id: string;
    code: string;
    media_type: number; // 1=photo, 2=video, 8=carousel
    user: IGUserNode;
    caption?: { text: string; created_at?: number };
    like_count?: number;
    comment_count?: number;
    taken_at?: number;
    video_versions?: { url: string; width: number; height: number }[];
    image_versions2?: { candidates: { url: string; width: number; height: number }[] };
    carousel_media?: IGMediaNode[];
    location?: { name: string; pk: string };
    has_liked?: boolean;
    has_saved?: boolean;
    view_count?: number;
    play_count?: number;
}

// ─── User Schema ─────────────────────────────────────────────────────────────

// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/models.md (§ schemas/ig-api.ts)
//     If API payload shapes change, update the interface descriptions.
export interface IGUserNode {
    pk: string;
    username: string;
    full_name: string;
    is_private: boolean;
    is_verified: boolean;
    profile_pic_url: string;
    biography?: string;
    external_url?: string;
    follower_count?: number;
    following_count?: number;
    media_count?: number;
    mutual_followers_count?: number;
    category?: string;
    show_account_transparency_details?: boolean;
}

// ─── Comment Schema ──────────────────────────────────────────────────────────

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

export interface IGThreadNode {
    thread_id: string;
    thread_title: string;
    thread_type: string;
    users: IGUserNode[];
    last_permanent_item?: {
        text?: string;
        item_type: string;
        timestamp: string;
        user_id: string;
    };
    is_group: boolean;
    muted: boolean;
    read_state: number;
}

export interface IGDirectItemNode {
    item_id: string;
    user_id: string;
    timestamp: string;
    item_type: string;
    text?: string;
    media?: IGMediaNode;
    link?: { text: string; link_context: { link_url: string } };
    reel_share?: { text: string; media: IGMediaNode };
}

// ─── Notification Schema ─────────────────────────────────────────────────────

export interface IGNotificationNode {
    pk: string;
    type: number;
    args: {
        text: string;
        timestamp: number;
        links?: { id: string; type: string }[];
        profile_image?: string;
        media?: { id: string; image: string }[];
    };
}

// ─── Timeline Feed Response ──────────────────────────────────────────────────

export interface IGTimelineFeedResponse {
    feed_items: { media_or_ad?: IGMediaNode }[];
    next_max_id?: string;
    more_available?: boolean;
    status: string;
}

// ─── Explore Response ────────────────────────────────────────────────────────

export interface IGExploreResponse {
    sectional_items: {
        layout_type: string;
        layout_content: {
            fill_items?: { media: IGMediaNode }[];
            medias?: { media: IGMediaNode }[];
        };
    }[];
    next_max_id?: string;
    more_available?: boolean;
    status: string;
}

// ─── Clips (Reels) GraphQL Response ──────────────────────────────────────────

export interface IGClipsEdge {
    node: { media: IGMediaNode };
}

export interface IGClipsResponse {
    data: {
        xdt_api__v1__clips__home__connection_v2?: {
            edges: IGClipsEdge[];
            page_info: { has_next_page: boolean; end_cursor: string };
        };
    };
}

// ─── Story Response ──────────────────────────────────────────────────────────

export interface IGStoryItem {
    id: string;
    code: string;
    taken_at: number;
    expiring_at: number;
    user: IGUserNode;
    media_type: number;
    video_versions?: { url: string }[];
    image_versions2?: { candidates: { url: string }[] };
}

export interface IGStoryTray {
    id: string;
    user: IGUserNode;
    items: IGStoryItem[];
    seen?: number;
}
