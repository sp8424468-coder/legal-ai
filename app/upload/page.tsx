"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  // 📄 Upload function (UNCHANGED)
  const upload = async () => {
    if (!file) {
      alert("Please select a file bro 😄");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        alert("Upload failed (server error)");
        return;
      }

      const data = await res.json();

      setText(data.text || "");
      setPreview(data.preview || "No preview available");

    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed bro");
    } finally {
      setLoading(false);
    }
  };

  // 🤖 Analyze (UNCHANGED)
  const analyze = () => {
    if (!text) {
      alert("Upload document first bro 😄");
      return;
    }

    localStorage.setItem("docText", text);
    router.push("/analysis");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-6">

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">

        {/* Title */}
        <h1 className="text-3xl font-bold text-center mb-2">
          ⚖️ Legal AI Analyzer
        </h1>
        <p className="text-center text-gray-500 mb-6">
          Upload your legal document and get instant AI analysis
        </p>

        {/* Upload Box */}
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition cursor-pointer">
          <input
            type="file"
            className="w-full cursor-pointer"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setFile(f);
            }}
          />
          <p className="text-sm text-gray-500 mt-2">
            Upload PDF or DOCX file
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={upload}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition"
          >
            Upload
          </button>

          <button
            onClick={analyze}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold transition"
          >
            Analyze
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-4 text-center text-gray-600 animate-pulse">
            ⏳ Processing your document...
          </div>
        )}

        {/* Preview Card */}
        {preview && (
          <div className="mt-6 bg-gray-50 border rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-lg mb-2">📄 Preview</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {preview}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}