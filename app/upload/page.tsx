"use client";
import { useState, useEffect } from "react";
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
  const [file, setFile]                             = useState<File | null>(null);
  const [text, setText]                             = useState("");
  const [preview, setPreview]                       = useState("");
  const [loading, setLoading]                       = useState(false);
  const [dark, setDark]                             = useState(true);
  const [dragging, setDragging]                     = useState(false);
  const [previewLang, setPreviewLang]               = useState(LANGUAGES[0]);
  const [translatedPreview, setTranslatedPreview]   = useState("");
  const [previewTranslating, setPreviewTranslating] = useState(false);
  const [previewPlaying, setPreviewPlaying]         = useState(false);

  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) setDark(saved === "true");
  }, []);

  // ── Upload (UNCHANGED) ────────────────────────────────────────
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
      setTranslatedPreview(p);
      setPreviewLang(LANGUAGES[0]);
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Analyze (UNCHANGED) ───────────────────────────────────────
  const analyze = () => {
    if (!text) { alert("Upload a document first!"); return; }
    localStorage.setItem("docText", text);
    localStorage.setItem("darkMode", String(dark));
    router.push("/analysis");
  };

  // ── Translate Preview (UNCHANGED) ─────────────────────────────
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
    } catch { setTranslatedPreview(preview); }
    finally { setPreviewTranslating(false); }
  };

  // ── handleLangChange (UNCHANGED) ─────────────────────────────
  const handleLangChange = (label: string) => {
    const lang = LANGUAGES.find((l) => l.label === label)!;
    setPreviewLang(lang);
    translatePreview(label);
  };

  // ── Read Aloud (UNCHANGED) ────────────────────────────────────
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

  const D = dark;

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif" }}
      className={`min-h-screen transition-colors duration-500 relative overflow-x-hidden ${D ? "bg-[#070b14]" : "bg-[#eef2ff]"}`}>

      {/* ── Ambient blobs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] ${D ? "opacity-25 bg-indigo-700" : "opacity-20 bg-indigo-400"}`} />
        <div className={`absolute top-1/2 -right-40 w-[400px] h-[400px] rounded-full blur-[100px] ${D ? "opacity-20 bg-violet-700" : "opacity-15 bg-violet-400"}`} />
        <div className={`absolute -bottom-32 left-1/2 w-[400px] h-[400px] rounded-full blur-[100px] ${D ? "opacity-15 bg-cyan-700" : "opacity-15 bg-cyan-300"}`} />
        <div className={`absolute inset-0 ${D ? "opacity-[0.03]" : "opacity-[0.04]"}`}
          style={{ backgroundImage: "linear-gradient(#6366f1 1px,transparent 1px),linear-gradient(90deg,#6366f1 1px,transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      {/* ── Navbar ── */}
      <nav className={`relative z-20 flex items-center justify-between px-6 md:px-10 py-5 border-b ${D ? "border-white/[0.06]" : "border-black/[0.07]"}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-base shadow-lg shadow-indigo-500/30">⚖</div>
          <span className={`text-xl font-black tracking-tight ${D ? "text-white" : "text-gray-900"}`}>
            Lex<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-500">Simple</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${D ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" : "bg-emerald-50 text-emerald-600 border border-emerald-200"}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AI Ready
          </span>
          <button
            onClick={() => { setDark(!D); localStorage.setItem("darkMode", String(!D)); }}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${D ? "bg-white/[0.07] hover:bg-white/[0.12] text-yellow-300" : "bg-black/[0.06] hover:bg-black/[0.1] text-slate-600"}`}
          >
            {D ? "☀️" : "🌙"}
          </button>
        </div>
      </nav>

      {/* ── Page heading ── */}
      <div className="relative z-10 text-center px-6 pt-14 pb-10">
        <div className={`inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full mb-6 border ${D ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/25" : "bg-indigo-50 text-indigo-600 border-indigo-200"}`}>
          ✦ Legal Document Intelligence Platform
        </div>
        <h1 className={`text-4xl md:text-5xl font-black tracking-tight leading-[1.05] mb-4 ${D ? "text-white" : "text-gray-900"}`}>
          Upload Your Legal
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400">Document</span>
        </h1>
        <p className={`text-sm md:text-base max-w-md mx-auto leading-relaxed ${D ? "text-gray-400" : "text-gray-500"}`}>
          Upload any contract, lease, or agreement and get instant AI analysis, risk assessment, and plain-English explanations.
        </p>
      </div>

      {/* ── Main card ── */}
      <div className="relative z-10 max-w-xl mx-auto px-6 pb-20">
        <div className={`rounded-2xl border p-7 ${D ? "bg-white/[0.04] border-white/[0.08] backdrop-blur-2xl" : "bg-white border-gray-200/80 shadow-2xl shadow-indigo-100"}`}>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
            onClick={() => document.getElementById("fileInput")?.click()}
            className={`relative rounded-xl border-2 border-dashed p-10 text-center transition-all cursor-pointer group ${
              dragging
                ? D ? "border-indigo-400 bg-indigo-500/10" : "border-indigo-500 bg-indigo-50"
                : D ? "border-white/[0.12] hover:border-indigo-400/50 hover:bg-indigo-500/5" : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40"
            }`}
          >
            <input
              id="fileInput"
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }}
            />
            <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-3xl transition-transform group-hover:scale-110 ${D ? "bg-indigo-500/15" : "bg-indigo-50"}`}>
              {file ? "📋" : "📄"}
            </div>
            {file ? (
              <div>
                <p className={`font-bold text-sm ${D ? "text-indigo-300" : "text-indigo-600"}`}>{file.name}</p>
                <p className={`text-xs mt-1 ${D ? "text-gray-500" : "text-gray-400"}`}>{(file.size / 1024).toFixed(1)} KB · Click to change file</p>
              </div>
            ) : (
              <div>
                <p className={`font-semibold text-sm mb-1 ${D ? "text-gray-300" : "text-gray-700"}`}>Drop your document here</p>
                <p className={`text-xs ${D ? "text-gray-600" : "text-gray-400"}`}>Supports PDF and DOCX · Click to browse</p>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-5">
            <button onClick={upload} disabled={loading || !file}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                loading || !file
                  ? D ? "bg-white/[0.05] text-gray-600 cursor-not-allowed" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : D ? "bg-white/[0.08] hover:bg-white/[0.13] text-white border border-white/[0.12]" : "bg-gray-900 hover:bg-gray-800 text-white"
              }`}
            >
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </span>
                : "↑ Upload"
              }
            </button>
            <button onClick={analyze} disabled={!text}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${
                !text
                  ? D ? "bg-indigo-500/20 text-indigo-400/40 cursor-not-allowed" : "bg-indigo-100 text-indigo-300 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 bg-[length:200%] hover:bg-right text-white shadow-indigo-500/40 hover:shadow-indigo-500/60"
              }`}
            >
              Analyze ✦
            </button>
          </div>

          {/* Preview card */}
          {preview && (
            <div className={`mt-5 rounded-xl border p-4 ${D ? "bg-white/[0.03] border-white/[0.08]" : "bg-gray-50 border-gray-200"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <p className={`font-bold text-xs tracking-wide uppercase ${D ? "text-gray-400" : "text-gray-500"}`}>
                  📄 Preview
                  {previewLang.label !== "English" && (
                    <span className="ml-1 text-indigo-400 normal-case font-medium">· {previewLang.label}</span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  {/* Language selector */}
                  <select value={previewLang.label} onChange={(e) => handleLangChange(e.target.value)}
                    className={`text-xs rounded-lg px-2 py-1 border outline-none cursor-pointer ${D ? "bg-white/[0.08] border-white/[0.12] text-gray-300" : "bg-white border-gray-200 text-gray-700"}`}>
                    {LANGUAGES.map((l) => <option key={l.label} value={l.label}>{l.label}</option>)}
                  </select>
                  {/* Read aloud */}
                  <button onClick={speakPreview} disabled={previewTranslating}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition ${
                      previewPlaying
                        ? "bg-indigo-500 text-white border-indigo-500"
                        : D ? "bg-white/[0.08] border-white/[0.12] text-gray-300 hover:bg-white/[0.12]" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}>
                    {previewPlaying ? "⏹ Stop" : "🔊 Listen"}
                  </button>
                </div>
              </div>
              {previewTranslating
                ? <p className={`text-sm animate-pulse ${D ? "text-gray-600" : "text-gray-400"}`}>Translating preview...</p>
                : <p className={`text-sm leading-relaxed whitespace-pre-wrap ${D ? "text-gray-300" : "text-gray-600"}`}>{translatedPreview}</p>
              }
            </div>
          )}
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          {[
            { icon: "⚡", label: "Instant Analysis" },
            { icon: "🛡️", label: "Risk Detection"  },
            { icon: "🌐", label: "11 Languages"    },
            { icon: "🤖", label: "AI Chat"         },
          ].map((f) => (
            <div key={f.label} className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-full border ${D ? "border-white/[0.08] text-gray-500" : "border-gray-200 text-gray-400"}`}>
              <span>{f.icon}</span><span>{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}