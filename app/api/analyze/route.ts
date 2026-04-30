import { openai } from "@/lib/openai";
import { setDocument } from "@/lib/documentStore"; // ← ADD THIS IMPORT

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return Response.json({ error: "No text provided" }, { status: 400 });
    }

    const prompt = `
You are an expert legal assistant.

Your task:
1. Break the document into clauses
2. Simplify each clause in plain English
3. Identify risky clauses (true/false)
4. Explain why it is risky
5. Provide a summary starting with:
"By signing this document, you are agreeing to..."

Return STRICT JSON ONLY. Do NOT include any explanation or markdown.

{
  "clauses": [
    {
      "original": "",
      "simple": "",
      "risk": true,
      "explanation": ""
    }
  ],
  "summary": "",
  "risk_level": "Low/Medium/High"
}

Document:
${text}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Return ONLY valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    });

    let resultText = response.choices[0].message.content || "";

    // Remove ```json ``` if AI adds it
    resultText = resultText.replace(/```json/g, "").replace(/```/g, "").trim();

    let parsedResult;

    try {
      parsedResult = JSON.parse(resultText);
    } catch (err) {
      console.error("❌ JSON parse failed:", resultText);
      return Response.json(
        { error: "AI returned invalid JSON" },
        { status: 500 }
      );
    }

    setDocument({
      text,
      ...parsedResult,
    }); // ← ADD THIS LINE (stores result for chatbot)

    return Response.json({ result: parsedResult });

  } catch (error) {
    console.error("❌ Analyze API error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}