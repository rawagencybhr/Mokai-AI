import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const botId = searchParams.get('botId');
  if (!botId) {
    return new NextResponse('Missing botId', { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || origin;
  const redirectUri = `${baseUrl}/api/instagram/oauth/callback`;
  const appId = process.env.FACEBOOK_APP_ID;
  const oauthUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_basic,instagram_manage_messages,pages_show_list,pages_messaging&state=${encodeURIComponent(botId)}&response_type=code`;
  return NextResponse.redirect(oauthUrl);
}
