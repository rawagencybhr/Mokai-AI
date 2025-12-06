export async function sendInstagramMessage(
  pageId: string,       // MUST be PAGE ID
  recipientId: string,
  text: string,
  accessToken: string
) {
  const url = `https://graph.facebook.com/v21.0/${pageId}/messages`;

  console.log("📤 Sending IG Message", {
    pageId,
    recipientId,
    text,
    hasToken: !!accessToken
  });

  const payload = {
    messaging_type: "RESPONSE",
    recipient: { id: recipientId },
    message: { text },
    access_token: accessToken // token MUST be inside body
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (data.error) {
    console.error("❌ IG API Error:", data.error);
    throw new Error(data.error.message);
  }

  return data;
}
