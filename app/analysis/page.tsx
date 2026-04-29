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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-6 rounded-xl shadow text-center">
          <p className="text-lg font-semibold animate-pulse">
            ⏳ Analyzing document...
          </p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-6 rounded-xl shadow text-center">
          <p className="text-lg font-semibold text-red-500">
            ❌ No result found
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8">

        {/* Title */}
        <h1 className="text-3xl font-bold text-center mb-6">
          📊 Analysis Result
        </h1>

        {/* Risk Level Badge */}
        <div className="text-center mb-6">
          <span className="text-lg font-semibold">Risk Level: </span>
          <span
            className={`px-4 py-1 rounded-full font-semibold ${
              result.risk_level === "High"
                ? "bg-red-500 text-white"
                : result.risk_level === "Medium"
                ? "bg-yellow-400 text-black"
                : "bg-green-500 text-white"
            }`}
          >
            {result.risk_level}
          </span>
        </div>

        {/* Clauses */}
        <div className="space-y-4">
          {result.clauses.map((c: any, i: number) => (
            <div
              key={i}
              className={`p-4 rounded-xl shadow-sm border ${
                c.risk
                  ? "bg-red-50 border-red-300"
                  : "bg-green-50 border-green-300"
              }`}
            >
              <p className="text-sm">
                <b>Original:</b> {c.original}
              </p>

              <p className="mt-2 text-sm text-gray-700">
                <b>Simple:</b> {c.simple}
              </p>

              {c.risk && (
                <p className="mt-2 text-red-600 text-sm font-medium">
                  ⚠️ {c.explanation}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-bold mb-2 text-lg">Summary</h3>
          <p className="text-sm text-gray-700">{result.summary}</p>
        </div>

      </div>
    </div>
  );
}