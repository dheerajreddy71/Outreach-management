import { compareTwoStrings } from "string-similarity";

export interface DuplicateMatch {
  contactId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  similarity: number;
  matchReason: string[];
}

const SIMILARITY_THRESHOLD = 0.75; // 75% match required

/**
 * Find potential duplicate contacts using fuzzy matching
 */
export function findDuplicateContacts(
  newContact: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  },
  existingContacts: Array<{
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;
  }>
): DuplicateMatch[] {
  const duplicates: DuplicateMatch[] = [];

  for (const existing of existingContacts) {
    let totalSimilarity = 0;
    let matchCount = 0;
    const matchReasons: string[] = [];

    // Check email exact match
    if (newContact.email && existing.email) {
      if (newContact.email.toLowerCase() === existing.email.toLowerCase()) {
        matchReasons.push("Exact email match");
        totalSimilarity += 1.0;
        matchCount++;
      }
    }

    // Check phone exact match (normalize format)
    if (newContact.phone && existing.phone) {
      const normalizedNew = newContact.phone.replace(/\D/g, "");
      const normalizedExisting = existing.phone.replace(/\D/g, "");
      
      if (normalizedNew === normalizedExisting) {
        matchReasons.push("Exact phone match");
        totalSimilarity += 1.0;
        matchCount++;
      }
    }

    // Fuzzy match first name
    if (newContact.firstName && existing.firstName) {
      const similarity = compareTwoStrings(
        newContact.firstName.toLowerCase(),
        existing.firstName.toLowerCase()
      );
      
      if (similarity >= SIMILARITY_THRESHOLD) {
        matchReasons.push(`First name: ${Math.round(similarity * 100)}% match`);
        totalSimilarity += similarity;
        matchCount++;
      }
    }

    // Fuzzy match last name
    if (newContact.lastName && existing.lastName) {
      const similarity = compareTwoStrings(
        newContact.lastName.toLowerCase(),
        existing.lastName.toLowerCase()
      );
      
      if (similarity >= SIMILARITY_THRESHOLD) {
        matchReasons.push(`Last name: ${Math.round(similarity * 100)}% match`);
        totalSimilarity += similarity;
        matchCount++;
      }
    }

    // Fuzzy match full name
    if (newContact.firstName && newContact.lastName && existing.firstName && existing.lastName) {
      const newFullName = `${newContact.firstName} ${newContact.lastName}`.toLowerCase();
      const existingFullName = `${existing.firstName} ${existing.lastName}`.toLowerCase();
      
      const similarity = compareTwoStrings(newFullName, existingFullName);
      
      if (similarity >= SIMILARITY_THRESHOLD) {
        matchReasons.push(`Full name: ${Math.round(similarity * 100)}% match`);
        totalSimilarity += similarity;
        matchCount++;
      }
    }

    // If we found matches, add to duplicates
    if (matchCount > 0 && matchReasons.length > 0) {
      const avgSimilarity = totalSimilarity / matchCount;
      
      // Only include if average similarity is above threshold
      if (avgSimilarity >= SIMILARITY_THRESHOLD) {
        duplicates.push({
          contactId: existing.id,
          firstName: existing.firstName,
          lastName: existing.lastName,
          email: existing.email,
          phone: existing.phone,
          company: existing.company,
          similarity: avgSimilarity,
          matchReason: matchReasons,
        });
      }
    }
  }

  // Sort by similarity (highest first)
  return duplicates.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Normalize phone number for comparison
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Merge two contacts - combine data and transfer relations
 */
export async function mergeContacts(
  primaryContactId: string,
  secondaryContactId: string,
  mergeStrategy: {
    preferPrimary?: boolean;
    fields?: {
      firstName?: "primary" | "secondary";
      lastName?: "primary" | "secondary";
      email?: "primary" | "secondary";
      phone?: "primary" | "secondary";
      whatsapp?: "primary" | "secondary";
      company?: "primary" | "secondary";
      jobTitle?: "primary" | "secondary";
      tags?: "merge" | "primary" | "secondary";
    };
  } = { preferPrimary: true }
) {
  const { prisma } = await import("./prisma");

  const [primaryContact, secondaryContact] = await Promise.all([
    prisma.contact.findUnique({
      where: { id: primaryContactId },
      include: {
        messages: true,
        notes: true,
        scheduled: true,
      },
    }),
    prisma.contact.findUnique({
      where: { id: secondaryContactId },
      include: {
        messages: true,
        notes: true,
        scheduled: true,
      },
    }),
  ]);

  if (!primaryContact || !secondaryContact) {
    throw new Error("Contact not found");
  }

  // Prepare merged data
  const mergedData: any = {};
  const fields = mergeStrategy.fields || {};

  // Merge fields based on strategy
  mergedData.firstName =
    fields.firstName === "secondary"
      ? secondaryContact.firstName
      : primaryContact.firstName || secondaryContact.firstName;

  mergedData.lastName =
    fields.lastName === "secondary"
      ? secondaryContact.lastName
      : primaryContact.lastName || secondaryContact.lastName;

  mergedData.email =
    fields.email === "secondary"
      ? secondaryContact.email
      : primaryContact.email || secondaryContact.email;

  mergedData.phone =
    fields.phone === "secondary"
      ? secondaryContact.phone
      : primaryContact.phone || secondaryContact.phone;

  mergedData.whatsapp =
    fields.whatsapp === "secondary"
      ? secondaryContact.whatsapp
      : primaryContact.whatsapp || secondaryContact.whatsapp;

  mergedData.company =
    fields.company === "secondary"
      ? secondaryContact.company
      : primaryContact.company || secondaryContact.company;

  mergedData.jobTitle =
    fields.jobTitle === "secondary"
      ? secondaryContact.jobTitle
      : primaryContact.jobTitle || secondaryContact.jobTitle;

  // Merge tags
  if (fields.tags === "merge") {
    mergedData.tags = Array.from(
      new Set([...(primaryContact.tags || []), ...(secondaryContact.tags || [])])
    );
  } else if (fields.tags === "secondary") {
    mergedData.tags = secondaryContact.tags;
  } else {
    mergedData.tags = primaryContact.tags;
  }

  // Keep the earlier lastContactedAt
  if (primaryContact.lastContactedAt && secondaryContact.lastContactedAt) {
    mergedData.lastContactedAt =
      primaryContact.lastContactedAt < secondaryContact.lastContactedAt
        ? primaryContact.lastContactedAt
        : secondaryContact.lastContactedAt;
  } else {
    mergedData.lastContactedAt = primaryContact.lastContactedAt || secondaryContact.lastContactedAt;
  }

  // Use transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Transfer all relations from secondary to primary
    await tx.message.updateMany({
      where: { contactId: secondaryContactId },
      data: { contactId: primaryContactId },
    });

    await tx.note.updateMany({
      where: { contactId: secondaryContactId },
      data: { contactId: primaryContactId },
    });

    await tx.scheduledMessage.updateMany({
      where: { contactId: secondaryContactId },
      data: { contactId: primaryContactId },
    });

    // Update primary contact with merged data
    const updatedContact = await tx.contact.update({
      where: { id: primaryContactId },
      data: mergedData,
      include: {
        messages: true,
        notes: true,
        scheduled: true,
      },
    });

    // Delete secondary contact
    await tx.contact.delete({
      where: { id: secondaryContactId },
    });

    return updatedContact;
  });

  return result;
}
