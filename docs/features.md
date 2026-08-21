# Feature Implementation

> Internal documentation for `src/features/`.

---

## § timeline/timeline.ts — Timeline & Post Engagement

The `Timeline` class handles the home feed, comments, and individual post engagement.

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getFeed()` | `TimelineItem[]` | Fetches home timeline via `feed/timeline/` POST |
| `getComments(mediaId)` | `CommentItem[]` | Fetches comments with reply counts and timestamps |
| `addComment(mediaId, text)` | `any` | Posts a comment via `web/comments/` |
| `likePost(mediaId)` | `any` | Likes via `web/likes/.../like/` |
| `unlikePost(mediaId)` | `any` | Unlikes via `web/likes/.../unlike/` |
| `savePost(mediaId)` | `any` | Saves via `web/save/.../save/` |
| `unsavePost(mediaId)` | `any` | Unsaves via `web/save/.../unsave/` |
| `getPostInfo(mediaId)` | `TimelineItem \| null` | Fetches single post details via `media/.../info/` |

All media parsing is delegated to the shared `parseMediaNode()` utility.

---

## § users/profile.ts — User Profiles

The `Profile` class manages user information, feeds, and social relationships.

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getProfile(userId)` | `ProfileInfo` | Fetches user info via `users/.../info/` |
| `getProfileByUsername(username)` | `ProfileInfo` | Fetches via `users/web_profile_info/` GraphQL |
| `getProfileFeed(userId)` | `TimelineItem[]` | Fetches user's post grid |
| `getFriendshipStatus(userId)` | `FriendshipStatus` | Full relationship state via `friendships/show/` |
| `getSavedPosts()` | `TimelineItem[]` | Fetches saved/bookmarked posts |
| `followUser(userId)` | `any` | `friendships/create/` |
| `unfollowUser(userId)` | `any` | `friendships/destroy/` |
| `blockUser(userId)` | `any` | `friendships/block/` |
| `unblockUser(userId)` | `any` | `friendships/unblock/` |
| `restrictUser(userId)` | `any` | `restrict_action/restrict/` |
| `muteUser(userId)` | `any` | `friendships/mute_posts_or_story_from_follow/` |

---

## § users/stories.ts — Stories

The `Stories` class fetches the stories tray and individual user stories.

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getStoryTray()` | `{ id, username, has_unseen }[]` | Fetches active stories list via `feed/reels_tray/` |
| `getUserStories(userId)` | `StoryItem[]` | Fetches a user's current stories |

---

## § explore/explore.ts — Explore Grid

Uses `api/v1/explore/grid/` to fetch the explore page. Iterates `sectional_items` and their `fill_items`/`medias` to extract media nodes.

---

## § reels/reels.ts — Clips (Reels)

Implements direct GraphQL communication using `PolarisClipsTabDesktopContainerQuery` (Doc ID `27067550136266946`). Fetches the same reels feed seen in the web browser.

**Endpoint:** `https://www.instagram.com/graphql/query` (POST)

---

## § dm/dm.ts — Direct Messaging

Handles inbox fetching, thread retrieval, and message broadcasting.

| Method | Description |
|--------|-------------|
| `getInbox()` | Fetches DM inbox threads |
| `getThread(threadId)` | Fetches messages in a thread |
| `sendMessage(threadId, text)` | Sends a text message |
| `unsendAllMessages(threadId)` | Automates unsending all messages using Playwright and IDMU userscript |

---

## § search/search.ts — User Search

Searches users via `web/search/topsearch/` with the `BLENDED` context.

---

## § notifications/notifications.ts — Activity Feed

Fetches notification stories from `news/inbox/`, split into `new_stories` and `old_stories`.

---

## § media/downloader.ts — Media Downloader

Supports single-post and bulk profile downloads.

- **Shortcode Resolution**: Uses `shortcodeToId()` from `utils/parsers.ts` to convert base64-ish shortcodes to numeric IDs.
- **URL Extraction**: Delegates to shared `extractMediaUrls()` from `utils/media.ts`.
- **Streaming**: Uses `axios` response streams piped to `fs.createWriteStream()`.
- **Progress**: Integrated with the `Spinner` for per-file download feedback.
