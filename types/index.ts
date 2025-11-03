import { 
  User, 
  Contact, 
  Message, 
  Note, 
  Team,
  ScheduledMessage,
  MessageTemplate,
  TwilioNumber,
  Analytics,
  UserRole,
  MessageChannel,
  MessageDirection,
  MessageStatus,
  ContactStatus,
  NoteVisibility,
  ScheduleStatus
} from "@prisma/client";

// ============================================
// Re-export Prisma types
// ============================================

export type {
  User,
  Contact,
  Message,
  Note,
  Team,
  ScheduledMessage,
  MessageTemplate,
  TwilioNumber,
  Analytics,
  UserRole,
  MessageChannel,
  MessageDirection,
  MessageStatus,
  ContactStatus,
  NoteVisibility,
  ScheduleStatus
};

// ============================================
// Extended types with relations
// ============================================

export interface UserWithRelations extends User {
  teamMembers?: Array<{
    team: Team;
    role: UserRole;
  }>;
  messages?: Message[];
  notes?: Note[];
}

export interface ContactWithRelations extends Contact {
  messages?: Message[];
  notes?: Note[];
  assignments?: Array<{
    user: User;
  }>;
}

export interface MessageWithRelations extends Message {
  contact: Contact;
  user?: User;
}

export interface NoteWithRelations extends Note {
  contact: Contact;
  user: User;
  replies?: Note[];
  parent?: Note;
}

// ============================================
// API Request/Response types
// ============================================

export interface SendMessageRequest {
  contactId: string;
  channel: MessageChannel;
  content: string;
  attachments?: string[];
  scheduledAt?: Date;
}

export interface SendMessageResponse {
  success: boolean;
  message?: MessageWithRelations;
  error?: string;
}

export interface CreateContactRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  company?: string;
  jobTitle?: string;
  tags?: string[];
}

export interface CreateNoteRequest {
  contactId: string;
  content: string;
  visibility: NoteVisibility;
  mentions?: string[];
  parentId?: string;
}

export interface ScheduleMessageRequest {
  contactId: string;
  channel: MessageChannel;
  content: string;
  scheduledAt: Date;
  templateId?: string;
}

// ============================================
// Webhook types
// ============================================

export interface TwilioWebhookPayload {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
  SmsStatus?: string;
  MessageStatus?: string;
}

export interface TwilioStatusCallbackPayload {
  MessageSid: string;
  MessageStatus: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

// ============================================
// Integration types
// ============================================

export interface ChannelIntegration {
  send: (params: {
    to: string;
    content: string;
    attachments?: string[];
  }) => Promise<{ success: boolean; externalId?: string; error?: string }>;
  
  validateWebhook?: (payload: any) => boolean;
  
  processInbound?: (payload: any) => Promise<{
    from: string;
    content: string;
    attachments?: string[];
    externalId: string;
  }>;
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  whatsappNumber?: string;
}

// ============================================
// Analytics types
// ============================================

export interface ChannelMetrics {
  channel: MessageChannel;
  totalSent: number;
  totalReceived: number;
  averageResponseTime: number;
  deliveryRate: number;
}

export interface ContactMetrics {
  totalContacts: number;
  activeContacts: number;
  newContactsThisWeek: number;
  unsubscribed: number;
}

export interface ResponseMetrics {
  averageFirstResponseTime: number;
  averageResponseTime: number;
  responseRate: number;
}

export interface DashboardMetrics {
  channelMetrics: ChannelMetrics[];
  contactMetrics: ContactMetrics;
  responseMetrics: ResponseMetrics;
  messageVolume: Array<{
    date: string;
    count: number;
    channel: MessageChannel;
  }>;
}

// ============================================
// Real-time collaboration types
// ============================================

export interface PresenceData {
  userId: string;
  userName: string;
  contactId?: string;
  lastSeen: Date;
}

export interface CollaborationEvent {
  type: 'typing' | 'editing' | 'viewing';
  userId: string;
  userName: string;
  contactId?: string;
  noteId?: string;
  timestamp: Date;
}

// ============================================
// UI Component types
// ============================================

export interface InboxFilter {
  channels?: MessageChannel[];
  statuses?: MessageStatus[];
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  assignedTo?: string;
}

export interface MessageThread {
  contact: ContactWithRelations;
  messages: MessageWithRelations[];
  lastMessage?: MessageWithRelations;
  unreadCount: number;
}

export interface ContactProfileTab {
  id: string;
  label: string;
  component: React.ComponentType<{ contact: ContactWithRelations }>;
}
