/**
 * Display facade — delegates to domain-specific renderers.
 * Import this single class from commands instead of individual renderers.
 */
import { TimelineItem, CommentItem, DMThread, DMMessage, SearchUser, ProfileInfo, NotificationItem, StoryItem, FriendshipStatus } from '../models';
import { renderTimeline, renderComments } from './renderers/timeline';
import { renderSearchResults, renderProfile, renderFriendship } from './renderers/user';
import { renderInbox, renderThread } from './renderers/dm';
import { renderNotifications, renderStoryTray, renderStories, renderSavedPosts } from './renderers/misc';

export class Display {
    static printTimeline(items: TimelineItem[]) { renderTimeline(items); }
    static printComments(comments: CommentItem[]) { renderComments(comments); }
    static printInbox(threads: DMThread[]) { renderInbox(threads); }
    static printThread(messages: DMMessage[]) { renderThread(messages); }
    static printSearchResults(users: SearchUser[]) { renderSearchResults(users); }
    static printProfile(profile: ProfileInfo) { renderProfile(profile); }
    static printFriendship(status: FriendshipStatus, username: string) { renderFriendship(status, username); }
    static printNotifications(newItems: NotificationItem[], oldItems: NotificationItem[]) { renderNotifications(newItems, oldItems); }
    static printStoryTray(tray: { id: string; username: string; has_unseen: boolean }[]) { renderStoryTray(tray); }
    static printStories(items: StoryItem[]) { renderStories(items); }
    static printSavedPosts(items: TimelineItem[]) { renderSavedPosts(items); }
}
