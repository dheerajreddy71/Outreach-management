import twilio from "twilio";
import type { ChannelIntegration, TwilioConfig, TwilioWebhookPayload } from "@/types";

const config: TwilioConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID!,
  authToken: process.env.TWILIO_AUTH_TOKEN!,
  phoneNumber: process.env.TWILIO_PHONE_NUMBER!,
  whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER,
};

const client = twilio(config.accountSid, config.authToken);

/**
 * SMS Integration using Twilio
 */
export const smsIntegration: ChannelIntegration = {
  async send({ to, content, attachments }) {
    try {
      const messageOptions: any = {
        body: content,
        from: config.phoneNumber,
        to: to,
      };

      if (attachments && attachments.length > 0) {
        messageOptions.mediaUrl = attachments;
      }

      const message = await client.messages.create(messageOptions);

      return {
        success: true,
        externalId: message.sid,
      };
    } catch (error: any) {
      console.error("SMS send error:", error);
      return {
        success: false,
        error: error.message || "Failed to send SMS",
      };
    }
  },

  validateWebhook(payload: TwilioWebhookPayload) {
    return Boolean(payload.MessageSid && payload.From && payload.Body);
  },

  async processInbound(payload: TwilioWebhookPayload) {
    const attachments: string[] = [];
    
    if (payload.NumMedia && parseInt(payload.NumMedia) > 0) {
      for (let i = 0; i < parseInt(payload.NumMedia); i++) {
        const mediaUrl = payload[`MediaUrl${i}` as keyof TwilioWebhookPayload];
        if (mediaUrl) attachments.push(mediaUrl as string);
      }
    }

    return {
      from: payload.From,
      content: payload.Body,
      attachments,
      externalId: payload.MessageSid,
    };
  },
};

/**
 * WhatsApp Integration using Twilio
 */
export const whatsappIntegration: ChannelIntegration = {
  async send({ to, content, attachments }) {
    try {
      const whatsappNumber = config.whatsappNumber || config.phoneNumber;
      
      // Ensure the from number has whatsapp: prefix but not duplicate
      const fromNumber = whatsappNumber.startsWith("whatsapp:") 
        ? whatsappNumber 
        : `whatsapp:${whatsappNumber}`;
      
      // Ensure the to number has whatsapp: prefix but not duplicate
      const toNumber = to.startsWith("whatsapp:") 
        ? to 
        : `whatsapp:${to}`;
      
      const messageOptions: any = {
        body: content,
        from: fromNumber,
        to: toNumber,
      };

      if (attachments && attachments.length > 0) {
        messageOptions.mediaUrl = attachments;
      }

      const message = await client.messages.create(messageOptions);

      return {
        success: true,
        externalId: message.sid,
      };
    } catch (error: any) {
      console.error("WhatsApp send error:", error);
      return {
        success: false,
        error: error.message || "Failed to send WhatsApp message",
      };
    }
  },

  validateWebhook(payload: TwilioWebhookPayload) {
    return Boolean(
      payload.MessageSid &&
      payload.From &&
      payload.Body &&
      payload.From.includes("whatsapp:")
    );
  },

  async processInbound(payload: TwilioWebhookPayload) {
    const attachments: string[] = [];
    
    if (payload.NumMedia && parseInt(payload.NumMedia) > 0) {
      for (let i = 0; i < parseInt(payload.NumMedia); i++) {
        const mediaUrl = payload[`MediaUrl${i}` as keyof TwilioWebhookPayload];
        if (mediaUrl) attachments.push(mediaUrl as string);
      }
    }

    return {
      from: payload.From.replace("whatsapp:", ""),
      content: payload.Body,
      attachments,
      externalId: payload.MessageSid,
    };
  },
};

/**
 * Voice/Call Integration using Twilio
 */
export const voiceIntegration = {
  async makeCall({ to, url }: { to: string; url: string }) {
    try {
      const call = await client.calls.create({
        url: url,
        to: to,
        from: config.phoneNumber,
      });

      return {
        success: true,
        externalId: call.sid,
      };
    } catch (error: any) {
      console.error("Voice call error:", error);
      return {
        success: false,
        error: error.message || "Failed to make call",
      };
    }
  },

  async getCallDetails(callSid: string) {
    try {
      const call = await client.calls(callSid).fetch();
      return call;
    } catch (error: any) {
      console.error("Get call details error:", error);
      return null;
    }
  },
};

/**
 * Fetch available Twilio phone numbers
 */
export async function fetchAvailableTwilioNumbers(areaCode?: string) {
  try {
    const listOptions: any = {
      limit: 20,
    };
    
    if (areaCode) {
      listOptions.areaCode = parseInt(areaCode, 10);
    }
    
    const numbers = await client.availablePhoneNumbers("US").local.list(listOptions);

    return numbers.map((number) => ({
      phoneNumber: number.phoneNumber,
      friendlyName: number.friendlyName,
      capabilities: {
        voice: number.capabilities.voice,
        sms: number.capabilities.sms || false,
        mms: number.capabilities.mms || false,
      },
    }));
  } catch (error: any) {
    console.error("Fetch available numbers error:", error);
    return [];
  }
}

/**
 * Buy a Twilio phone number
 */
export async function buyTwilioNumber(phoneNumber: string) {
  try {
    const number = await client.incomingPhoneNumbers.create({
      phoneNumber: phoneNumber,
      smsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`,
      smsMethod: "POST",
      voiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio-voice`,
      voiceMethod: "POST",
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio-status`,
      statusCallbackMethod: "POST",
    });

    return {
      success: true,
      phoneNumber: number.phoneNumber,
      sid: number.sid,
    };
  } catch (error: any) {
    console.error("Buy number error:", error);
    return {
      success: false,
      error: error.message || "Failed to buy number",
    };
  }
}

/**
 * Validate Twilio webhook signature
 */
export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, any>
): boolean {
  return twilio.validateRequest(
    config.authToken,
    signature,
    url,
    params
  );
}

const twilioExports = {
  sms: smsIntegration,
  whatsapp: whatsappIntegration,
  voice: voiceIntegration,
  fetchAvailableNumbers: fetchAvailableTwilioNumbers,
  buyNumber: buyTwilioNumber,
  validateWebhook: validateTwilioSignature,
};

export default twilioExports;
