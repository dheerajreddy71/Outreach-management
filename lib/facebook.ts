/**
 * Facebook Messenger Integration
 * Uses Facebook Graph API for sending messages
 */

export interface FacebookConfig {
  pageAccessToken: string;
  appSecret?: string;
}

export interface FacebookMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a message via Facebook Messenger
 */
export async function sendFacebookMessage(
  recipientId: string,
  text: string,
  config: FacebookConfig
): Promise<FacebookMessageResponse> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${config.pageAccessToken}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text },
          messaging_type: "RESPONSE",
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error?.message || "Failed to send Facebook message",
      };
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.message_id,
    };
  } catch (error: any) {
    console.error("Facebook message error:", error);
    return {
      success: false,
      error: error.message || "Unknown error sending Facebook message",
    };
  }
}

/**
 * Send Facebook message with attachment
 */
export async function sendFacebookMessageWithAttachment(
  recipientId: string,
  attachmentUrl: string,
  type: "image" | "video" | "file",
  config: FacebookConfig
): Promise<FacebookMessageResponse> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${config.pageAccessToken}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: {
            attachment: {
              type,
              payload: {
                url: attachmentUrl,
                is_reusable: true,
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error?.message || "Failed to send Facebook attachment",
      };
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.message_id,
    };
  } catch (error: any) {
    console.error("Facebook attachment error:", error);
    return {
      success: false,
      error: error.message || "Unknown error sending Facebook attachment",
    };
  }
}

/**
 * Get Facebook user profile
 */
export async function getFacebookUserProfile(
  userId: string,
  pageAccessToken: string
): Promise<any> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/${userId}?fields=first_name,last_name,profile_pic&access_token=${pageAccessToken}`
    );

    if (!response.ok) {
      console.error("Failed to fetch Facebook user profile");
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching Facebook user profile:", error);
    return null;
  }
}

/**
 * Facebook integration object for channel integrations
 */
export const facebookIntegration = {
  send: async (params: { to: string; content: string; attachments?: string[] }) => {
    const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    if (!pageAccessToken) {
      throw new Error("Facebook Page Access Token not configured");
    }

    const config: FacebookConfig = { pageAccessToken };
    const recipientId = params.to; // Facebook Page-Scoped ID (PSID)

    let result: FacebookMessageResponse;

    // If attachments provided, send first attachment
    if (params.attachments && params.attachments.length > 0) {
      const attachmentUrl = params.attachments[0];
      
      // Determine attachment type from URL
      const extension = attachmentUrl.split(".").pop()?.toLowerCase();
      let type: "image" | "video" | "file" = "file";
      
      if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension || "")) {
        type = "image";
      } else if (["mp4", "mov", "avi"].includes(extension || "")) {
        type = "video";
      }

      result = await sendFacebookMessageWithAttachment(
        recipientId,
        attachmentUrl,
        type,
        config
      );
    } else {
      result = await sendFacebookMessage(recipientId, params.content, config);
    }

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to send Facebook message",
      };
    }

    return {
      success: true,
      externalId: result.messageId,
    };
  },
};
