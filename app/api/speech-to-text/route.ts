import { NextRequest, NextResponse } from "next/server";
import { speechClient } from "@/lib/speechService";

export async function POST(req: NextRequest) {
  try {
    const { audioBase64 } = await req.json();

    const audio = { content: audioBase64 };

    const config = {
      encoding: "WEBM_OPUS",
      sampleRateHertz: 48000,
      languageCode: "ar-SA",
    } as any;

    const request = { audio, config } as any;

    const [response] = await speechClient.recognize(request);
    const transcription = response.results
      ?.map((result: any) => result.alternatives?.[0]?.transcript)
      ?.join("\n");

    return NextResponse.json({ text: transcription || "" });
  } catch (err) {
    console.error("Speech-to-text error:", err);
    return NextResponse.json({ error: "Speech processing failed" }, { status: 500 });
  }
}

