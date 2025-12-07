import { NextRequest, NextResponse } from "next/server";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams, origin } = new URL(req.url);

    const botId = searchParams.get("state");
    const wabaId = searchParams.get("waba_id");
    const phoneNumberId = searchParams.get("phone_number_id");
    const accessToken = searchParams.get("access_token");

    if (!botId) {
      return new NextResponse("Missing botId (state)", { status: 400 });
    }

    if (!wabaId || !phoneNumberId || !accessToken) {
      return new NextResponse("Missing WhatsApp signup params", { status: 400 });
    }

    // Get display phone number
    const phoneRes = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=display_phone_number&access_token=${accessToken}`
    );
    const phoneData = await phoneRes.json();

    const displayPhone = phoneData?.display_phone_number || "Unknown";

    // Save to Firestore
    await updateDoc(doc(db, "bots", botId), {
      whatsappConnected: true,
      whatsappAccessToken: accessToken,
      wabaId,
      phoneNumberId,
      phoneNumber: displayPhone,
      updatedAt: Date.now(),
    });

    return NextResponse.redirect(`${origin}/dashboard?whatsapp=connected`);

  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
