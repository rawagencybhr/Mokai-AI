export async function sendInstagramMessage(
  businessId: string,
  recipientId: string,
  text: string,
  accessToken: string
) {
  const url = `https://graph.facebook.com/v21.0/${businessId}/messages?access_token=${accessToken}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text }
      })
    });

    const data = await response.json();
    console.log("📤 IG SEND RESPONSE:", data);

    if (!response.ok) {
      console.error("❌ IG Send Error:", data);
    }

    return data;
  } catch (err) {
    console.error("❌ Network send error:", err);
  }
}
