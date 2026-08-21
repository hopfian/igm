import { NotificationItem, StoryItem, TimelineItem } from '../../models';
import { Theme } from '../theme';
import { renderTimeline } from './timeline';
import { timeAgo } from '../../utils/parsers';
import chalk from 'chalk';

export function renderNotifications(newItems: NotificationItem[], oldItems: NotificationItem[]): void {
    console.log(Theme.primary(`\n${Theme.symbols.notification} NOTIFICATIONS\n`));

    if (newItems.length > 0) {
        console.log(Theme.success(`  [ NEW · ${newItems.length} ]`));
        newItems.forEach(item => {
            const time = chalk.dim(timeAgo(item.timestamp));
            console.log(`  ${time}  ${item.text}`);
        });
        console.log();
    }

    if (oldItems.length > 0) {
        console.log(Theme.gray(`  [ EARLIER · ${oldItems.length} ]`));
        oldItems.forEach(item => {
            const time = chalk.dim(timeAgo(item.timestamp));
            console.log(`  ${time}  ${item.text}`);
        });
        console.log();
    }

    if (newItems.length === 0 && oldItems.length === 0) {
        console.log(Theme.gray("  No notifications found."));
    }
}

export function renderStoryTray(tray: { id: string; username: string; has_unseen: boolean }[]): void {
    console.log(Theme.primary(`\n  📷 STORIES (${tray.length})\n`));
    if (tray.length === 0) {
        console.log(Theme.gray("  No active stories."));
        return;
    }
    for (const t of tray) {
        const unseen = t.has_unseen ? chalk.magenta('●') : chalk.dim('○');
        console.log(`  ${unseen} ${Theme.secondary(`@${t.username}`)} ${chalk.dim(`(${t.id})`)}`);
    }
    console.log();
}

export function renderStories(items: StoryItem[]): void {
    console.log(Theme.primary(`\n  📷 USER STORIES (${items.length})\n`));
    if (items.length === 0) {
        console.log(Theme.gray("  No stories found."));
        return;
    }
    for (const s of items) {
        const type = s.media_type === 2 ? '🎬' : '🖼️';
        const time = timeAgo(s.taken_at);
        const expiresIn = s.expiring_at - Math.floor(Date.now() / 1000);
        const expiresStr = expiresIn > 0
            ? chalk.dim(`expires in ${Math.floor(expiresIn / 3600)}h ${Math.floor((expiresIn % 3600) / 60)}m`)
            : chalk.red('expired');

        console.log(`  ${type} ${chalk.dim(time)} ${expiresStr}`);
        console.log(`  ${chalk.blue(s.media_url)}`);
        console.log();
    }
}

export function renderSavedPosts(items: TimelineItem[]): void {
    console.log(Theme.primary(`\n  🔖 SAVED POSTS (${items.length})\n`));
    if (items.length === 0) {
        console.log(Theme.gray("  No saved posts."));
        return;
    }
    renderTimeline(items);
}
