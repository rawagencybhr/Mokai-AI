import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const botId = searchParams.get('state');

  if (!code || !botId) {
    return new NextResponse('Missing code or state', { status: 400 });
  }

  try {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = `${origin}/api/instagram/oauth/callback`;

    // 1. Exchange Code
    const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return new NextResponse(`Error exchanging token: ${tokenData.error.message}`, { status: 500 });
    }

    const shortLivedToken = tokenData.access_token;
    
    // 2. Get User ID
    let userId = tokenData.user_id;
    if (!userId) {
       const meRes = await fetch(`https://graph.facebook.com/me?access_token=${shortLivedToken}`);
       const meData = await meRes.json();
       userId = meData.id;
    }

    // 3. Get Pages
    const pagesUrl = `https://graph.facebook.com/v21.0/me/accounts?access_token=${shortLivedToken}&fields=id,name,access_token,instagram_business_account`;
    const pagesRes = await fetch(pagesUrl);
    const pagesData = await pagesRes.json();

    if (!pagesData.data || pagesData.data.length === 0) {
      return new NextResponse('No pages found', { status: 404 });
    }

    const connectedPage = pagesData.data.find((p: any) => p.instagram_business_account);
    if (!connectedPage) {
      return new NextResponse('No Instagram Business Account connected', { status: 404 });
    }

    // 4. Get IG Username
    const igDetailsUrl = `https://graph.facebook.com/v21.0/${connectedPage.instagram_business_account.id}?fields=username&access_token=${connectedPage.access_token}`;
    const igRes = await fetch(igDetailsUrl);
    const igDetails = await igRes.json();

    // 5. Save to Firestore
    const botRef = doc(db, 'bots', botId);
    await updateDoc(botRef, {
      instagramConnected: true,
      instagramAccessToken: connectedPage.access_token,
      instagramBusinessId: connectedPage.instagram_business_account.id,
      instagramUserId: userId,
      instagramPageId: connectedPage.id,
      instagramUsername: igDetails.username,
      connectedAt: new Date().toISOString()
    });

    return NextResponse.redirect(`${origin}/dashboard?success=true`);

  } catch (error: any) {
    return new NextResponse(`Internal Error: ${error.message}`, { status: 500 });
  }
}