// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/features.md (§ reels/reels.ts)
//     If the GraphQL doc_id, query shape, or endpoint change, update the docs.
import type { IGClient } from "../../../core/http/ig-client";
import type { TimelineItem } from "../models/timeline.model";
import { parseMediaNode } from "../utils/media-extractor";

export class Reels {
	private client: IGClient;

	constructor(client: IGClient) {
		this.client = client;
	}

	async getGlobalReels(): Promise<TimelineItem[]> {
		const queryId = "27067550136266946"; // PolarisClipsTabDesktopContainerQuery
		const res = await this.client.apiCall(
			"https://www.instagram.com/graphql/query",
			"POST",
			{
				doc_id: queryId,
				variables: JSON.stringify({
					data: {
						tab_type: "clips_tab",
					},
				}),
			},
		);

		const items: TimelineItem[] = [];

		if (res.data?.xdt_api__v1__clips__home__connection_v2?.edges) {
			for (const edge of res.data.xdt_api__v1__clips__home__connection_v2
				.edges) {
				if (edge.node?.media) {
					const result = parseMediaNode(edge.node.media);
					if (result) items.push(result);
				}
			}
		}

		return items;
	}
}
