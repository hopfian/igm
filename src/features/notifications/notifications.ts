import { IGClient } from '../../core/client';
import { NotificationItem } from '../../models';

export class Notifications {
    private client: IGClient;

    constructor(client: IGClient) {
        this.client = client;
    }

    public async getNotifications(): Promise<{ new_stories: NotificationItem[], old_stories: NotificationItem[] }> {
        const response = await this.client.apiCall('news/inbox/', 'GET');
        
        const parse = (stories: any[]) => stories.map((s: any) => ({
            id: s.pk,
            type: s.type,
            text: s.args?.text || 'Notification',
            timestamp: s.args?.timestamp,
            user_id: s.args?.links?.[0]?.id
        }));

        return {
            new_stories: parse(response.new_stories || []),
            old_stories: parse(response.old_stories || [])
        };
    }
}
