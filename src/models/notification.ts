// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/models.md (§ notification.ts)
//     If fields are added/removed from NotificationItem, update the docs.
export interface NotificationItem {
    id: string;
    type: number;
    text: string;
    timestamp: number;
    user_id?: string;
}
