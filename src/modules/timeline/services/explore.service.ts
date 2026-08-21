// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/features.md (§ explore/explore.ts)
//     If API endpoints or parsing logic change, update the docs.
import type { IGClient } from "../../../core/http/ig-client";
import type { TimelineItem } from "../models/timeline.model";
import { parseMediaNode } from "../utils/media-extractor";

export class Explore {
	private client: IGClient;

	constructor(client: IGClient) {
		this.client = client;
	}

	public async getExploreFeed(): Promise<TimelineItem[]> {
		const response = await this.client.apiCall(
			"discover/web/explore_grid/",
			"GET",
		);
		const sections = response.sectional_items || [];

		const parsed: TimelineItem[] = [];
		for (const section of sections) {
			const layoutItems =
				section.layout_content?.fill_items ||
				section.layout_content?.medias ||
				[];
			for (const item of layoutItems) {
				const result = parseMediaNode(item.media);
				if (result) parsed.push(result);
			}
		}

		return parsed;
	}
}
