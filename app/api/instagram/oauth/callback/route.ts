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

    const appId = process.env.FACEBOOK_APP_ID!;
    const appSecret = process.env.FACEBOOK_APP_SECRET!;
    const redirectUri = `${url.origin}/api/instagram/oauth/callback`;

    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return NextResponse.json({ error: tokenData.error.message }, { status: 500 });
    }

    const shortLived = tokenData.access_token;

    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?access_token=${shortLived}&fields=id,name,access_token,instagram_business_account`
    );
    const pages = await pagesRes.json();

    const page = pages.data?.find((p: any) => p.instagram_business_account);
    if (!page) {
      return NextResponse.json({ error: "No Instagram business page found" }, { status: 404 });
    }

    const pageToken = page.access_token;
    const igId = page.instagram_business_account.id;

    const igRes = await fetch(
      `https://graph.facebook.com/v21.0/${igId}?fields=username&access_token=${pageToken}`
    );
    const igData = await igRes.json();

    await updateDoc(doc(db, "bots", botId), {
      instagramConnected: true,
      instagramUsername: igData.username,
      instagramBusinessId: igId,
      instagramPageId: page.id,
      instagramAccessToken: pageToken,
      connectedAt: new Date().toISOString(),
    });

    return NextResponse.redirect(`${url.origin}/?success=true`);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
