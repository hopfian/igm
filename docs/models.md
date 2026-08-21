# Models and DTOs (`src/shared/dto/`, `src/modules/*/models/`)

IGM enforces strict type safety boundaries across all network calls. Because Instagram's private `api/v1` endpoints return deeply nested and frequently mutating JSON payloads, IGM uses two layers of type safety:
1. **Zod Runtime Validation**: Schemas in `src/shared/dto/` validate the raw JSON payloads _at runtime_ to ensure Instagram hasn't drastically changed their response shapes.
2. **TypeScript Interfaces**: Models in `src/modules/*/models/` provide the canonical, normalized data structures used throughout the business logic and UI layers.

**Related documentation**: [README.md](README.md) · [modules.md](modules.md)

---

## Zod Runtime Validation Schemas

**Source**: [`src/shared/dto/ig-api.dto.ts`](../src/shared/dto/ig-api.dto.ts)

When the `IGClient` receives a response, it parses the JSON and immediately passes it through the corresponding Zod schema before the service class processes it. If Instagram changes a required field, the Zod schema throws an error immediately rather than causing a silent failure deep in the application logic.

### Base API Response

Every Instagram API response extends this base schema:

```typescript
const IgResponseBaseSchema = z.object({
  status: z.enum(['ok', 'fail']),
  message: z.string().optional(),
});
```

### Key Zod Schemas

| Schema | Validates | Notes |
|--------|-----------|-------|
| `IgLoginResponseSchema` | `web/accounts/login/ajax/` | Handles both successful logins (`authenticated: true`) and 2FA challenges (`two_factor_required`) |
| `IgProfileResponseSchema` | `users/<id>/info/` | Strict validation of the `.user` payload structure |
| `IgTimelineResponseSchema` | `feed/timeline/` | Validates that `feed_items` is an array and each item has a `media_or_ad` property |
| `IgInboxResponseSchema` | `direct_v2/inbox/` | Validates the complex `inbox.threads` payload structure |

---

## Identity Models

**Source**: [`src/modules/identity/models/user.model.ts`](../src/modules/identity/models/user.model.ts) · [`src/modules/identity/models/notification.model.ts`](../src/modules/identity/models/notification.model.ts)

### `ProfileInfo`

The normalized user profile representation, reconciling the differences between `users/<id>/info/` and `users/web_profile_info/`.

```typescript
export interface ProfileInfo {
  id: string;                 // Numeric user ID (e.g. "123456789")
  username: string;
  full_name: string;
  is_private: boolean;
  is_verified: boolean;
  profile_pic_url: string;    // HD profile picture URL
  follower_count: number;
  following_count: number;
  media_count: number;
  biography: string;
  external_url: string | null;
}
```

### `FriendshipStatus`

Represents the bi-directional relationship between the authenticated user and another user.

```typescript
export interface FriendshipStatus {
  following: boolean;         // True if you follow them
  followed_by: boolean;       // True if they follow you
  blocking: boolean;          // True if you blocked them
  muting: boolean;            // True if you muted their posts/stories
  is_private: boolean;        // True if their account is private
  incoming_request: boolean;  // True if they requested to follow you
  outgoing_request: boolean;  // True if you requested to follow them
}
```

### `SearchUser`

Represents a single user in the `web/search/topsearch/` response.

```typescript
export interface SearchUser {
  id: string;
  username: string;
  full_name: string;
  is_private: boolean;
  is_verified: boolean;
  profile_pic_url: string;
  follower_count?: number;    // Search responses often include this
}
```

### `NotificationItem`

Represents a single activity feed item (like, comment, follow, mention).

```typescript
export interface NotificationItem {
  id: string;
  text: string;               // e.g. "user liked your post."
  timestamp: number;          // Unix timestamp in seconds
  profile_pic_url: string;
  user_id: string;            // The ID of the user who triggered the notification
}
```

---

## Timeline Models

**Source**: [`src/modules/timeline/models/timeline.model.ts`](../src/modules/timeline/models/timeline.model.ts)

### `TimelineItem`

The universal media node interface. Represents a Post, Carousel, Reel, or IGTV video. Produced by [`parseMediaNode()`](modules.md#media-extraction-utility).

```typescript
export interface TimelineItem {
  id: string;                 // e.g. "312456789_123456"
  code: string;               // The shortcode (e.g. "CvzQ_1r...") used in instagram.com/p/<code>
  username: string;
  full_name: string;
  caption: string;
  like_count: number;
  comment_count: number;
  view_count?: number;        // Only present for videos/reels (or play_count)
  media_urls: string[];       // All resolved asset URLs (highest res)
  media_type: number;         // 1 = Image, 2 = Video, 8 = Carousel
  taken_at: number;           // Unix timestamp in seconds
  location?: string;          // Location name if tagged
  has_liked?: boolean;        // True if authenticated user liked it
  url: string;                // Computed full web URL
}
```

### `CommentItem`

Represents a single comment on a media item.

```typescript
export interface CommentItem {
  id: string;
  username: string;
  text: string;
  created_at: number;         // Unix timestamp in seconds
  like_count: number;
  reply_count: number;        // Number of threaded child comments
}
```

### `StoryItem`

Represents a single expiring story frame.

```typescript
export interface StoryItem {
  id: string;
  expiring_at: number;        // Unix timestamp in seconds
  media_urls: string[];       // Usually 1 URL (video preferred over image)
  media_type: number;         // 1 = Image, 2 = Video
}
```

---

## Messaging Models

**Source**: [`src/modules/messaging/models/dm.model.ts`](../src/modules/messaging/models/dm.model.ts)

### `DMThread`

Represents a single conversation in the inbox.

```typescript
export interface DMThread {
  thread_id: string;          // Numeric thread ID
  title: string;              // Thread title (fallback to "Untitled")
  users: string[];            // Array of participant usernames
  last_activity: number;      // Unix timestamp in microseconds
  last_message: string;       // Snippet of the latest message
  is_unread: boolean;
  muted: boolean;
}
```

### `DMMessage`

Represents a single message inside a thread.

```typescript
export interface DMMessage {
  id: string;                 // The message item ID
  user_id: string;            // The ID of the sender
  text: string;
  timestamp: number;          // Unix timestamp in microseconds
  item_type: string;          // "text", "media_share", "like", "reel_share", etc.
}
```
