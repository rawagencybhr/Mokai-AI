import { NextRequest, NextResponse } from "next/server";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const botId = searchParams.get("state");

  if (!code || !botId) {
    return new NextResponse("Missing code or state", { status: 400 });
  }

  try {
    // ---------------------------------------
    // 1) Exchange code for access_token
    // ---------------------------------------
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = `${origin}/api/whatsapp/oauth/callback`;

    const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("❌ Token Error:", tokenData.error);
      return new NextResponse(`Error getting token: ${tokenData.error.message}`, { status: 500 });
    }

    const accessToken = tokenData.access_token;

    // ---------------------------------------
    // 2) Get WhatsApp Business Accounts directly
    // ---------------------------------------
    const wabaRes = await fetch(
      `https://graph.facebook.com/v21.0/me/whatsapp_business_accounts?access_token=${accessToken}`
    );
    const wabaData = await wabaRes.json();

    if (!wabaData.data?.length) {
      return new NextResponse("No WhatsApp Business Account found.", { status: 404 });
    }

    const wabaId = wabaData.data[0].id;

    // ---------------------------------------
    // 3) Get phone numbers for this WABA
    // ---------------------------------------
    const numRes = await fetch(
      `https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?access_token=${accessToken}`
    );
    const numData = await numRes.json();

    if (!numData.data?.length) {
      return new NextResponse(
        "No phone numbers found in this WhatsApp Business Account.",
        { status: 404 }
      );
    }

    const phone = numData.data[0];
    const phoneNumberId = phone.id;
    const displayPhone = phone.display_phone_number;

    // ---------------------------------------
    // 4) Save to Firestore
    // ---------------------------------------
    const botRef = doc(db, "bots", botId);
    await updateDoc(botRef, {
      whatsappConnected: true,
      whatsappAccessToken: accessToken,
      wabaId: wabaId,
      phoneNumberId: phoneNumberId,
      phoneNumber: displayPhone,
      updatedAt: Date.now(),
    });

    // ---------------------------------------
    // 5) Redirect to dashboard
    // ---------------------------------------
    return NextResponse.redirect(`${origin}/dashboard?whatsapp=connected`);

  } catch (err: any) {
    console.error("🔥 Internal Error:", err);
    return new NextResponse(`Internal Error: ${err.message}`, { status: 500 });
  }
}
