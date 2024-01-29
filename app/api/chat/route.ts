import { kv } from "@vercel/kv";
import { Ratelimit } from "@upstash/ratelimit";
import { OpenAI } from "openai";
import {
  OpenAIStream,
  StreamingTextResponse,
} from "ai";
import { functions, runFunction } from "./functions";

// Create an OpenAI API client (that's edge friendly!)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = "edge";

export async function POST(req: Request) {
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.KV_REST_API_URL &&
    process.env.KV_REST_API_TOKEN
  ) {
    const ip = req.headers.get("x-forwarded-for");
    const ratelimit = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(50, "1 d"),
    });

    const { success, limit, reset, remaining } = await ratelimit.limit(
      `chathn_ratelimit_${ip}`,
    );

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

  const reqBody = await req.json();
  const userMessages = reqBody.messages || [];

  // Initial message from 'system' role
  const systemMessage = {
    role: "system",
    content: "Lu adalah AICO, asisten virtual berbahasa Indonesia yang bertugas membantu mengembangkan konten TikTok untuk influencer besar. Sekarang, lu punya kemampuan untuk mengakses dan menganalisis data dari mana aja'. Lu bisa ngasih insight tentang tren, statistik audiens, dan topik populer berdasarkan data tersebut. Tugas-tugas lu termasuk:\n\n- Menilai skrip video TikTok dan memberikan penilaian berdasarkan analisis data.\n\n1. Judul: [Judul yang menarik berdasarkan tren]\n2. Analisis Konten: [Analisis konten berdasarkan data JSON]\n3. Skor Potensi Viral: [Berdasarkan data dan analisis]\n4. Estimasi Jumlah Suka: [Berdasarkan tren dan data]\n\nKarakter lu bergaya 'Gue' dan 'Lu', dengan kepribadian INFJ dan zodiak Gemini. Moto lu 'Artificial Intelligence for Creative Opportunities', menekankan penggunaan AI untuk membuka peluang baru di industri kreatif. Setelah lu sudah memberikan semuannya pastikan lu memberikan saran untuk improvisasi konten yang sekiranya cocok dan pas untuk audiens pada konteks dan berikan pendekatan berupa emoji dan slang wkwkk."
  };

  const initialResponse = await openai.chat.completions.create({
    model: "gpt-4-0125-preview",
    messages: [systemMessage, ...userMessages],
    stream: true,
    functions,
    function_call: "auto",
  });

  const stream = OpenAIStream(initialResponse, {
    experimental_onFunctionCall: async (
      { name, arguments: args },
      createFunctionCallMessages,
    ) => {
      const result = await runFunction(name, args);
      const newMessages = createFunctionCallMessages(result);
      return openai.chat.completions.create({
        model: "gpt-4-0125-preview",
        stream: true,
        messages: [...userMessages, ...newMessages],
      });
    },
  });

  return new StreamingTextResponse(stream);
}
