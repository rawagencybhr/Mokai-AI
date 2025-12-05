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

    // ❗ استخدم رابط ثابت 100% وليس url.origin
    const redirectUri = "https://mokai-ai.vercel.app/api/instagram/oauth/callback";

    const appId = process.env.FACEBOOK_APP_ID!;
    const appSecret = process.env.FACEBOOK_APP_SECRET!;

    // 1) تبادل code → access_token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
        `client_id=${appId}&client_secret=${appSecret}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&code=${code}`
    );

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return NextResponse.json(
        { error: "Failed to exchange code for access token", details: tokenData },
        { status: 500 }
      );
    }

    const userToken = tokenData.access_token;

    // 2) الحصول على الصفحات (يحتاج user_token)
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userToken}`
    );

    const pagesData = await pagesRes.json();

    if (!pagesData.data || pagesData.data.length === 0) {
      return NextResponse.json({ error: "No pages available" }, { status: 404 });
    }

    // 3) إيجاد الصفحة المرتبطة بإنستغرام
    const page = pagesData.data.find((p: any) => p.instagram_business_account);

    if (!page) {
      return NextResponse.json({ error: "No Instagram business page found" }, { status: 404 });
    }

    const pageToken = page.access_token;
    const igId = page.instagram_business_account.id;

    // 4) الحصول على معلومات حساب الإنستغرام
    const igRes = await fetch(
      `https://graph.facebook.com/v21.0/${igId}?fields=username&access_token=${pageToken}`
    );

    const igData = await igRes.json();

    if (!igData.username) {
      return NextResponse.json(
        { error: "Could not fetch Instagram username", details: igData },
        { status: 500 }
      );
    }

    // 5) حفظ البيانات في قاعدة البيانات
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
