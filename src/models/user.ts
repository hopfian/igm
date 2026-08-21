export interface SearchUser {
    pk: string;
    username: string;
    full_name: string;
    is_private: boolean;
    is_verified: boolean;
    profile_pic_url: string;
    follower_count?: number;
}

// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/models.md (§ user.ts)
//     If fields are added/removed from ProfileInfo, SearchUser, or FriendshipStatus, update the docs AND csv schemas in docs/ui.md.
export interface ProfileInfo {
    id: string;
    username: string;
    full_name: string;
    biography: string;
    external_url: string;
    follower_count: number;
    following_count: number;
    media_count: number;
    is_private: boolean;
    is_verified: boolean;
    category?: string;
    mutual_followers_count?: number;
    show_account_transparency_details: boolean;
}

export interface FriendshipStatus {
    following: boolean;
    followed_by: boolean;
    blocking: boolean;
    muting: boolean;
    is_restricted: boolean;
    incoming_request: boolean;
    outgoing_request: boolean;
}
