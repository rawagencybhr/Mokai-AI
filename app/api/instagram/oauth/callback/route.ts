import { NextResponse } from "next/server";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebaseConfig";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const code = url.searchParams.get("code");
    const botId = url.searchParams.get("state");

    if (!code || !botId) {
      return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
    }

    const redirectUri = "https://mokai-ai.vercel.app/api/instagram/oauth/callback";

    const appId = process.env.FACEBOOK_APP_ID!;
    const appSecret = process.env.FACEBOOK_APP_SECRET!;

    //
    // 1) EXCHANGE CODE → TOKEN
    //
    const tokenUrl =
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
      `client_id=${appId}&client_secret=${appSecret}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&code=${code}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    console.log("🔵 STEP 1 TOKEN RESULT:", tokenData);

    if (!tokenData.access_token) {
      return NextResponse.json(
        { error: "Failed to exchange code", details: tokenData },
        { status: 500 }
      );
    }

    const userToken = tokenData.access_token;

    //
    // 2) GET PAGES
    //
    const pagesUrl =
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,instagram_business_account,access_token&access_token=${userToken}`;

    const pagesRes = await fetch(pagesUrl);
    const pagesData = await pagesRes.json();

    console.log("🟠 STEP 2 PAGES RESULT:", pagesData);

    const page = pagesData.data?.find((p: any) => p.instagram_business_account);

    if (!page) {
      return NextResponse.json(
        { 
          error: "No Instagram business page found", 
          pagesResult: pagesData 
        },
        { status: 404 }
      );
    }

    const pageToken = page.access_token;
    const igId = page.instagram_business_account.id;

    //
    // 3) GET IG USERNAME
    //
    const igUrl =
      `https://graph.facebook.com/v21.0/${igId}?fields=username&access_token=${pageToken}`;

    const igRes = await fetch(igUrl);
    const igData = await igRes.json();

    console.log("🟢 STEP 3 IG RESULT:", igData);

    if (!igData.username) {
      return NextResponse.json(
        { error: "Could not fetch username", igData },
        { status: 500 }
      );
    }

    //
    // 4) SAVE TO FIREBASE
    //
    await updateDoc(doc(db, "bots", botId), {
      instagramConnected: true,
      instagramUsername: igData.username,
      instagramBusinessId: igId,
      instagramPageId: page.id,
      instagramAccessToken: pageToken,
      connectedAt: new Date().toISOString(),
    });

    return NextResponse.redirect("https://mokai-ai.vercel.app/dashboard?instagram=connected");

  } catch (err: any) {
    console.error("❌ ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
