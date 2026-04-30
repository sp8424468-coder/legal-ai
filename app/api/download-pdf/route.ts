export const runtime = "nodejs";

import PDFDocument from "pdfkit/js/pdfkit.standalone";
import { getDocument } from "@/lib/documentStore";

export async function GET() {
  try {
    const docData = getDocument();

    if (!docData) {
      return new Response("No document available", { status: 400 });
    }

    const { text, clauses, summary, risk_level } = docData;

    const doc = new PDFDocument();
    const chunks: Uint8Array[] = [];

    doc.on("data", (chunk: Uint8Array) => chunks.push(chunk));

    const endPromise = new Promise<Buffer>((resolve) => {
      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
    });

    // 🔹 Title
    doc.fontSize(20).text("Legal Document Analysis", { align: "center" });
    doc.moveDown();

    // 🔹 Risk Level
    doc.fontSize(14).text(`Overall Risk Level: ${risk_level}`);
    doc.moveDown();

    // 🔹 Original Text
    doc.fontSize(16).text("Original Document (Preview):");
    doc.moveDown(0.5);
    doc.fontSize(10).text(text.slice(0, 2000));
    doc.moveDown();

    // 🔹 Simplified Clauses
    doc.fontSize(16).text("Simplified Clauses:");
    doc.moveDown(0.5);

    clauses.forEach((c, i) => {
      doc.fontSize(12).text(`${i + 1}. ${c.simple}`);
      if (c.risk) {
        doc.fillColor("red").text("⚠️ Risky Clause");
        doc.fillColor("black");
      }
      doc.moveDown(0.5);
    });

    doc.moveDown();

    // 🔹 Summary
    doc.fontSize(16).text("Final Summary:");
    doc.moveDown(0.5);
    doc.fontSize(12).text(summary);

    doc.end();

    const pdfBuffer = await endPromise;

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=legal-analysis.pdf",
      },
    });

  } catch (error) {
    console.error("PDF error:", error);
    return new Response("Failed to generate PDF", { status: 500 });
  }
}