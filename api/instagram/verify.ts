export const config = {
  runtime: "edge",
};

export default async function handler(request: Request) {
  const url = new URL(request.url);

  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
}
