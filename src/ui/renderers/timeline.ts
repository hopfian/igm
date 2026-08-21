// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/ui.md (§ renderers/ — Domain Renderers)
//     If renderTimeline or renderComments output format changes, update the docs and example render.
import { TimelineItem, CommentItem } from '../../models';
import { Theme } from '../theme';
import { Card } from '../components/card';
import { timeAgo, formatNumber, mediaTypeLabel } from '../../utils/parsers';
import chalk from 'chalk';

export function renderTimeline(items: TimelineItem[]): void {
    console.log(Theme.primary(`\n${Theme.symbols.explore} INSTAGRAM FEED\n`));

    if (items.length === 0) {
        console.log(Theme.gray("  No items found."));
        return;
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // ─── Title bar: @user (Full Name) · 2h ago · 🎬 Video ─────
        const parts: string[] = [`@${item.username}`];
        if (item.full_name) parts[0] += ` (${item.full_name})`;
        if (item.taken_at) parts.push(timeAgo(item.taken_at));
        if (item.media_type) parts.push(mediaTypeLabel(item.media_type));
        const title = parts.join(' · ');

        const content: string[] = [];

        // Caption
        const caption = item.caption || '';
        if (caption) {
            content.push(caption);
        } else {
            content.push(Theme.dim('(No caption)'));
        }
        content.push('');

        // Location
        if (item.location) {
            content.push(`📍 ${item.location}`);
            content.push('');
        }

        // Media URLs
        if (item.media_urls.length > 0) {
            for (const url of item.media_urls) {
                content.push(`${Theme.symbols.bullet} ${url}`);
            }
            content.push('');
        }

        // Stats line
        const liked = item.has_liked ? chalk.red('♥') : '♡';
        const likeTxt = formatNumber(item.like_count);
        const cmtTxt = formatNumber(item.comment_count);
        let statsLine = `${liked} ${likeTxt}   ${Theme.symbols.comment} ${cmtTxt}`;
        if (item.view_count) {
            statsLine += `   👁 ${formatNumber(item.view_count)}`;
        }
        content.push(statsLine);

        // Post URL
        if (item.url) {
            content.push(chalk.dim(item.url));
        }

        Card.draw(content, title);
        console.log();
    }
}

export function renderComments(comments: CommentItem[]): void {
    console.log(Theme.success(`\n${Theme.symbols.comment} COMMENTS (${comments.length})\n`));
    if (comments.length === 0) {
        console.log(Theme.gray("  No comments found."));
        return;
    }
    for (const c of comments) {
        const time = c.created_at ? chalk.dim(` · ${timeAgo(c.created_at)}`) : '';
        const replies = c.reply_count ? chalk.dim(` · ${c.reply_count} replies`) : '';
        console.log(`  ${Theme.secondary(`@${c.username}`)}${time}`);
        console.log(`  ${c.text}`);
        console.log(`  ${Theme.dim(`${Theme.symbols.heart} ${c.like_count}`)}${replies}`);
        console.log();
    }
}
