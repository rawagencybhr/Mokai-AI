// lib/meta.ts

export async function sendInstagramMessage(
  instagramAccountId: string, // ✅ التعديل: نستخدم معرف حساب إنستغرام للأعمال
  recipientId: string,
  text: string,
  accessToken: string
) {
  // ✅ التعديل: الرابط يستخدم معرف إنستغرام (الذي يبدأ بـ 1784...)
  const url = `https://graph.facebook.com/v21.0/${instagramAccountId}/messages`;

  console.log("📤 Sending IG Message", {
    instagramAccountId,
    recipientId,
    text,
    hasToken: !!accessToken
  });

  const payload = {
    recipient: { id: recipientId },
    message: { text }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (data.error) {
    console.error("❌ IG API Error:", data.error);
    throw new Error(data.error.message);
  }

  console.log("✅ IG Message Sent:", data);
  return data;
}

// دالة الواتساب (صحيحة كما هي)
export async function sendWhatsAppMessage(
  phoneNumberId: string,
  to: string,
  text: string,
  accessToken: string
) {
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
   
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to,
        text: { body: text }
      })
    });

    const data = await response.json();
    if (data.error) {
      console.error('Error sending WhatsApp message:', data.error);
      throw new Error(data.error.message);
    }
    return data;
  } catch (error) {
    console.error('Network error sending WhatsApp message:', error);
    throw error;
  }
}
