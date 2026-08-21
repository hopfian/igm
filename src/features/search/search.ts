import { IGClient } from '../../core/client';
import { SearchUser } from '../../models';

export class Search {
    private client: IGClient;

    constructor(client: IGClient) {
        this.client = client;
    }

    public async searchUsers(query: string): Promise<SearchUser[]> {
        const response = await this.client.apiCall(
            `web/search/topsearch/?query=${encodeURIComponent(query)}&context=blended`, 'GET'
        );
        const users = (response.users || []).map((u: any) => u.user || u);
        
        return users.map((u: any) => ({
            pk: u.pk,
            username: u.username,
            full_name: u.full_name,
            is_private: u.is_private,
            is_verified: u.is_verified,
            profile_pic_url: u.profile_pic_url,
            follower_count: u.follower_count
        }));
    }
}
