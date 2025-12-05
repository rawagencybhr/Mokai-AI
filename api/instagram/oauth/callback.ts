


import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const botId = url.searchParams.get('state');

  if (!code || !botId) {
    return new Response('Missing code or state', { status: 400 });
  }

  try {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = `${url.origin}/api/instagram/oauth/callback`;

    // 1. Exchange Code for Short-Lived Access Token
    const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`;
    
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return new Response(`Error exchanging token: ${tokenData.error.message}`, { status: 500 });
    }

    const shortLivedToken = tokenData.access_token;
    
    // Fetch User ID explicitly if not present (usually needed for logging or mapping)
    let userId = tokenData.user_id;
    if (!userId) {
       const meRes = await fetch(`https://graph.facebook.com/me?access_token=${shortLivedToken}`);
       const meData = await meRes.json();
       userId = meData.id;
    }

    // 2. Get User's Pages to find the one connected to Instagram
    const pagesUrl = `https://graph.facebook.com/v21.0/me/accounts?access_token=${shortLivedToken}&fields=id,name,access_token,instagram_business_account`;
    const pagesRes = await fetch(pagesUrl);
    const pagesData = await pagesRes.json();

    if (!pagesData.data || pagesData.data.length === 0) {
      return new Response('No pages found for this user.', { status: 404 });
    }

    // Find first page with connected instagram account
    const connectedPage = pagesData.data.find((p: any) => p.instagram_business_account);

    if (!connectedPage) {
      return new Response('No Instagram Business Account connected to your Facebook Pages.', { status: 404 });
    }

    const pageId = connectedPage.id;
    const pageAccessToken = connectedPage.access_token;
    const instagramBusinessId = connectedPage.instagram_business_account.id;

    // 3. Get Instagram Details (Username)
    const igDetailsUrl = `https://graph.facebook.com/v21.0/${instagramBusinessId}?fields=username&access_token=${pageAccessToken}`;
    const igDetailsRes = await fetch(igDetailsUrl);
    const igDetails = await igDetailsRes.json();

    // 4. Exchange for Long-Lived Token
    // Note: The Page Access Token is typically long-lived. We use it for bot actions.
    const finalToken = pageAccessToken; 

    // 5. Save to Firestore
    const botRef = doc(db, 'bots', botId);
    
    await updateDoc(botRef, {
      instagramConnected: true,
      instagramAccessToken: finalToken,
      instagramBusinessId: instagramBusinessId,
      instagramUserId: userId, // Saved as requested
      instagramPageId: pageId, // Saved as pageId
      instagramUsername: igDetails.username,
      longLivedToken: finalToken,
      connectedAt: new Date().toISOString()
    } as any);

    // 6. Redirect back to dashboard
    return Response.redirect(`${url.origin}?success=true`);

  } catch (error: any) {
    console.error('OAuth Callback Error:', error);
    return new Response(`Internal Error: ${error.message}`, { status: 500 });
  }
}
