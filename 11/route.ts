
import { kv } from "@vercel/kv";
import { Ratelimit } from "@upstash/ratelimit";

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

  const customAssistantId = 'asst_UDH8qj0FDTTJnWSgBGBOTAGj'; // Ganti dengan ID assistant Anda

  try {
    const response = await fetch(`https://api.openai.com/v1/assistants/${customAssistantId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({ messages })
    });

    const responseData = await response.json();

    if (response.ok) {
      const result = responseData.choices && responseData.choices.length > 0
        ? responseData.choices[0].message.content
        : "No response from assistant.";

      return new Response(JSON.stringify({ result }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } else {
      console.error("Failed to get response from the assistant: ", responseData);
      return new Response(JSON.stringify({ error: "Failed to get response from the assistant." }), {
        headers: { 'Content-Type': 'application/json' },
        status: response.status
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
