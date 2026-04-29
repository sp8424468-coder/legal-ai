// app/api/translate/route.ts
import { openai } from "@/lib/openai";

export async function POST(req: Request) {
  try {
    const { text, language } = await req.json();

    if (!text || !language) {
      return Response.json({ error: "Missing text or language" }, { status: 400 });
    }

    if (language === "English") {
      return Response.json({ translated: text });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a translator. Translate the text to ${language}. 
Return ONLY the translated text. No explanations, no markdown, no quotes.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.1,
      max_tokens: 1000,
    });

    const translated = response.choices[0].message.content?.trim() || text;
    return Response.json({ translated });

  } catch (error) {
    console.error("❌ Translate API error:", error);
    return Response.json({ error: "Translation failed" }, { status: 500 });
  }
}