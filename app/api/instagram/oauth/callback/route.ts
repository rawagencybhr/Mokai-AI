import { NextRequest, NextResponse } from "next/server";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebaseConfig";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const code = searchParams.get("code");
    const botId = searchParams.get("state");

    if (!code || !botId) {
      return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/instagram/oauth/callback`;

    const appId = process.env.FACEBOOK_APP_ID!;
    const appSecret = process.env.FACEBOOK_APP_SECRET!;

    // =============================================
    // STEP 1 — EXCHANGE CODE → USER TOKEN
    // =============================================
    const tokenUrl =
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
      `client_id=${appId}&client_secret=${appSecret}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&code=${code}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    console.log("🔵 STEP 1 TOKEN RESULT:", tokenData);

    if (!tokenData.access_token) {
      return NextResponse.json({ error: "Failed to exchange code", details: tokenData });
    }

    const userToken = tokenData.access_token;

    // =============================================
    // STEP 2 — GET PAGES FOR THIS USER
    // =============================================
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,instagram_business_account,access_token&access_token=${userToken}`
    );
    const pagesData = await pagesRes.json();

    console.log("🟠 STEP 2 PAGES RESULT:", pagesData);

    const page = pagesData.data?.find((p: any) => p.instagram_business_account);

    if (!page) {
      return NextResponse.json({
        error: "No Instagram business page found",
        pagesData,
      });
    }

    const fbPageId = page.id;                         // Facebook Page ID
    const igBusinessId = page.instagram_business_account.id;  // IG Business ID (USED IN WEBHOOK)
    const pageToken = page.access_token;              // Page Access Token

    // =============================================
    // STEP 3 — GET USERNAME
    // =============================================
    const igRes = await fetch(
      `https://graph.facebook.com/v21.0/${igBusinessId}?fields=username&access_token=${pageToken}`
    );
    const igData = await igRes.json();

    console.log("🟢 STEP 3 IG RESULT:", igData);

    if (!igData.username) {
      return NextResponse.json({ error: "Could not fetch IG username", igData });
    }

    // =============================================
    // STEP 4 — SAVE TO FIREBASE
    // =============================================
    await updateDoc(doc(db, "bots", botId), {
      instagramConnected: true,
      instagramUsername: igData.username,
      instagramBusinessId: igBusinessId,

      // ✔ IMPORTANT — WEBHOOK USES THIS
      instagramPageId: igBusinessId,

      // ✔ KEEP FACEBOOK ID SEPARATELY
      facebookPageId: fbPageId,

      instagramAccessToken: pageToken,
      connectedAt: new Date().toISOString(),
    });

    return NextResponse.redirect(`${baseUrl}/dashboard?instagram=connected`);

  } catch (err: any) {
    console.error("❌ ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
