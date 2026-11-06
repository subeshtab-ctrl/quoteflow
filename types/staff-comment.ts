export interface StaffComment {
  id: string;
  organization_id: string;
  quotation_id: string;
  author_id: string;
  author_name: string;
  author_email?: string;
  author_role?: string;
  text: string;
  mentions: string[]; // User IDs of mentioned staff members
  created_at: string;
  updated_at?: string;
}

export interface StaffCommentReadReceipt {
  organization_id: string;
  quotation_id: string;
  user_id: string;
  last_read_at: string;
  last_read_comment_id?: string;
}

export interface QuotationCommentNotificationStatus {
  hasUnread: boolean;
  hasUnreadMention: boolean;
  unreadCount: number;
  unreadMentionCount: number;
  lastReadAt?: string;
}

export interface StaffMentionOption {
  id: string;
  full_name: string;
  email: string;
  role: string;
}
