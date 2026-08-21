# Features API

The `src/features/` module implements the core business logic of `igm`, interacting with Instagram's internal APIs (REST and GraphQL) via the `IGClient`.

## Timeline & Feed (`src/features/timeline/timeline.ts`)

Manages timeline fetching, interactions (like/save), and comments.

| Method | HTTP | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| `getFeed()` | POST | `feed/timeline/` | Fetches the user's home timeline feed. Sets `is_prefetch` and `is_pull_to_refresh` to `0`. |
| `getComments(mediaId)` | GET | `media/${mediaId}/comments/` | Retrieves top-level comments for a specific post. |
| `addComment(mediaId, text)` | POST | `web/comments/${mediaId}/add/` | Posts a new comment using `comment_text`. |
| `likePost(mediaId)` | POST | `web/likes/${mediaId}/like/` | Likes a post (requires `d=0` param). |
| `unlikePost(mediaId)` | POST | `web/likes/${mediaId}/unlike/` | Unlikes a post (requires `d=0` param). |
| `savePost(mediaId)` | POST | `web/save/${mediaId}/save/` | Saves a post to bookmarks. |
| `unsavePost(mediaId)` | POST | `web/save/${mediaId}/unsave/` | Removes a post from bookmarks. |
| `getPostInfo(mediaId)` | GET | `media/${mediaId}/info/` | Retrieves detailed information for a single post. |

## Direct Messaging (`src/features/dm/dm.ts`)

Handles DM inboxes, threading, and the Playwright automation bridge for mass unsending.

| Method | HTTP | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| `getInbox()` | GET | `direct_v2/inbox/` | Retrieves active DM threads. |
| `getThread(threadId)` | GET | `direct_v2/threads/${threadId}/` | Retrieves messages for a specific thread. |
| `sendMessage(threadId, text)` | POST | `direct_v2/threads/broadcast/text/` | Sends a text message to a thread. |
| `deleteMessage(threadId, itemId)`| POST | `direct_v2/threads/${threadId}/items/${itemId}/delete/` | Unsends a single message. |

### Playwright Automation (`unsendPlaywright.ts`)
The `unsendAllMessages(threadId, config: UnsendConfig)` method spawns a Playwright Chromium instance to execute a headless, in-browser userscript (IDMU) to rapidly unsend messages while evading rate limits.

**UnsendConfig Options:**
- `headless`: Run in headless mode (default `true`).
- `slowMo`: Delay in ms between Playwright operations (default `0`).
- `delayMs`: Wait time between unsending individual messages (default `1000`).
- `maxFailures`: Stop after `n` consecutive rate limits (default `5`).
- `onProgress`: Callback to pipe bidirectional RPC logs (`onIDMUStatus`) to the CLI.

## Explore (`src/features/explore/explore.ts`)

| Method | HTTP | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| `getExploreFeed()` | GET | `explore/grid/` | Fetches grid items from the explore page. Parses `layout_content.fill_items` and `layout_content.medias`. |

## Media Downloader (`src/features/media/downloader.ts`)

Orchestrates downloading assets to disk via `axios` and filesystem streams.

| Method | Description |
| :--- | :--- |
| `downloadPost(input, dir)` | Resolves a shortcode/ID, fetches media info, and streams files (MP4/JPG) to the specified directory. |
| `downloadProfile(userId, dir)`| Fetches the user's entire feed via `Profile.getProfileFeed` and downloads all media concurrently. |

## Notifications (`src/features/notifications/notifications.ts`)

| Method | HTTP | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| `getNotifications()` | GET | `news/inbox/` | Fetches the notification feed. Separates the response into `new_stories` (unread) and `old_stories` (read). |

## Reels (`src/features/reels/reels.ts`)

| Method | HTTP | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| `getGlobalReels()` | POST | `graphql/query` | Submits GraphQL query `27067550136266946` for the Reels (`clips_tab`) feed. |

## Search (`src/features/search/search.ts`)

| Method | HTTP | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| `searchUsers(query)` | GET | `web/search/topsearch/` | Performs a blended search query and extracts user nodes. |

## Users & Profiles (`src/features/users/profile.ts`)

Manages user data, relationships (following/blocking), and feed extraction.

| Method | HTTP | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| `getProfile(userId)` | GET | `users/${userId}/info/` | Fetches a user profile by internal ID. |
| `getProfileByUsername(user)`| GET | `users/web_profile_info/` | Fetches a user profile by string handle. |
| `getProfileFeed(userId)` | GET | `feed/user/${userId}/` | Retrieves the chronological post feed for a user. |
| `getFriendshipStatus(user)` | GET | `friendships/show/${userId}/`| Retrieves following/followed_by state and request status. |
| `followUser(userId)` | POST | `friendships/create/${userId}/`| Follows a user. |
| `unfollowUser(userId)` | POST | `friendships/destroy/${userId}/`| Unfollows a user. |
| `blockUser(userId)` | POST | `friendships/block/${userId}/` | Blocks a user. |
| `unblockUser(userId)` | POST | `friendships/unblock/${userId}/`| Unblocks a user. |
| `restrictUser(userId)` | POST | `restrict_action/restrict/` | Restricts a user (uses `target_user_id`). |
| `muteUser(userId)` | POST | `friendships/mute_posts_or.../`| Mutes posts and stories from a user. |
| `getSavedPosts()` | GET | `feed/saved/posts/` | Retrieves the authenticated user's saved/bookmarked posts. |

## Stories (`src/features/users/stories.ts`)

| Method | HTTP | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| `getStoryTray()` | GET | `feed/reels_tray/` | Retrieves the top story tray (users with active stories). Determines `has_unseen` by comparing `seen` with `latest_reel_media`. |
| `getUserStories(userId)` | GET | `feed/user/${userId}/story/`| Fetches the active story segments for a specific user ID. |
