import { z } from "zod";

/**
 * User validation schemas
 */
export const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).default("VIEWER"),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).optional(),
});

/**
 * Contact validation schemas
 */
export const createContactSchema = z.object({
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  twitterHandle: z.string().optional().nullable(),
  facebookId: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED", "UNSUBSCRIBED"]).optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional(),
}).refine(
  (data) => data.email || data.phone || data.whatsapp,
  "At least one contact method (email, phone, or whatsapp) is required"
);

export const updateContactSchema = z.object({
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  twitterHandle: z.string().optional().nullable(),
  facebookId: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED", "UNSUBSCRIBED"]).optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional(),
});

/**
 * Message validation schemas
 */
export const sendMessageSchema = z.object({
  contactId: z.string().cuid(),
  channel: z.enum(["SMS", "WHATSAPP", "EMAIL", "TWITTER", "FACEBOOK", "VOICE"]),
  content: z.string().min(1, "Message content is required"),
  attachments: z.array(
    z.string().refine(
      (val) => {
        // Accept full URLs or relative paths starting with /
        try {
          new URL(val);
          return true;
        } catch {
          return val.startsWith('/');
        }
      },
      { message: "Must be a valid URL or relative path" }
    )
  ).optional(),
});

export const scheduleMessageSchema = z.object({
  contactId: z.string().cuid(),
  channel: z.enum(["SMS", "WHATSAPP", "EMAIL", "TWITTER", "FACEBOOK", "VOICE"]),
  content: z.string().min(1, "Message content is required"),
  scheduledAt: z.string().datetime().or(z.date()),
  templateId: z.string().cuid().optional().nullable(),
});

/**
 * Note validation schemas
 */
export const createNoteSchema = z.object({
  contactId: z.string().cuid(),
  content: z.string().min(1, "Note content is required"),
  visibility: z.enum(["PUBLIC", "PRIVATE", "TEAM"]).default("PUBLIC"),
  mentions: z.array(z.string()).optional(),
  parentId: z.string().cuid().optional().nullable(),
});

export const updateNoteSchema = z.object({
  content: z.string().min(1).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE", "TEAM"]).optional(),
});

/**
 * Template validation schemas
 */
export const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  channel: z.enum(["SMS", "WHATSAPP", "EMAIL", "TWITTER", "FACEBOOK", "VOICE"]),
  content: z.string().min(1, "Template content is required"),
  variables: z.array(z.string()).default([]),
});

/**
 * Team validation schemas
 */
export const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  description: z.string().optional(),
});

export const addTeamMemberSchema = z.object({
  userId: z.string().cuid(),
  teamId: z.string().cuid(),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).default("VIEWER"),
});

export const inviteUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).default("VIEWER"),
  teamId: z.string().cuid().optional(),
});

export const updateTeamMemberRoleSchema = z.object({
  memberId: z.string().cuid(),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * Webhook validation schemas
 */
export const twilioWebhookSchema = z.object({
  MessageSid: z.string(),
  AccountSid: z.string(),
  From: z.string(),
  To: z.string(),
  Body: z.string(),
  NumMedia: z.string().optional(),
  MediaUrl0: z.string().optional(),
  MediaContentType0: z.string().optional(),
});

/**
 * Query parameter validation schemas
 */
export const inboxFilterSchema = z.object({
  channels: z.array(z.enum(["SMS", "WHATSAPP", "EMAIL", "TWITTER", "FACEBOOK", "VOICE"])).optional(),
  statuses: z.array(z.enum(["PENDING", "SENT", "DELIVERED", "READ", "FAILED", "QUEUED"])).optional(),
  search: z.string().optional(),
  dateFrom: z.string().datetime().or(z.date()).optional(),
  dateTo: z.string().datetime().or(z.date()).optional(),
  assignedTo: z.string().cuid().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(50),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ScheduleMessageInput = z.infer<typeof scheduleMessageSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type UpdateTeamMemberRoleInput = z.infer<typeof updateTeamMemberRoleSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type InboxFilterInput = z.infer<typeof inboxFilterSchema>;
