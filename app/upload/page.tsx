"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const LANGUAGES = [
  { label: "English",  code: "en-US" },
  { label: "Hindi",    code: "hi-IN" },
  { label: "Tamil",    code: "ta-IN" },
  { label: "Telugu",   code: "te-IN" },
  { label: "Kannada",  code: "kn-IN" },
  { label: "Bengali",  code: "bn-IN" },
  { label: "French",   code: "fr-FR" },
  { label: "Spanish",  code: "es-ES" },
  { label: "Arabic",   code: "ar-SA" },
  { label: "German",   code: "de-DE" },
  { label: "Japanese", code: "ja-JP" },
];

export default function Home() {
  const [file, setFile]       = useState<File | null>(null);
  const [text, setText]       = useState("");
  const [preview, setPreview] = useState("");           // original English preview
  const [loading, setLoading] = useState(false);

  // Preview language + translation state
  const [previewLang, setPreviewLang]                   = useState(LANGUAGES[0]);
  const [translatedPreview, setTranslatedPreview]       = useState("");
  const [previewTranslating, setPreviewTranslating]     = useState(false);
  const [previewPlaying, setPreviewPlaying]             = useState(false);

  const router = useRouter();

  // ── Upload ────────────────────────────────────────
  const upload = async () => {
    if (!file) { alert("Please select a file first!"); return; }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) { alert("Upload failed (server error)"); return; }
      const data = await res.json();
      setText(data.text || "");
      const p = data.preview || "No preview available";
      setPreview(p);
      setTranslatedPreview(p);         // reset to English on new upload
      setPreviewLang(LANGUAGES[0]);    // reset language selector
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Analyze ───────────────────────────────────────
  const analyze = () => {
    if (!text) { alert("Upload a document first!"); return; }
    localStorage.setItem("docText", text);
    router.push("/analysis");
  };

  // ── Translate Preview ─────────────────────────────
  const translatePreview = async (language: string) => {
    if (language === "English") { setTranslatedPreview(preview); return; }
    setPreviewTranslating(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: preview, language }),
      });
      const data = await res.json();
      setTranslatedPreview(data.translated || preview);
    } catch {
      setTranslatedPreview(preview);
    } finally {
      setPreviewTranslating(false);
    }
  };

  const handleLangChange = (label: string) => {
    const lang = LANGUAGES.find((l) => l.label === label)!;
    setPreviewLang(lang);
    translatePreview(label);
  };

  // ── Read Aloud ────────────────────────────────────
  const speakPreview = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (previewPlaying) { setPreviewPlaying(false); return; }
    const u = new SpeechSynthesisUtterance(translatedPreview);
    u.lang    = previewLang.code;
    u.rate    = 0.95;
    u.onstart = () => setPreviewPlaying(true);
    u.onend   = () => setPreviewPlaying(false);
    u.onerror = () => setPreviewPlaying(false);
    window.speechSynthesis.speak(u);
  };

  // ── Render ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">

        {/* Title */}
        <h1 className="text-3xl font-bold text-center mb-2">⚖️ Legal AI Analyzer</h1>
        <p className="text-center text-gray-500 mb-6">
          Upload your legal document and get instant AI analysis
        </p>

        {/* Upload Box */}
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition cursor-pointer">
          <input
            type="file"
            className="w-full cursor-pointer"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }}
          />
          <p className="text-sm text-gray-500 mt-2">Upload PDF or DOCX file</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={upload}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 rounded-lg font-semibold transition"
          >
            {loading ? "Uploading..." : "Upload"}
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

        {/* ── Preview Card ── */}
        {preview && (
          <div className="mt-6 bg-gray-50 border rounded-xl p-4 shadow-sm">

            {/* Preview header row */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h2 className="font-semibold text-lg">📄 Preview</h2>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Language selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">🌐</span>
                  <select
                    value={previewLang.label}
                    onChange={(e) => handleLangChange(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-blue-400 bg-white cursor-pointer"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.label} value={l.label}>{l.label}</option>
                    ))}
                  </select>
                </div>

                {/* Read aloud button */}
                <button
                  onClick={speakPreview}
                  disabled={previewTranslating}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition font-medium ${
                    previewPlaying
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-blue-600 border-blue-300 hover:bg-blue-50"
                  }`}
                >
                  {previewPlaying ? "⏹ Stop" : "🔊 Listen"}
                </button>
              </div>
            </div>

            {/* Preview text */}
            {previewTranslating ? (
              <p className="text-sm text-gray-400 animate-pulse">Translating preview...</p>
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {translatedPreview}
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}