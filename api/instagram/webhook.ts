export default function handler(req, res) {
  const VERIFY_TOKEN = "mokai2025";

  // Step 1: Handle verification GET request
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verified successfully!");
      return res.status(200).send(challenge);
    } else {
      return res.status(403).send("Verification token mismatch");
    }
  }

  // Step 2: Handle POST (real webhook data)
  if (req.method === "POST") {
    console.log("Webhook update received:", req.body);
    return res.status(200).send("EVENT_RECEIVED");
  }

  res.status(404).send("Not Found");
}
