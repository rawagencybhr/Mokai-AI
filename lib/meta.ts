
export async function sendInstagramMessage(
  pageId: string,       // MUST be PAGE ID 
  recipientId: string,
  text: string,
  accessToken: string
) {
  const url = `https://graph.facebook.com/v21.0/${pageId}/messages`;

  console.log("📤 Sending IG Message (Corrected)", {
    pageId,
    recipientId,
    text,
    hasToken: !!accessToken
  });

  const payload = {
    messaging_type: "RESPONSE",
    recipient: { id: recipientId },
    message: { text }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,   // REQUIRED HERE 
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
