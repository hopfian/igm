# Business Domains (`src/modules/`)

IGM's architecture is built on a Domain-Driven Design (DDD) module system. Each specific feature of Instagram is heavily encapsulated within its own module, containing its specific API Service wrappers, TypeScript interfaces (`models/`), and CLI render logic (`ui/`).

## `identity/` Module
Wraps user-centric and account-status endpoints.
- **`services/profile.service.ts`**: Implements endpoints for `users/:id/info/`, `users/web_profile_info/`, `friendships/show/`, and handles following/blocking routines. Maps raw JSON blobs into the strict `ProfileInfo` interface.
- **`services/search.service.ts`**: Implements the `users/search/` endpoint.
- **`services/stories.service.ts` & `notifications.service.ts`**: Handle story tray loading and activity feed parsing.
- **`models/user.model.ts`**: Defines the `ProfileInfo`, `FriendshipStatus`, and `TimelineItem` shapes used by the renderers.

## `messaging/` Module
Wraps Instagram Direct (IGDM) APIs.
- **`services/messaging.service.ts`**: Interacts with the `direct_v2/inbox/` and `direct_v2/threads/` REST endpoints. It implements `getInbox(cursor)`, `getThread(threadId, cursor)`, and the standard HTTP-based `unsendMessage(threadId, itemId)`. 
- **`services/automation/`**: Contains the **IDMU Subsystem** (Detailed in `automation.md`) for completely evading the severe rate-limits of the `unsendMessage` API.

## `timeline/` Module
Handles content aggregation and feed discovery.
- **`services/timeline.service.ts`**: Fetches the authenticated user's home feed (`feed/timeline/`).
- **`services/explore.service.ts` & `services/reels.service.ts`**: Fetch explore grids and global reel streams.
- **`utils/media-extractor.ts`**: A critical utility script that recursively parses the highly obfuscated timeline `media` nodes. Instagram randomly nests image resolutions inside `image_versions2.candidates` or `carousel_media`. This utility flattens them into a normalized `TimelineItem` interface.

## `media-sync/` Module
- **`services/downloader.service.ts`**: Provides parallel, concurrent asset downloading. It parses the normalized `TimelineItem` arrays, extracts the highest-resolution URLs, and streams them locally via standard `fs.createWriteStream` pipes, while handling edge-case HTTP errors on Instagram's CDNs.
