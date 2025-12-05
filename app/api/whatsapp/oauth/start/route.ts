
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const botId = searchParams.get('botId');

  if (!botId) {
    return new NextResponse('Missing botId', { status: 400 });
  }

  const appId = process.env.FACEBOOK_APP_ID;
  const redirectUri = `${new URL(req.url).origin}/api/whatsapp/oauth/callback`;
  
  // Scope required for WhatsApp Business Cloud API
  const scope = 'whatsapp_business_management,whatsapp_business_messaging';
  
  const fbUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&state=${botId}&response_type=code`;

  return NextResponse.redirect(fbUrl);
}
