# Business Domain Modules (`src/modules/`)

IGM follows a strict Domain-Driven Design (DDD) module structure. Each module encapsulates a specific Instagram feature area with its own `models/` (TypeScript interfaces), `services/` (API wrappers), and `ui/` (CLI renderers). Modules may depend on each other's services (e.g. `media-sync` imports `identity`'s `Profile` service for feed fetching), but never on each other's internal state.

**Related documentation**: [README.md](README.md) · [cli.md](cli.md) · [core.md § IGClient](core.md#igclient-class) · [models.md](models.md) · [automation.md](automation.md) · [shared.md](shared.md)

---

## Auth Module

**Source**: [`src/modules/auth/services/auth.service.ts`](../src/modules/auth/services/auth.service.ts)

The auth module handles explicit login flows. It is the only module that does NOT use cookies for authentication — instead, it performs the full Instagram login ceremony to _generate_ cookies.

### `AuthService` Class

| Method | API Endpoint | HTTP | Description |
|--------|-------------|------|-------------|
| `preLogin()` | `https://www.instagram.com/` | GET | Fetches the Instagram homepage to populate the initial CSRF token and session cookies in the `IGClient` instance |
| `login(username, password)` | `web/accounts/login/ajax/` | POST | Submits the login form. Password is encoded as `#PWD_INSTAGRAM_BROWSER:0:<unix_timestamp>:<raw_password>`. Returns either a success payload or a `two_factor_required` payload |
| `submit2FA(username, identifier, code)` | `web/accounts/login/ajax/two_factor/` | POST | Submits the 2FA verification code using the `two_factor_identifier` from the login response |

The `#PWD_INSTAGRAM_BROWSER:0` prefix is Instagram's password encoding scheme. The `0` indicates plaintext (no client-side encryption). Instagram's web client uses `10` for encrypted passwords, but the plaintext mode is accepted and avoids the need to implement Instagram's proprietary encryption.

---

## Identity Module

**Source**: [`src/modules/identity/`](../src/modules/identity/)

Wraps all user-centric Instagram endpoints: profile lookups, friendship management, user search, story feeds, and activity notifications.

### Models

**Files**: [`user.model.ts`](../src/modules/identity/models/user.model.ts) · [`notification.model.ts`](../src/modules/identity/models/notification.model.ts)

See [models.md § Identity Models](models.md#identity-models) for the complete field-level documentation of `ProfileInfo`, `FriendshipStatus`, `SearchUser`, and `NotificationItem`.

### `Profile` Service

**Source**: [`src/modules/identity/services/profile.service.ts`](../src/modules/identity/services/profile.service.ts)

| Method | API Endpoint | HTTP | Returns | Notes |
|--------|-------------|------|---------|-------|
| `getProfile(userId)` | `users/<userId>/info/` | GET | `ProfileInfo` | Numeric user ID only |
| `getProfileByUsername(username)` | `users/web_profile_info/?username=<username>` | GET | `ProfileInfo` | Handles GraphQL-style `edge_followed_by` response shape |
| `getProfileFeed(userId)` | `feed/user/<userId>/` | GET | `TimelineItem[]` | Each media node parsed via [`parseMediaNode()`](modules.md#media-extraction-utility) |
| `getFriendshipStatus(userId)` | `friendships/show/<userId>/` | GET | `FriendshipStatus` | See [models.md](models.md#friendshipstatus) |
| `followUser(userId)` | `friendships/create/<userId>/` | POST | `any` | |
| `unfollowUser(userId)` | `friendships/destroy/<userId>/` | POST | `any` | |
| `blockUser(userId)` | `friendships/block/<userId>/` | POST | `any` | |
| `unblockUser(userId)` | `friendships/unblock/<userId>/` | POST | `any` | |
| `restrictUser(userId)` | `restrict_action/restrict/` | POST | `any` | Body: `{ target_user_id: userId }` |
| `muteUser(userId)` | `friendships/mute_posts_or_story_from_follow/` | POST | `any` | Body: `{ target_posts_author_id, target_reel_author_id }` |
| `getSavedPosts()` | `feed/saved/posts/` | GET | `TimelineItem[]` | Each item unwrapped from `item.media` before parsing |

**Dual Profile Resolution**: The `getProfileByUsername()` method handles a different API response shape than `getProfile()`. The web profile endpoint returns data nested under `response.data.user` with GraphQL-style fields like `edge_followed_by.count` instead of `follower_count`, and `edge_owner_to_timeline_media.count` instead of `media_count`. The `getProfile()` endpoint returns a flat `response.user` object. The `Profile` class normalizes both into the same `ProfileInfo` interface.

### `Search` Service

**Source**: [`src/modules/identity/services/search.service.ts`](../src/modules/identity/services/search.service.ts)

| Method | API Endpoint | HTTP | Returns |
|--------|-------------|------|---------|
| `searchUsers(query)` | `web/search/topsearch/?query=<query>&context=blended` | GET | `SearchUser[]` |

The API response contains `response.users[]`, where each entry wraps the user in a `.user` subfield. The service maps through both levels: `(response.users || []).map(u => u.user || u)`.

### `Stories` Service

**Source**: [`src/modules/identity/services/stories.service.ts`](../src/modules/identity/services/stories.service.ts)

| Method | API Endpoint | HTTP | Returns |
|--------|-------------|------|---------|
| `getStoryTray()` | `feed/reels_tray/` | GET | `{ id, username, has_unseen }[]` |
| `getUserStories(userId)` | `feed/user/<userId>/story/` | GET | `StoryItem[]` |

The `has_unseen` flag is computed by comparing `tray.seen` (last seen timestamp) against `tray.latest_reel_media` (latest story timestamp). If `seen < latest_reel_media`, the user has unseen stories.

Media URL extraction in `getUserStories()` prioritizes `video_versions[0].url` over `image_versions2.candidates[0].url` — video stories take precedence.

### `Notifications` Service

**Source**: [`src/modules/identity/services/notifications.service.ts`](../src/modules/identity/services/notifications.service.ts)

| Method | API Endpoint | HTTP | Returns |
|--------|-------------|------|---------|
| `getNotifications()` | `news/inbox/` | GET | `{ new_stories: NotificationItem[], old_stories: NotificationItem[] }` |

The API response contains two arrays: `new_stories` (unread) and `old_stories` (previously seen). Each notification is parsed from the raw `args` subfield: `text` from `args.text`, `timestamp` from `args.timestamp`, `user_id` from `args.links[0].id`.

### Renderers

**Files**: [`identity.renderer.ts`](../src/modules/identity/ui/identity.renderer.ts) · [`notifications.renderer.ts`](../src/modules/identity/ui/notifications.renderer.ts)

| Function | Input | Output |
|----------|-------|--------|
| `renderSearchResults(users: SearchUser[])` | Array of search results | Formatted list with usernames, verification badges, privacy indicators, follower counts |
| `renderProfile(profile: ProfileInfo)` | Single profile | Box-drawn [`Card`](shared.md#card-component) with name, ID, follower/following/post stats, bio, external URL |
| `renderFriendship(status, username)` | Friendship status object | Checklist of relationship flags (following, followed_by, blocking, muting, etc.) |
| `renderNotifications(new, old)` | Two arrays of notifications | Chronological list with timestamps via `timeAgo()` |
| `renderStoryTray(tray)` | Array of story tray entries | List with `●`/`○` unseen indicators |
| `renderStories(items: StoryItem[])` | Array of story items | List with media type icons, timestamps, expiry countdown, media URLs |
| `renderSavedPosts(items: TimelineItem[])` | Array of saved posts | Delegates to `renderTimeline()` from the timeline module |

---

## Messaging Module

**Source**: [`src/modules/messaging/`](../src/modules/messaging/)

Wraps Instagram Direct Messaging (IGDM) APIs and contains the IDMU automation subsystem.

### Models

**File**: [`dm.model.ts`](../src/modules/messaging/models/dm.model.ts)

See [models.md § Messaging Models](models.md#messaging-models) for `DMThread` and `DMMessage`.

### `DirectMessaging` Service

**Source**: [`src/modules/messaging/services/messaging.service.ts`](../src/modules/messaging/services/messaging.service.ts)

| Method | API Endpoint | HTTP | Returns | Notes |
|--------|-------------|------|---------|-------|
| `getInbox()` | `direct_v2/inbox/` | GET | `DMThread[]` | Maps `response.inbox.threads[]` |
| `getThread(threadId)` | `direct_v2/threads/<threadId>/` | GET | `DMMessage[]` | Maps `response.thread.items[]` |
| `sendMessage(threadId, text)` | `direct_v2/threads/broadcast/text/` | POST | `any` | Body: `{ text, thread_ids: "[threadId]" }` |
| `deleteMessage(threadId, itemId)` | `direct_v2/threads/<threadId>/items/<itemId>/delete/` | POST | `any` | Single message deletion via API |
| `unsendAllMessages(threadId, config?)` | — | — | `number` | Delegates to [`runUnsendPlaywright()`](automation.md) |

**Thread mapping**: The `getInbox()` method extracts `thread_title` (falls back to `"Untitled"`), `last_message` from `last_permanent_item.text` (falls back to `"[Media/Other]"`), and `users` as an array of usernames.

**Important distinction**: `deleteMessage()` uses the standard REST API and is subject to aggressive rate limiting. `unsendAllMessages()` bypasses the API entirely by delegating to the [IDMU Playwright automation subsystem](automation.md), which manipulates the DOM inside a headless browser.

### Renderer

**File**: [`messaging.renderer.ts`](../src/modules/messaging/ui/messaging.renderer.ts)

| Function | Description |
|----------|-------------|
| `renderInbox(threads: DMThread[])` | Lists conversations with title, thread ID, and last message preview |
| `renderThread(messages: DMMessage[])` | Lists messages with user ID prefix and text |

---

## Timeline Module

**Source**: [`src/modules/timeline/`](../src/modules/timeline/)

Handles content discovery across Instagram's three primary feed surfaces: Home Timeline, Explore Grid, and Global Reels.

### Models

**File**: [`timeline.model.ts`](../src/modules/timeline/models/timeline.model.ts)

See [models.md § Timeline Models](models.md#timeline-models) for `TimelineItem`, `CommentItem`, and `StoryItem`.

### `Timeline` Service

**Source**: [`src/modules/timeline/services/timeline.service.ts`](../src/modules/timeline/services/timeline.service.ts)

| Method | API Endpoint | HTTP | Returns |
|--------|-------------|------|---------|
| `getFeed()` | `feed/timeline/` | POST | `TimelineItem[]` |
| `getComments(mediaId)` | `media/<mediaId>/comments/` | GET | `CommentItem[]` |
| `addComment(mediaId, text)` | `web/comments/<mediaId>/add/` | POST | `any` |
| `likePost(mediaId)` | `web/likes/<mediaId>/like/` | POST | `any` |
| `unlikePost(mediaId)` | `web/likes/<mediaId>/unlike/` | POST | `any` |
| `savePost(mediaId)` | `web/save/<mediaId>/save/` | POST | `any` |
| `unsavePost(mediaId)` | `web/save/<mediaId>/unsave/` | POST | `any` |
| `getPostInfo(mediaId)` | `media/<mediaId>/info/` | GET | `TimelineItem \| null` |

**Feed POST body**: `getFeed()` sends `{ is_prefetch: "0", is_pull_to_refresh: "0" }` to simulate a standard feed load (not a background prefetch or pull-to-refresh). The response contains `feed_items[]` where each item has a `media_or_ad` field (or `explore_story.media_or_ad` for explore items).

**Comment parsing**: Maps raw comment nodes into `CommentItem` with `id` from `c.pk || c.id`, `username` from `c.user.username`, `like_count` from `c.comment_like_count`, and `reply_count` from `c.child_comment_count`.

### `Explore` Service

**Source**: [`src/modules/timeline/services/explore.service.ts`](../src/modules/timeline/services/explore.service.ts)

| Method | API Endpoint | HTTP | Returns |
|--------|-------------|------|---------|
| `getExploreFeed()` | `discover/web/explore_grid/` | GET | `TimelineItem[]` |

The explore API response has a deeply nested structure: `response.sectional_items[].layout_content.fill_items[] || .medias[]`. Each item contains a `.media` subfield that is parsed via `parseMediaNode()`.

### `Reels` Service

**Source**: [`src/modules/timeline/services/reels.service.ts`](../src/modules/timeline/services/reels.service.ts)

| Method | API Endpoint | HTTP | Returns |
|--------|-------------|------|---------|
| `getGlobalReels()` | `https://www.instagram.com/graphql/query` | POST | `TimelineItem[]` |

Unlike other endpoints, Reels uses Instagram's **GraphQL** endpoint instead of `api/v1`. The request sends:
- `doc_id`: `"27067550136266946"` (the `PolarisClipsTabDesktopContainerQuery` document ID)
- `variables`: `JSON.stringify({ data: { tab_type: "clips_tab" } })`

The response path is `res.data.xdt_api__v1__clips__home__connection_v2.edges[].node.media`.

### Media Extraction Utility

**Source**: [`src/modules/timeline/utils/media-extractor.ts`](../src/modules/timeline/utils/media-extractor.ts)

This is the central normalization layer for all Instagram media data. Every service that touches media nodes (Timeline, Explore, Reels, Profile, Saved Posts, Downloads) routes through these functions.

#### `extractMediaUrls(media: any): string[]`

Extracts all media asset URLs from a raw Instagram media node. Handles three media types:

1. **Carousel** (`media.carousel_media`): Iterates each carousel item, extracting `video_versions[0].url` (if video) or `image_versions2.candidates[0].url` (if image).
2. **Video**: Extracts `media.video_versions[0].url`.
3. **Image**: Extracts `media.image_versions2.candidates[0].url`.

Instagram always returns `candidates` sorted by resolution descending, so `[0]` is always the highest-resolution version.

#### `parseMediaNode(media: any): TimelineItem | null`

Converts a raw Instagram media JSON node into the normalized `TimelineItem` interface:

| Output Field | Source Path | Fallback |
|-------------|-------------|----------|
| `id` | `media.id` | — |
| `username` | `media.user.username` | `"unknown"` |
| `full_name` | `media.user.full_name` | `""` |
| `code` | `media.code` | `""` |
| `caption` | `media.caption.text` | `""` |
| `like_count` | `media.like_count` | `0` |
| `comment_count` | `media.comment_count` | `0` |
| `media_urls` | `extractMediaUrls(media)` | `[]` |
| `media_type` | `media.media_type` | — |
| `taken_at` | `media.taken_at` | — |
| `location` | `media.location.name` | — |
| `has_liked` | `media.has_liked` | — |
| `view_count` | `media.view_count \|\| media.play_count` | — |
| `url` | Constructed: `https://www.instagram.com/p/<code>/` | — |

### Renderer

**File**: [`timeline.renderer.ts`](../src/modules/timeline/ui/timeline.renderer.ts)

| Function | Description |
|----------|-------------|
| `renderTimeline(items: TimelineItem[])` | Renders each post as a box-drawn [`Card`](shared.md#card-component) with title bar (`@user · 2h ago · 🎬 Video`), caption, location, media URLs, and stats line (likes, comments, views) |
| `renderComments(comments: CommentItem[])` | Renders each comment with `@username · time ago`, text, like count, and reply count |

---

## Media-Sync Module

**Source**: [`src/modules/media-sync/services/downloader.service.ts`](../src/modules/media-sync/services/downloader.service.ts)

Handles downloading and local persistence of Instagram media assets.

### `Downloader` Service

| Method | Description |
|--------|-------------|
| `downloadPost(input, outputDir)` | Resolves `input` to a media ID, fetches `media/<id>/info/`, extracts URLs via `extractMediaUrls()`, downloads each asset |
| `downloadProfile(userId, outputDir)` | Fetches the user's feed via `Profile.getProfileFeed()`, iterates each post, downloads all media assets into a subdirectory named by user ID |

#### `resolveMediaId(input: string): string`

Accepts three input formats:
1. **Numeric ID** (15+ digits): Returned as-is.
2. **Shortcode**: Extracted from URLs via `sanitizeInput()`, then converted to a numeric ID via `shortcodeToId()`.
3. **Full URL**: e.g. `https://www.instagram.com/p/ABC123/` — the shortcode is extracted and converted.

#### `downloadFile(url, filepath): Promise<void>`

Uses `axios` in stream mode (`responseType: "stream"`) and pipes the response to `fs.createWriteStream()`. The file extension is determined by checking if the URL contains `.mp4` (video) or defaults to `.jpg` (image). Files are named `<username>_<code>_<index>.<ext>`.
