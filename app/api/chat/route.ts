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

STRICT RULES:
- Always answer ONLY using the provided document context
- Do NOT hallucinate or add external legal knowledge
- Keep answers simple and clear (2–4 sentences)
- If something is risky, clearly mention ⚠️ HIGH RISK or MEDIUM RISK
- If answer is not found, say: "This is not mentioned in the document"

LANGUAGE RULE:
- First understand the answer in English internally
- Then translate the FINAL answer into ${language}
- Do NOT change meaning during translation

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

    let answer =
      response.choices[0].message.content ||
      "Sorry, I couldn't generate a response.";

    // 🔥 EXTRA SAFETY (very important)
    if (!answer || answer.trim().length === 0) {
      answer = "⚠️ Failed to generate a response. Please try again.";
    }

    return Response.json({ answer });
  } catch (error) {
    console.error("❌ Chat API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}