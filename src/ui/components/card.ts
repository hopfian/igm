// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/ui.md (§ components/card.ts — Box-Drawing Card)
//     If card layout, wrapping logic, or the draw() signature change, update the docs and example render.
import { Theme } from '../theme';
import stringWidth from 'string-width';

export class Card {
    /**
     * Draws a framed card with perfect border alignment.
     * Handles embedded newlines, ANSI color codes, and long unbreakable strings (URLs).
     */
    static draw(content: string[], title?: string, width: number = 76): void {
        const borderCol = Theme.gray;
        const vert = borderCol(Theme.symbols.vertical);
        const horiz = Theme.symbols.horizontal;
        const innerWidth = width - 4; // "│ " (2 left) + " │" (2 right)

        // --- TOP BORDER ---
        let topFill: number;
        if (title) {
            // ┌─ title ───...───┐
            // 1(corner) + 1(dash) + 1(space) + titleVisualWidth + 1(space) + fill + 1(corner) = width
            const titleW = stringWidth(title);
            topFill = width - titleW - 5; // 5 = ┌ + ─ + space + space + ┐
            console.log(borderCol(`${Theme.symbols.corner_tl}${horiz} ${title} ${horiz.repeat(Math.max(0, topFill))}${Theme.symbols.corner_tr}`));
        } else {
            console.log(borderCol(`${Theme.symbols.corner_tl}${horiz.repeat(width - 2)}${Theme.symbols.corner_tr}`));
        }

        // --- CONTENT LINES ---
        // First, flatten: split every content string by real newlines so they
        // each become separate card rows with proper borders on both sides.
        const flatLines: string[] = [];
        for (const line of content) {
            const sub = line.split(/\r?\n/);
            for (const s of sub) {
                flatLines.push(s);
            }
        }

        for (const line of flatLines) {
            const wrapped = this.wrapText(line, innerWidth);
            for (const wl of wrapped) {
                const wlWidth = stringWidth(wl);
                const padding = Math.max(0, innerWidth - wlWidth);
                console.log(`${vert} ${wl}${' '.repeat(padding)} ${vert}`);
            }
        }

        // --- BOTTOM BORDER ---
        console.log(borderCol(`${Theme.symbols.corner_bl}${horiz.repeat(width - 2)}${Theme.symbols.corner_br}`));
    }

    /**
     * Wraps text to fit within maxWidth, handling:
     * - Normal word-wrap at spaces
     * - Hard-break of long unbreakable tokens (URLs, hashes, etc.)
     */
    private static wrapText(text: string, maxWidth: number): string[] {
        if (!text || text.trim() === '') return [''];

        const lines: string[] = [];
        // Split by whitespace but keep the delimiters so we can preserve spacing intent
        const tokens = text.split(/(\s+)/);
        let currentLine = '';
        let currentWidth = 0;

        for (const token of tokens) {
            if (token === '') continue;

            const tokenWidth = stringWidth(token);

            // Pure whitespace token
            if (/^\s+$/.test(token)) {
                if (currentWidth + tokenWidth <= maxWidth) {
                    currentLine += token;
                    currentWidth += tokenWidth;
                }
                // If adding whitespace would overflow, just ignore it (natural break point)
                continue;
            }

            // Normal-length word: fits on current line
            if (currentWidth + tokenWidth <= maxWidth) {
                currentLine += token;
                currentWidth += tokenWidth;
                continue;
            }

            // Word doesn't fit — flush current line first
            if (currentLine.trimEnd() !== '') {
                lines.push(currentLine.trimEnd());
            }
            currentLine = '';
            currentWidth = 0;

            // If the word itself fits on a fresh line, just start it there
            if (tokenWidth <= maxWidth) {
                currentLine = token;
                currentWidth = tokenWidth;
                continue;
            }

            // Word is longer than the entire line — hard-chunk it character by character
            let remaining = token;
            while (stringWidth(remaining) > maxWidth) {
                let cut = 0;
                let w = 0;
                while (cut < remaining.length) {
                    const charW = stringWidth(remaining[cut]);
                    if (w + charW > maxWidth) break;
                    w += charW;
                    cut++;
                }
                if (cut === 0) cut = 1; // safety: always consume at least 1 char
                lines.push(remaining.slice(0, cut));
                remaining = remaining.slice(cut);
            }
            currentLine = remaining;
            currentWidth = stringWidth(remaining);
        }

        if (currentLine.trimEnd() !== '') {
            lines.push(currentLine.trimEnd());
        }

        return lines.length > 0 ? lines : [''];
    }
}
