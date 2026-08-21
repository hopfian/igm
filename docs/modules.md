# Business Domains (`src/modules/`)

IGM's business logic is highly encapsulated. Each feature area of Instagram is broken down into an isolated Domain Module. Each module is strictly structured to contain its own `models/`, `services/`, and `ui/` (CLI Renderers).

## Auth Module (`src/modules/auth/`)
Handles explicit authentication flows, such as validating raw cookies against the internal API, forcing rollout synchronization, and handling Session IDs.

## Identity Module (`src/modules/identity/`)
Responsible for all user-centric APIs.
- **Models**: `user.model.ts`, `notification.model.ts`
- **Services**: `profile.service.ts`, `search.service.ts`, `stories.service.ts`, `notifications.service.ts`
- **Renderers**: Formats follower counts, renders user bios in terminal-cards, and renders the notifications list.

## Media-Sync Module (`src/modules/media-sync/`)
Responsible for batch downloading and local synchronization of media assets.
- **Services**: `downloader.service.ts` handles multi-threaded concurrency for downloading images, videos, and carousels, parsing the raw CDN URLs into local binaries safely.

## Messaging Module (`src/modules/messaging/`)
Handles the Instagram Direct Message (IGDM) APIs.
- **Models**: `dm.model.ts` (Threads, Messages, Items).
- **Services**: `messaging.service.ts` wraps the standard REST APIs for fetching thread pages, sending text, and API-based single unsending.
- **Automation**: Contains the advanced [IDMU Playwright subsystem](automation.md) for bulk unsending.

## Timeline Module (`src/modules/timeline/`)
Handles content discovery and feed aggregation.
- **Models**: `timeline.model.ts` (Posts, Reels, Medias).
- **Services**: `timeline.service.ts` (Home Feed), `explore.service.ts` (Explore Grid), `reels.service.ts` (Global Reels).
- **Utils**: `media-extractor.ts` extracts raw resolution assets from complex timeline JSON blobs.
