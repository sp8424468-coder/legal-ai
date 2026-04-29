"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  // 📄 Upload function
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

  // 🤖 Analyze → navigate to new page
  const analyze = () => {
    if (!text) {
      alert("Upload document first bro 😄");
      return;
    }

    // store text for analysis page
    localStorage.setItem("docText", text);

    // go to analysis page
    router.push("/analysis");
  };

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">⚖️ Legal AI Analyzer</h1>

      {/* File Upload */}
      <input
        type="file"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setFile(f);
        }}
      />

      {/* Buttons */}
      <div className="mt-3 space-x-2">
        <button
          onClick={upload}
          className="bg-blue-500 text-white p-2 rounded"
        >
          Upload
        </button>

        <button
          onClick={analyze}
          className="bg-green-500 text-white p-2 rounded"
        >
          Analyze
        </button>
      </div>

      {/* Loading */}
      {loading && <p className="mt-4">⏳ Processing...</p>}

      {/* ✅ ONLY PREVIEW (NO FULL TEXT) */}
      {preview && (
        <div className="mt-5">
          <h2 className="font-bold">📄 Preview (Main Points)</h2>
          <p className="bg-gray-100 p-3 mt-2 whitespace-pre-wrap">
            {preview}
          </p>
        </div>
      )}
    </div>
  );
}