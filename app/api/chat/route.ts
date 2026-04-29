// app/api/chat/route.ts
import { openai } from "@/lib/openai";
import { getDocument } from "@/lib/documentStore";

export async function POST(req: Request) {
  try {
    const { question, history, language = "English" } = await req.json();

    if (!question) {
      return Response.json({ error: "No question provided" }, { status: 400 });
    }

    const doc = getDocument();

    if (!doc) {
      return Response.json(
        { error: "No document analyzed yet. Please upload a document first." },
        { status: 400 }
      );
    }

    const context = `
Document Summary: ${doc.summary}
Overall Risk Level: ${doc.risk_level}

Clauses:
${doc.clauses
  .map(
    (c, i) => `
Clause ${i + 1}:
- Original: ${c.original}
- Simple English: ${c.simple}
- Risky: ${c.risk ? "YES ⚠️" : "NO"}
- Reason: ${c.explanation}
`
  )
  .join("\n")}
`;

    const messages = [
      {
        role: "system" as const,
        content: `You are LexSimple, a friendly legal document assistant.
You have already analyzed a legal document. Use ONLY the context below to answer questions.
Rules:
- Answer in ${language} language
- Use plain, simple language (not legal jargon)
- Be concise (2-4 sentences max)
- If a clause is risky, mention ⚠️ HIGH RISK or MEDIUM RISK
- If the answer is not in the document, say so clearly
- Never give general legal advice outside the document

DOCUMENT CONTEXT:
${context}`,
      },
      ...(history || []),
      { role: "user" as const, content: question },
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.3,
      max_tokens: 400,
    });

    const answer =
      response.choices[0].message.content ||
      "Sorry, I couldn't generate a response.";

    return Response.json({ answer });
  } catch (error) {
    console.error("❌ Chat API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}