import { kv } from "@vercel/kv";
import { Ratelimit } from "@upstash/ratelimit";
import OpenAI from "openai";

export const runtime = "edge";

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development" &&
      process.env.KV_REST_API_URL &&
      process.env.KV_REST_API_TOKEN) {
    
    const ip = req.headers.get("x-forwarded-for");
    const ratelimit = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(50, "1 d"),
    });

    const { success, limit, reset, remaining } = await ratelimit.limit(`chathn_ratelimit_${ip}`);

    if (!success) {
      return new Response("You have reached your request limit for the day.", {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      });
    }
  }

  const { messages } = await req.json();
  const formattedMessages = messages.map(message => ({ ...message, role: 'user' }));

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const customAssistantId = 'asst_UDH8qj0FDTTJnWSgBGBOTAGj'; // Ganti dengan ID assistant Anda

  try {
    const run = await openai.beta.threads.createAndRun({
      assistant_id: customAssistantId,
      thread: {
        messages: messages,
      },
    });

    if (run) {
      return new Response(JSON.stringify({ result: run }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } else {
      return new Response(JSON.stringify({ error: "No response from assistant." }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  } catch (error) {
    console.error("An error occurred while processing the request:", error);
    return new Response(JSON.stringify({ error: "An internal server error occurred." }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
}
