# Domain Models & API Schemas

The `igm` type system is split into two layers:
1. **Raw Schemas** (`src/schemas/ig-api.ts`): Shape definitions for Instagram's raw JSON responses. Used for typing API boundaries.
2. **Domain Models** (`src/models/`): Clean, extracted interfaces that power the UI and output exporters. 

## Domain Models

### `timeline.ts`

**`TimelineItem`**
Represents a unified media post (photo, video, carousel, or reel) across feeds, explore, and saved collections.
```typescript
interface TimelineItem {
    id: string;
    username: string;
    full_name: string;
    code: string;           // The shortcode (e.g., Cw_xyz)
    caption: string;
    like_count: number;
    comment_count: number;
    media_urls: string[];   // Extracted underlying asset URLs
    media_type?: number;    // 1=photo, 2=video, 8=carousel
    taken_at?: number;      // Unix timestamp
    location?: string;
    has_liked?: boolean;
    view_count?: number;    // Present on videos/reels
    url: string;            // Reconstructed instagram.com/p/... URL
}
```

**`CommentItem`**
```typescript
interface CommentItem {
    id: string;
    username: string;
    text: string;
    like_count: number;
    created_at?: number;    // Unix timestamp
    reply_count?: number;
}
```

**`StoryItem`**
```typescript
interface StoryItem {
    id: string;
    username: string;
    code: string;
    taken_at: number;       // Unix timestamp
    expiring_at: number;    // Unix timestamp
    media_type: number;     // 1=photo, 2=video
    media_url: string;      // The actual image/video asset link
}
```

### `dm.ts`

**`DMThread`**
Represents a Direct Message conversation.
```typescript
interface DMThread {
    thread_id: string;
    thread_title: string;
    last_message: string;
    users: string[];        // Array of usernames in the thread
}
```

**`DMMessage`**
Represents a single message within a thread.
```typescript
interface DMMessage {
    id: string;
    user_id: string;
    text: string;
    timestamp: number;
}
```

### `user.ts`

**`ProfileInfo`**
Represents a detailed user profile.
```typescript
interface ProfileInfo {
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
```

**`SearchUser`**
Represents a user in a search result.
```typescript
interface SearchUser {
    pk: string;
    username: string;
    full_name: string;
    is_private: boolean;
    is_verified: boolean;
    profile_pic_url: string;
    follower_count?: number;
}
```

**`FriendshipStatus`**
```typescript
interface FriendshipStatus {
    following: boolean;
    followed_by: boolean;
    blocking: boolean;
    muting: boolean;
    is_restricted: boolean;
    incoming_request: boolean;
    outgoing_request: boolean;
}
```

### `notification.ts`

**`NotificationItem`**
```typescript
interface NotificationItem {
    id: string;
    type: number;
    text: string;           // Human readable activity (e.g. "User liked your post")
    timestamp: number;      // Unix timestamp
    user_id?: string;       // ID of the user who triggered the notification
}
```

## Raw API Schemas (`ig-api.ts`)

The raw schemas represent the nested data returned by IG endpoints before extraction via utility mappers like `parseMediaNode()`. Notable schemas include:

- `IGMediaNode`: The massive, nested representation of an IG post including `image_versions2`, `video_versions`, and `carousel_media`.
- `IGUserNode`: Represents user data embedded in other payloads (like comments or threads).
- `IGCommentNode`: Raw comment structures including `child_comment_count`.
- `IGThreadNode`: Complex DM threading state including `read_state` and `muted`.
- `IGDirectItemNode`: Underlying direct message items, supporting raw `reel_share`, `link`, and `media` variants.
- `IGTimelineFeedResponse`: Envelope for timeline grids (`feed_items`).
- `IGExploreResponse`: Envelope for layout contents (`sectional_items`).
- `IGClipsResponse`: GraphQL relay envelope for Reels (`edges`, `page_info`).
