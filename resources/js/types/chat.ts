export type ChatMessage = {
    id: number;
    conversation_id: number;
    sender_id: number | null;
    sender_type: 'customer' | 'agent' | 'ai' | 'system';
    sender: { id: number; name: string; role: string } | null;
    body: string | null;
    type: 'text' | 'image' | 'file';
    attachment_path: string | null;
    attachment_name: string | null;
    attachment_url: string | null;
    read_at: string | null;
    created_at: string | null;
};

export type ConversationSummary = {
    id: number;
    status: string;
    ai_active: boolean;
    last_message_at: string | null;
    customer: {
        id: number;
        name: string;
        phone: string | null;
        is_online: boolean;
        last_seen_at: string | null;
    };
    assigned_agent: { id: number; name: string } | null;
    latest_message: {
        id: number;
        body: string | null;
        type: string;
        sender_type: string;
        created_at: string | null;
    } | null;
    unread_count: number;
};

export type Announcement = {
    id: number;
    title: string;
    body: string;
    is_active: boolean;
} | null;

export type SupportSettings = {
    otp_enabled: boolean;
    otp_driver: string;
    ai_enabled: boolean;
    ai_provider: string;
    ai_trigger_mode: string;
    ai_reply_timeout_seconds: number;
    ai_system_prompt: string;
    brand_name: string;
};
