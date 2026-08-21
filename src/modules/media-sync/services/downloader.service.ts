import axios from "axios";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import type { IGClient } from "../../../core/http/ig-client";
import { extractMediaUrls } from "../../../modules/timeline/utils/media-extractor";
import { spin } from "../../../shared/ui/spinner";
import { sanitizeInput, shortcodeToId } from "../../../shared/utils/formatters";
import { Profile } from "../../identity/services/profile.service";

export class Downloader {
	private client: IGClient;

	constructor(client: IGClient) {
		this.client = client;
	}

	private resolveMediaId(input: string): string {
		// Pure numeric ID
		if (/^\d{15,}$/.test(input)) return input;

		// Extract shortcode from URL or raw input
		const shortcode = sanitizeInput(input);
		return shortcodeToId(shortcode);
	}

	private async downloadFile(url: string, filepath: string): Promise<void> {
		const response = await axios({
			url,
			method: "GET",
			responseType: "stream",
		});
		const writer = fs.createWriteStream(filepath);
		response.data.pipe(writer);
		await new Promise<void>((resolve, reject) => {
			writer.on("finish", resolve);
			writer.on("error", reject);
		});
	}

	private async downloadMediaUrls(
		mediaUrls: string[],
		prefix: string,
		outputDir: string,
	) {
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		for (let i = 0; i < mediaUrls.length; i++) {
			const url = mediaUrls[i];
			const ext = url.includes(".mp4") ? ".mp4" : ".jpg";
			const filename = `${prefix}_${i + 1}${ext}`;
			const filepath = path.join(outputDir, filename);

			try {
				const s = spin(`downloading ${filename}...`);
				await this.downloadFile(url, filepath);
				s.succeed(`saved ${filepath}`);
			} catch (error: any) {
				console.error(chalk.red(`  ✗ Failed: ${filename} — ${error.message}`));
			}
		}
	}

	public async downloadPost(input: string, outputDir: string = "./downloads") {
		const s = spin("resolving media...");
		const mediaId = this.resolveMediaId(input);

		const response = await this.client.apiCall(`media/${mediaId}/info/`, "GET");
		if (!response.items || response.items.length === 0) {
			s.fail("media not found");
			return;
		}

		const media = response.items[0];
		const mediaUrls = extractMediaUrls(media);
		const username = media.user?.username || "unknown";
		const prefix = `${username}_${media.code}`;

		s.succeed(`${mediaUrls.length} media item(s) found`);
		await this.downloadMediaUrls(mediaUrls, prefix, outputDir);
	}

	public async downloadProfile(
		userId: string,
		outputDir: string = "./downloads",
	) {
		const s = spin("fetching profile feed...");
		const profile = new Profile(this.client);
		const feed = await profile.getProfileFeed(userId);
		const userDir = path.join(outputDir, userId);

		s.succeed(`${feed.length} posts to download`);

		for (const item of feed) {
			if (item.media_urls && item.media_urls.length > 0) {
				await this.downloadMediaUrls(item.media_urls, item.code, userDir);
			}
		}

		console.log(chalk.green(`\n  ✓ Profile download complete → ${userDir}`));
	}
}
