import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const botId = searchParams.get("botId");

    if (!botId) {
      return new NextResponse("Missing botId", { status: 400 });
    }

    // ===== Try Embedded Signup First =====
    const signupRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/whatsapp/signup/link?botId=${botId}`);
    const signupData = await signupRes.json();

    if (signupData?.url) {
      return NextResponse.json({ url: signupData.url });
    }

    // ===== Fallback to OAuth =====
    const oauthRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/whatsapp/oauth/link?botId=${botId}`);
    const oauthData = await oauthRes.json();

    return NextResponse.json({ url: oauthData.url });

  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
