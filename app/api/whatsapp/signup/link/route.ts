import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams, origin } = new URL(req.url);
    const botId = searchParams.get("botId");

    if (!botId) {
      return new NextResponse("Missing botId", { status: 400 });
    }

    const appId = process.env.FACEBOOK_APP_ID;
    const redirectUri = `${origin}/api/whatsapp/signup/callback`;

    const signupUrl =
      `https://www.facebook.com/v21.0/dialog/whatsapp_onboarding` +
      `?client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${botId}`;

    return NextResponse.json({ ok: true, url: signupUrl });

  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
