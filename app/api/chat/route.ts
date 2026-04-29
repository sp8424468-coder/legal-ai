import { openai } from "@/lib/openai";
import { getDocument } from "@/lib/documentStore";

export async function POST(req: Request) {
  try {
    const { question, history } = await req.json();

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

    // Build context from stored analysis
    const context = `
Document Summary: ${doc.summary}
Overall Risk Level: ${doc.risk_level}

Clauses:
${doc.clauses
  .map(
    (c, i) => `
Clause ${i + 1}:
- Original: ${c.original}
- Simple: ${c.simple}
- Risky: ${c.risk ? "YES" : "NO"}
- Reason: ${c.explanation}
`
  )
  .join("\n")}
`;

    const messages = [
      {
        role: "system" as const,
        content: `You are a legal document assistant for LexSimple.
You have analyzed a legal document. Use ONLY the document context below to answer questions.
If the answer is not in the document, say "I couldn't find that in the document."
Always mention risk level when relevant.
Keep answers short, clear, and in plain English.

DOCUMENT CONTEXT:
${context}`,
      },
      // Include conversation history
      ...history,
      { role: "user" as const, content: question },
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.3,
      max_tokens: 500,
    });

    const answer = response.choices[0].message.content || "No response.";

    return Response.json({ answer });
  } catch (error) {
    console.error("❌ Chat API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}