import { NextResponse } from "next/server";

/**
 * Generate TwiML for voice calls
 * This creates a bridge call: calls YOU first, then connects to contact
 */
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const to = searchParams.get("to");

  if (!to) {
    // No destination provided - just a greeting
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello! This is a call from your unified outreach platform.</Say>
  <Pause length="1"/>
  <Say voice="alice">Thank you for calling. Goodbye!</Say>
</Response>`;

    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  }

  // Bridge call: You answer, then it dials the contact
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting you to the contact. Please wait.</Say>
  <Dial timeout="30" callerId="${process.env.TWILIO_PHONE_NUMBER}" action="${process.env.NEXT_PUBLIC_APP_URL}/api/calls/twiml/complete">
    <Number>${to}</Number>
  </Dial>
</Response>`;

  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}

export async function GET(req: Request) {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello! This is a test call from your unified outreach platform.</Say>
  <Pause length="1"/>
  <Say voice="alice">Thank you for testing. Goodbye!</Say>
</Response>`;

  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}
