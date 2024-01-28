import { kv } from "@vercel/kv";
import { Ratelimit } from "@upstash/ratelimit";
import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const runtime = "edge";

export async function POST(req: Request) {
  try {
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
    const customAssistantId = 'asst_UDH8qj0FDTTJnWSgBGBOTAGj';

    const threadResponse = await openai.beta.threads.createAndRun({
      assistant_id: customAssistantId,
      thread: {
        messages: messages.map(message => ({
          role: 'user', 
          content: message.text || "Default content"
        }))
      }
    });

    if (!threadResponse) {
      throw new Error("No response body from OpenAI API");
    }

    const readableStream = new ReadableStream({
      start(controller) {
        function typeMessage(message, index = 0) {
          if (index < message.length) {
            const delay = Math.random() * 15; // Delay acak untuk simulasi mengetik
            const nextIndex = index + 1;
            controller.enqueue(new TextEncoder().encode(message.slice(index, nextIndex))); // Kirim satu karakter
            setTimeout(() => typeMessage(message, nextIndex), delay);
          } else {
            controller.close();
          }
        }

        const message = threadResponse.choices?.[0]?.message?.content || "No response from assistant.";
        typeMessage(message);
      }
    });

    return new Response(readableStream, {
      headers: { 'Content-Type': 'text/plain' }
    });

  } catch (error) {
    console.error("An error occurred:", error);
    return new Response(JSON.stringify({ error: "An internal server error occurred." }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
}
