
export async function sendInstagramMessage(
  businessId: string, 
  recipientId: string, 
  text: string, 
  accessToken: string
) {
  const url = `https://graph.facebook.com/v21.0/${businessId}/messages`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: text }
      })
    });

    const data = await response.json();
    if (data.error) {
      console.error('Error sending Instagram message:', data.error);
      throw new Error(data.error.message);
    }
    return data;
  } catch (error) {
    console.error('Network error sending Instagram message:', error);
    throw error;
  }
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
