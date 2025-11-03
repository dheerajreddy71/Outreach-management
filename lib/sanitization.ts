/**
 * Input Sanitization and Security Utilities
 * Protects against XSS, SQL injection, and other attacks
 */

/**
 * Sanitize HTML string to prevent XSS attacks
 * Removes dangerous tags and attributes
 */
export function sanitizeHtml(input: string): string {
  if (!input) return "";

  // Remove script tags
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, "");

  // Remove dangerous protocols
  sanitized = sanitized.replace(/javascript:/gi, "");
  sanitized = sanitized.replace(/data:text\/html/gi, "");

  // Remove iframe and object tags
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "");
  sanitized = sanitized.replace(/<embed\b[^>]*>/gi, "");

  return sanitized.trim();
}

/**
 * Sanitize string for safe database queries
 * Note: Prisma already handles this, but useful for raw queries
 */
export function sanitizeSql(input: string): string {
  if (!input) return "";

  // Escape single quotes
  return input.replace(/'/g, "''");
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string): string | null {
  if (!email) return null;

  const sanitized = email.trim().toLowerCase();

  // Basic email validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(sanitized)) {
    return null;
  }

  return sanitized;
}

/**
 * Validate and sanitize phone number
 * Accepts various formats and normalizes to E.164
 */
export function sanitizePhone(phone: string): string | null {
  if (!phone) return null;

  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, "");

  // Handle US/Canada numbers
  if (digits.length === 10) {
    digits = "1" + digits; // Add country code
  }

  // Must be 11 digits for US/Canada (1 + 10 digits)
  if (digits.length !== 11 || !digits.startsWith("1")) {
    // For international numbers, keep as is if 10-15 digits
    if (digits.length >= 10 && digits.length <= 15) {
      return "+" + digits;
    }
    return null;
  }

  return "+" + digits;
}

/**
 * Sanitize URL - validate and ensure safe protocol
 */
export function sanitizeUrl(url: string): string | null {
  if (!url) return null;

  const sanitized = url.trim();

  try {
    const parsed = new URL(sanitized);

    // Only allow safe protocols
    const safeProtocols = ["http:", "https:", "mailto:", "tel:"];

    if (!safeProtocols.includes(parsed.protocol)) {
      return null;
    }

    return parsed.toString();
  } catch {
    // If not a valid URL, try adding https://
    try {
      const withProtocol = "https://" + sanitized;
      const parsed = new URL(withProtocol);
      return parsed.toString();
    } catch {
      return null;
    }
  }
}

/**
 * Sanitize file name - remove path traversal attempts
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return "unnamed";

  // Remove path components
  let sanitized = fileName.replace(/^.*[\\\/]/, "");

  // Remove dangerous characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, "_");

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split(".").pop();
    sanitized = sanitized.substring(0, 250) + "." + ext;
  }

  return sanitized;
}

/**
 * Sanitize object - recursively sanitize all string values
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeHtml(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === "string" ? sanitizeHtml(item) : item
      );
    } else if (value && typeof value === "object") {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Validate and sanitize custom fields JSON
 */
export function sanitizeCustomFields(fields: any): Record<string, any> {
  if (!fields || typeof fields !== "object") {
    return {};
  }

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(fields)) {
    // Only allow alphanumeric keys
    const safeKey = key.replace(/[^a-zA-Z0-9_]/g, "_");

    if (typeof value === "string") {
      sanitized[safeKey] = sanitizeHtml(value);
    } else if (typeof value === "number" || typeof value === "boolean") {
      sanitized[safeKey] = value;
    } else if (Array.isArray(value)) {
      sanitized[safeKey] = value.filter(
        (item) => typeof item === "string" || typeof item === "number"
      );
    }
  }

  return sanitized;
}

/**
 * Rate limit key sanitization
 */
export function sanitizeRateLimitKey(key: string): string {
  // Remove special characters, keep only alphanumeric, dots, and hyphens
  return key.replace(/[^a-zA-Z0-9.-]/g, "_");
}

/**
 * Detect and prevent SQL injection patterns
 */
export function containsSqlInjection(input: string): boolean {
  if (!input) return false;

  const sqlPatterns = [
    /(\bUNION\b.*\bSELECT\b)/i,
    /(\bSELECT\b.*\bFROM\b)/i,
    /(\bINSERT\b.*\bINTO\b)/i,
    /(\bDELETE\b.*\bFROM\b)/i,
    /(\bDROP\b.*\bTABLE\b)/i,
    /(\bUPDATE\b.*\bSET\b)/i,
    /(--|;|\/\*|\*\/|xp_|sp_)/i,
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * Detect and prevent XSS attempts
 */
export function containsXss(input: string): boolean {
  if (!input) return false;

  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /onerror\s*=/i,
    /onload\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
}

/**
 * Validate that input doesn't contain malicious patterns
 */
export function validateInputSecurity(input: string): {
  valid: boolean;
  reason?: string;
} {
  if (containsSqlInjection(input)) {
    return { valid: false, reason: "Potential SQL injection detected" };
  }

  if (containsXss(input)) {
    return { valid: false, reason: "Potential XSS attack detected" };
  }

  return { valid: true };
}
