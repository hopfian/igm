// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/features.md (§ explore/explore.ts)
//     If API endpoints or parsing logic change, update the docs.
import { IGClient } from '../../core/client';
import { TimelineItem } from '../../models';
import { parseMediaNode } from '../../utils/media';

export class Explore {
    private client: IGClient;

    constructor(client: IGClient) {
        this.client = client;
    }

    public async getExploreFeed(): Promise<TimelineItem[]> {
        const response = await this.client.apiCall('explore/grid/', 'GET');
        const sections = response.sectional_items || [];

        const parsed: TimelineItem[] = [];
        for (const section of sections) {
            const layoutItems = section.layout_content?.fill_items || section.layout_content?.medias || [];
            for (const item of layoutItems) {
                const result = parseMediaNode(item.media);
                if (result) parsed.push(result);
            }
        }

        return parsed;
    }
}
