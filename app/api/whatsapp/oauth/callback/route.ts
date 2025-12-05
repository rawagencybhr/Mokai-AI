
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
    const redirectUri = `${origin}/api/whatsapp/oauth/callback`;

    // 1. Exchange Code for Access Token
    const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return new NextResponse(`Error exchanging token: ${tokenData.error.message}`, { status: 500 });
    }

    const accessToken = tokenData.access_token;
    
    // 2. Get User's WhatsApp Business Accounts (WABA)
    // We fetch businesses -> then client_whatsapp_business_accounts
    // Simplified flow: Get WABA directly if possible, or iterate. 
    // Usually, we query: /me?fields=id,name,accounts,businesses
    // But for WhatsApp specific, we need to find the WABA ID.
    // Let's try to get the user's businesses first.
    
    // A more direct approach for WhatsApp Onboarding is often getting the Shared WABA ID if using the embedded signup flow.
    // Since we are using standard OAuth, we need to discover the WABA.
    // We will assume the user has access to at least one WABA.
    
    // Step 2a: Get User's Businesses (optional, but good for context) or try to get WABAs linked to the user.
    // The most reliable way with 'whatsapp_business_management' scope is to query the user's WABAs.
    // However, the Graph API doesn't have a direct "/me/whatsapp_business_accounts" endpoint commonly exposed.
    // We often have to go through businesses.
    
    // ALTERNATIVE: Get the first Business, then get its WABAs.
    const businessesUrl = `https://graph.facebook.com/v21.0/me/businesses?access_token=${accessToken}`;
    const busRes = await fetch(businessesUrl);
    const busData = await busRes.json();
    
    let wabaId = null;
    let phoneNumberId = null;
    let phoneNumber = null;

    if (busData.data && busData.data.length > 0) {
        // Iterate through businesses to find a WABA
        for (const business of busData.data) {
            const wabaUrl = `https://graph.facebook.com/v21.0/${business.id}/client_whatsapp_business_accounts?access_token=${accessToken}`;
            const wabaRes = await fetch(wabaUrl);
            const wabaData = await wabaRes.json();
            
            if (wabaData.data && wabaData.data.length > 0) {
                wabaId = wabaData.data[0].id; // Take the first WABA found
                break;
            }
        }
    }

    // If we found a WABA, get the phone numbers
    if (wabaId) {
        const numbersUrl = `https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?access_token=${accessToken}`;
        const numbersRes = await fetch(numbersUrl);
        const numbersData = await numbersRes.json();
        
        if (numbersData.data && numbersData.data.length > 0) {
            phoneNumberId = numbersData.data[0].id;
            phoneNumber = numbersData.data[0].display_phone_number;
        }
    }

    if (!phoneNumberId) {
         return new NextResponse('Could not find a WhatsApp Phone Number connected to your account.', { status: 404 });
    }

    // 3. Save to Firestore
    const botRef = doc(db, 'bots', botId);
    await updateDoc(botRef, {
      whatsappConnected: true,
      whatsappAccessToken: accessToken,
      whatsappBusinessAccountId: wabaId,
      whatsappPhoneNumberId: phoneNumberId,
      whatsappPhoneNumber: phoneNumber,
    });

    return NextResponse.redirect(`${origin}/dashboard?success=true`);

  } catch (error: any) {
    return new NextResponse(`Internal Error: ${error.message}`, { status: 500 });
  }
}
