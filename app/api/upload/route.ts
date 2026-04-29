import { parsePDF } from "@/lib/pdfParser";
import mammoth from "mammoth";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    console.log("📂 File received:", file.name, file.type);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let text = "";

    // 📄 PDF
    if (file.type === "application/pdf") {
      console.log("📄 Processing PDF...");
      text = await parsePDF(buffer);
    }

    // 📄 DOCX
    else if (
      file.type.includes("word") ||
      file.name.endsWith(".docx")
    ) {
      console.log("📄 Processing DOCX...");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    }

    else {
      return Response.json(
        { error: "Unsupported file type" },
        { status: 400 }
      );
    }

    // ❗ Handle empty
    if (!text || text.trim() === "") {
      return Response.json({
        text: "⚠️ No text could be extracted from this file",
        preview: ""
      });
    }

    console.log("✅ Extraction successful");

    // 🔥 CLEAN PREVIEW (POINTS)
    const sentences = text
      .replace(/\n/g, " ")
      .split(".")
      .map(s => s.trim())
      .filter(s => s.length > 20)
      .slice(0, 5);

    const preview = sentences
      .map((s, i) => `${i + 1}. ${s}.`)
      .join("\n");

    return Response.json({
      text,
      preview
    });

  } catch (error: any) {
    console.error("❌ Upload error:", error);

    return Response.json(
      { error: "Server error while processing file" },
      { status: 500 }
    );
  }
}