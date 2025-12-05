export async function GET(request: Request) {
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/instagram/oauth/callback`;
  const appId = process.env.FACEBOOK_APP_ID;
  const oauthUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_basic,instagram_manage_messages,pages_show_list,pages_messaging&response_type=code`;
  return Response.redirect(oauthUrl);
}
