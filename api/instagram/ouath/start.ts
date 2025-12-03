


export default function handler(request: Request) {
  const url = new URL(request.url);
  const botId = url.searchParams.get('botId');

  if (!botId) {
    return new Response('Missing botId', { status: 400 });
  }

  const appId = process.env.FACEBOOK_APP_ID;
  const redirectUri = `${url.origin}/api/instagram/oauth/callback`;
  // Scope required for Instagram Messaging
  const scope = 'instagram_basic,instagram_manage_messages,pages_show_list,pages_messaging';
  
  // Construct Facebook OAuth URL
  const fbUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&state=${botId}&response_type=code`;

  return Response.redirect(fbUrl);
}
