export async function sendInstagramMessage(
  businessId: string,
  recipientId: string,
  text: string,
  accessToken: string
) {
  const url = `https://graph.facebook.com/v21.0/${businessId}/messages`;

  console.log("📤 Sending IG Message", {
    businessId,
    recipientId,
    text,
    hasToken: !!accessToken
  });

  const payload = {
    recipient: { id: recipientId },
    message: { text }
  };

  try {
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

    return data;
  } catch (err) {
    console.error("❌ Network IG Error:", err);
    throw err;
  }
}
