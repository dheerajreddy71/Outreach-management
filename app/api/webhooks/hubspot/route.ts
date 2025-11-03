import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * HubSpot Webhook Handler
 * Handles contact sync events from HubSpot
 * 
 * Setup in HubSpot:
 * 1. Go to Settings → Integrations → Webhooks
 * 2. Create webhook subscription for:
 *    - contact.creation
 *    - contact.propertyChange
 *    - contact.deletion
 * 3. Set webhook URL to: https://your-domain.com/api/webhooks/hubspot
 * 4. Set HUBSPOT_CLIENT_SECRET in environment variables
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log("HubSpot webhook received:", body);

    // Verify webhook signature (recommended for production)
    const signature = req.headers.get("x-hubspot-signature");
    const hubspotSecret = process.env.HUBSPOT_CLIENT_SECRET;
    
    if (hubspotSecret && signature) {
      const bodyString = JSON.stringify(body);
      const hash = crypto
        .createHmac("sha256", hubspotSecret)
        .update(bodyString)
        .digest("hex");
      
      if (hash !== signature) {
        console.error("HubSpot webhook signature verification failed");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    // Handle different event types
    for (const event of body) {
      const { subscriptionType, objectId, propertyName, propertyValue } = event;

      switch (subscriptionType) {
        case "contact.creation":
          await handleContactCreation(event);
          break;
        
        case "contact.propertyChange":
          await handleContactUpdate(event);
          break;
        
        case "contact.deletion":
          await handleContactDeletion(objectId);
          break;
        
        default:
          console.log("Unknown HubSpot event type:", subscriptionType);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("HubSpot webhook error:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

async function handleContactCreation(event: any) {
  try {
    const { objectId, properties } = event;

    // Check if contact already exists
    const existingContact = await prisma.contact.findFirst({
      where: {
        OR: [
          { email: properties.email },
          { phone: properties.phone },
        ],
      },
    });

    if (existingContact) {
      console.log("Contact already exists, skipping creation");
      return;
    }

    // Create new contact
    const contact = await prisma.contact.create({
      data: {
        firstName: properties.firstname || null,
        lastName: properties.lastname || null,
        email: properties.email || null,
        phone: properties.phone || null,
        company: properties.company || null,
        jobTitle: properties.jobtitle || null,
        status: "LEAD",
        customFields: {
          hubspotId: objectId,
          syncedFromHubspot: true,
        },
      },
    });

    console.log("Created contact from HubSpot:", contact.id);

    // Track analytics
    await prisma.analytics.create({
      data: {
        contactId: contact.id,
        channel: "EMAIL",
        eventType: "contact_synced_from_hubspot",
      },
    });
  } catch (error) {
    console.error("Failed to create contact from HubSpot:", error);
  }
}

async function handleContactUpdate(event: any) {
  try {
    const { objectId, propertyName, propertyValue } = event;

    // Find contact by HubSpot ID
    const contact = await prisma.contact.findFirst({
      where: {
        customFields: {
          path: ["hubspotId"],
          equals: objectId,
        },
      },
    });

    if (!contact) {
      console.log("Contact not found for HubSpot ID:", objectId);
      return;
    }

    // Map HubSpot properties to our fields
    const updateData: any = {};
    
    switch (propertyName) {
      case "firstname":
        updateData.firstName = propertyValue;
        break;
      case "lastname":
        updateData.lastName = propertyValue;
        break;
      case "email":
        updateData.email = propertyValue;
        break;
      case "phone":
        updateData.phone = propertyValue;
        break;
      case "company":
        updateData.company = propertyValue;
        break;
      case "jobtitle":
        updateData.jobTitle = propertyValue;
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: updateData,
      });

      console.log("Updated contact from HubSpot:", contact.id);
    }
  } catch (error) {
    console.error("Failed to update contact from HubSpot:", error);
  }
}

async function handleContactDeletion(hubspotId: string) {
  try {
    const contact = await prisma.contact.findFirst({
      where: {
        customFields: {
          path: ["hubspotId"],
          equals: hubspotId,
        },
      },
    });

    if (!contact) {
      console.log("Contact not found for HubSpot ID:", hubspotId);
      return;
    }

    // Soft delete or mark as inactive instead of hard delete
    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        status: "INACTIVE",
        customFields: {
          ...(typeof contact.customFields === "object" && contact.customFields !== null 
            ? contact.customFields 
            : {}),
          deletedInHubspot: true,
        },
      },
    });

    console.log("Marked contact as inactive from HubSpot deletion:", contact.id);
  } catch (error) {
    console.error("Failed to handle contact deletion from HubSpot:", error);
  }
}

// GET handler for webhook verification
export async function GET(req: NextRequest) {
  // HubSpot webhook verification challenge
  const challenge = req.nextUrl.searchParams.get("challenge");
  if (challenge) {
    return new NextResponse(challenge, {
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ message: "HubSpot webhook endpoint" });
}
