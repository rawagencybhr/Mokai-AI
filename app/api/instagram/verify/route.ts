// =============================================
// Instagram Webhook (GET + POST)
// route.ts
// =============================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    // Token stored in your environment variable
    const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN;

    // Verify webhook challenge
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    return new Response("Forbidden", { status: 403 });

  } catch (error) {
    console.error("❌ Error in GET verification:", error);
    return new Response("Server Error", { status: 500 });
  }
}

// =============================================
// POST — Receive Instagram Webhook Events
// =============================================

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("📩 Instagram Webhook Event Received:", JSON.stringify(body, null, 2));

    // Meta requires your server to return 200 immediately
    return new Response("EVENT_RECEIVED", { status: 200 });

  } catch (error) {
    console.error("❌ Error handling Instagram POST event:", error);
    return new Response("Server Error", { status: 500 });
  }
}
