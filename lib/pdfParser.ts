const pdf = require("pdf-parse/lib/pdf-parse");

export async function parsePDF(buffer: Buffer) {
  const data = await pdf(buffer);
  return data.text;
}