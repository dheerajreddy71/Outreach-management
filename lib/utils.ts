import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format phone number to E.164 format
 * If already in E.164 format (starts with +), return as is
 */
export function formatPhoneNumber(phone: string): string {
  // If already in E.164 format, return as is
  if (phone.startsWith("+")) {
    return phone;
  }
  
  const cleaned = phone.replace(/\D/g, "");
  
  // US/Canada numbers
  if (cleaned.startsWith("1") && cleaned.length === 11) {
    return `+${cleaned}`;
  } else if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // For all other international numbers, add + if not present
  return `+${cleaned}`;
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + "...";
}

/**
 * Extract mentions from text (e.g., @user@example.com)
 * Returns array of email addresses mentioned in the text
 */
export function extractMentions(text: string): string[] {
  // Match @email pattern: @[word]@[domain].[tld]
  const mentionRegex = /@([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]); // Extract the email without the leading @
  }
  
  return mentions;
}

/**
 * Generate initials from name
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Get color for channel badge
 */
export function getChannelColor(channel: string): string {
  const colors: Record<string, string> = {
    SMS: "bg-blue-100 text-blue-800",
    WHATSAPP: "bg-green-100 text-green-800",
    EMAIL: "bg-purple-100 text-purple-800",
    TWITTER: "bg-sky-100 text-sky-800",
    FACEBOOK: "bg-indigo-100 text-indigo-800",
    VOICE: "bg-orange-100 text-orange-800",
  };
  
  return colors[channel] || "bg-gray-100 text-gray-800";
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate response time in minutes
 */
export function calculateResponseTime(sentAt: Date, respondedAt: Date): number {
  return Math.floor((respondedAt.getTime() - sentAt.getTime()) / 1000 / 60);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/\D/g, ""));
}
