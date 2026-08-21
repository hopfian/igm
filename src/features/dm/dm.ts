// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/features.md (§ dm/dm.ts)
//     If methods, API endpoints, or return types change, update the docs.
import { IGClient } from '../../core/client';
import { DMThread, DMMessage } from '../../models';
import { runUnsendPlaywright } from './unsendPlaywright';

export class DirectMessaging {
    private client: IGClient;

    constructor(client: IGClient) {
        this.client = client;
    }

    public async getInbox(): Promise<DMThread[]> {
        const response = await this.client.apiCall('direct_v2/inbox/', 'GET');
        const threads = response.inbox?.threads || [];
        
        return threads.map((t: any) => ({
            thread_id: t.thread_id,
            thread_title: t.thread_title || 'Untitled',
            last_message: t.last_permanent_item?.text || '[Media/Other]',
            users: t.users?.map((u: any) => u.username) || []
        }));
    }

    public async getThread(threadId: string): Promise<DMMessage[]> {
        const response = await this.client.apiCall(`direct_v2/threads/${threadId}/`, 'GET');
        const items = response.thread?.items || [];
        
        return items.map((m: any) => ({
            id: m.item_id,
            user_id: m.user_id,
            text: m.text || '[Media/Other]',
            timestamp: m.timestamp
        }));
    }

    public async sendMessage(threadId: string, text: string): Promise<any> {
        const data = {
            text,
            thread_ids: `[${threadId}]`
        };
        return await this.client.apiCall('direct_v2/threads/broadcast/text/', 'POST', data);
    }

    public async deleteMessage(threadId: string, itemId: string): Promise<any> {
        return await this.client.apiCall(`direct_v2/threads/${threadId}/items/${itemId}/delete/`, 'POST');
    }

    public async unsendAllMessages(threadId: string): Promise<number> {
        return await runUnsendPlaywright(this.client.getCookies(), threadId);
    }
}
