# Models & Schemas

> Internal documentation for `src/models/` and `src/schemas/`.

---

## Domain Models (`src/models/`)

These are the app-internal interfaces used by features, commands, and renderers.

### § timeline.ts — TimelineItem

```typescript
interface TimelineItem {
    id: string;
    username: string;
    full_name: string;
    code: string;              // Shortcode (e.g., "DTDUsxNAeT_")
    caption: string;
    like_count: number;
    comment_count: number;
    media_urls: string[];      // All media URLs (carousel expanded)
    media_type?: number;       // 1=Photo, 2=Video, 8=Carousel
    taken_at?: number;         // Unix timestamp
    location?: string;         // Location name
    has_liked?: boolean;
    view_count?: number;       // Video/reel views
    url: string;               // https://instagram.com/p/<code>/
}
```

### § timeline.ts — CommentItem

```typescript
interface CommentItem {
    id: string;
    username: string;
    text: string;
    like_count: number;
    created_at?: number;       // Unix timestamp
    reply_count?: number;
}
```

### § timeline.ts — StoryItem

```typescript
interface StoryItem {
    id: string;
    username: string;
    code: string;
    taken_at: number;
    expiring_at: number;
    media_type: number;
    media_url: string;
}
```

### § user.ts — ProfileInfo

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

### § user.ts — SearchUser

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

### § user.ts — FriendshipStatus

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

### § dm.ts — DMThread & DMMessage

```typescript
interface DMThread {
    thread_id: string;
    thread_title: string;
    last_message: string;
}

interface DMMessage {
    item_id: string;
    user_id: string;
    text: string;
    timestamp: string;
}
```

### § notification.ts — NotificationItem

```typescript
interface NotificationItem {
    id: string;
    text: string;
    timestamp: number;
    type: string;
}
```

---

## API Schemas (`src/schemas/ig-api.ts`)

Raw Instagram API response interfaces. These represent the **wire format** before parsing into domain models.

### Key Interfaces

| Interface | Description |
|-----------|-------------|
| `IGMediaNode` | Raw media object (photo/video/carousel) |
| `IGUserNode` | Raw user profile node |
| `IGCommentNode` | Raw comment with child comments |
| `IGThreadNode` | Raw DM thread with participants |
| `IGDirectItemNode` | Raw DM message (text/media/link/reel_share) |
| `IGNotificationNode` | Raw notification with args |
| `IGTimelineFeedResponse` | Feed response with pagination |
| `IGExploreResponse` | Explore grid with sectional items |
| `IGClipsResponse` | GraphQL reels response with edges |
| `IGStoryItem` / `IGStoryTray` | Story media and tray |

These schemas serve as documentation and type-safety contracts for future Zod validation.
