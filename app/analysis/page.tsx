"use client";
import { useEffect, useState } from "react";

export default function AnalysisPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runAnalysis = async () => {
      const text = localStorage.getItem("docText");

      if (!text) {
        alert("No document found bro 😄");
        return;
      }

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          body: JSON.stringify({ text }),
        });

        const data = await res.json();
        setResult(data.result);
      } catch (err) {
        console.error("Analysis error:", err);
        alert("Analysis failed bro");
      } finally {
        setLoading(false);
      }
    };

    runAnalysis();
  }, []);

  if (loading) {
    return <h2 className="p-10">⏳ Analyzing document...</h2>;
  }

  if (!result) {
    return <h2 className="p-10">❌ No result found</h2>;
  }

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">📊 Analysis Result</h1>

      <h2 className="text-lg font-bold">
        Risk Level: {result.risk_level}
      </h2>

      {result.clauses.map((c: any, i: number) => (
        <div
          key={i}
          className={`p-3 mt-3 border rounded ${
            c.risk ? "bg-red-200" : "bg-green-200"
          }`}
        >
          <p><b>Original:</b> {c.original}</p>
          <p><b>Simple:</b> {c.simple}</p>
          {c.risk && <p>⚠️ {c.explanation}</p>}
        </div>
      ))}

      <h3 className="mt-4 font-bold">Summary</h3>
      <p>{result.summary}</p>
    </div>
  );
}