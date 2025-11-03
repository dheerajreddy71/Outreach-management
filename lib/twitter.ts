/**
 * Twitter Direct Messages Integration
 * Uses Twitter API v2 for sending DMs
 */

export interface TwitterConfig {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
  bearerToken?: string;
}

export interface TwitterDMResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a Direct Message via Twitter API v2
 */
export async function sendTwitterDM(
  recipientId: string,
  text: string,
  config: TwitterConfig
): Promise<TwitterDMResponse> {
  try {
    const bearerToken = config.bearerToken || process.env.TWITTER_BEARER_TOKEN;
    
    if (!bearerToken) {
      throw new Error("Twitter Bearer Token not configured");
    }

    // Twitter API v2 endpoint for DMs
    const response = await fetch("https://api.twitter.com/2/dm_conversations/with/:participant_id/messages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.detail || "Failed to send Twitter DM",
      };
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.data?.dm_event_id || `tw_${Date.now()}`,
    };
  } catch (error: any) {
    console.error("Twitter DM error:", error);
    return {
      success: false,
      error: error.message || "Unknown error sending Twitter DM",
    };
  }
}

/**
 * Get Twitter user ID from handle
 */
export async function getTwitterUserId(
  handle: string,
  bearerToken: string
): Promise<string | null> {
  try {
    // Remove @ if present
    const username = handle.replace("@", "");

    const response = await fetch(
      `https://api.twitter.com/2/users/by/username/${username}`,
      {
        headers: {
          "Authorization": `Bearer ${bearerToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch Twitter user ID");
      return null;
    }

    const data = await response.json();
    return data.data?.id || null;
  } catch (error) {
    console.error("Error fetching Twitter user ID:", error);
    return null;
  }
}

/**
 * Twitter integration object for channel integrations
 */
export const twitterIntegration = {
  send: async (params: { to: string; content: string; attachments?: string[] }) => {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    if (!bearerToken) {
      throw new Error("Twitter Bearer Token not configured");
    }

    // 'to' is the Twitter handle or user ID
    let userId = params.to;
    
    // If it looks like a handle (contains @ or letters), convert to user ID
    if (params.to.includes("@") || /[a-zA-Z]/.test(params.to)) {
      const fetchedId = await getTwitterUserId(params.to, bearerToken);
      if (!fetchedId) {
        throw new Error("Could not find Twitter user ID");
      }
      userId = fetchedId;
    }

    const result = await sendTwitterDM(userId, params.content, {
      apiKey: process.env.TWITTER_API_KEY || "",
      apiSecret: process.env.TWITTER_API_SECRET || "",
      accessToken: process.env.TWITTER_ACCESS_TOKEN || "",
      accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || "",
      bearerToken,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to send Twitter DM",
      };
    }

    return {
      success: true,
      externalId: result.messageId,
    };
  },
};
