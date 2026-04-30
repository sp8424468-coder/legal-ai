"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const LANGUAGES = [
  { label: "English", code: "en-US" },
  { label: "Hindi", code: "hi-IN" },
  { label: "Tamil", code: "ta-IN" },
  { label: "Telugu", code: "te-IN" },
  { label: "Kannada", code: "kn-IN" },
  { label: "Bengali", code: "bn-IN" },
  { label: "French", code: "fr-FR" },
  { label: "Spanish", code: "es-ES" },
  { label: "Arabic", code: "ar-SA" },
  { label: "German", code: "de-DE" },
  { label: "Japanese", code: "ja-JP" },
];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [previewLang, setPreviewLang] = useState(LANGUAGES[0]);
  const [translatedPreview, setTranslatedPreview] = useState("");
  const [previewTranslating, setPreviewTranslating] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  const [paid, setPaid] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) setDark(saved === "true");
  }, []);

  // ── Step 2: Translate preview function ──
  const translatePreview = async () => {
    if (!preview) return;

    if (previewLang.label === "English") {
      setTranslatedPreview(preview);
      return;
    }

    setPreviewTranslating(true);

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: preview,
          language: previewLang.label,
        }),
      });

      const data = await res.json();
      setTranslatedPreview(data.translated || preview);
    } catch {
      setTranslatedPreview(preview);
    }

    setPreviewTranslating(false);
  };

  // ── Step 3: Read aloud function with full language code mapping ──
  const readPreview = () => {
    if (!translatedPreview && !preview) return;

    const textToRead = translatedPreview || preview;

    window.speechSynthesis.cancel();

    if (previewPlaying) {
      setPreviewPlaying(false);
      return;
    }

    const speech = new SpeechSynthesisUtterance(textToRead);
    speech.lang = previewLang.code; // uses full language code e.g. hi-IN, ta-IN
    speech.rate = 0.95;

    speech.onstart = () => setPreviewPlaying(true);
    speech.onend   = () => setPreviewPlaying(false);
    speech.onerror = () => setPreviewPlaying(false);

    window.speechSynthesis.speak(speech);
  };

  // 💳 PAYMENT FUNCTION
  const handlePayment = async () => {
    try {
      const res = await fetch("/api/payment/order", { method: "POST" });
      const order = await res.json();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: "INR",
        name: "Legal AI Analyzer",
        description: "Document Analysis Fee",
        order_id: order.id,
        handler: function () {
          alert("✅ Payment Successful!");
          setPaid(true);
        },
        theme: { color: "#6366f1" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      alert("Payment failed bro");
    }
  };

  // 📄 Upload
  const upload = async () => {
    if (!paid) {
      alert("⚠️ Please complete payment first");
      return;
    }

    if (!file) {
      alert("Please select a file first!");
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

      const data = await res.json();

      setText(data.text || "");
      const p = data.preview || "No preview available";
      setPreview(p);
      setTranslatedPreview(p); // seed translated with raw on fresh upload
    } catch {
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  // 🤖 Analyze
  const analyze = () => {
    if (!paid) {
      alert("⚠️ Payment required");
      return;
    }

    if (!text) {
      alert("Upload a document first!");
      return;
    }

    localStorage.setItem("docText", text);
    router.push("/analysis");
  };

  const D = dark;

  return (
    <div className={`min-h-screen relative overflow-x-hidden ${D ? "bg-[#070b14]" : "bg-[#eef2ff]"}`}>

      {/* 🌌 Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] bg-indigo-700 opacity-25" />
        <div className="absolute top-1/2 -right-40 w-[400px] h-[400px] rounded-full blur-[100px] bg-violet-700 opacity-20" />
        <div className="absolute -bottom-32 left-1/2 w-[400px] h-[400px] rounded-full blur-[100px] bg-cyan-700 opacity-15" />
      </div>

      {/* 🔝 Navbar */}
      <nav className="relative z-10 flex justify-between px-8 py-5 border-b border-white/10">
        <h1 className="text-white font-bold text-xl">
          Lex<span className="text-indigo-400">Simple</span>
        </h1>

        <button
          onClick={() => {
            setDark(!D);
            localStorage.setItem("darkMode", String(!D));
          }}
          className="text-white"
        >
          {D ? "☀️" : "🌙"}
        </button>
      </nav>

      {/* 🧠 Heading */}
      <div className="text-center mt-16 mb-10">
        <h1 className="text-4xl font-black text-white mb-3">
          Upload Legal Document
        </h1>
        <p className="text-gray-400">
          Get instant AI insights and risk detection
        </p>
      </div>

      {/* 💎 Main Card */}
      <div className="relative z-10 max-w-xl mx-auto px-6 pb-20">
        <div className="rounded-2xl border p-7 bg-white/[0.04] border-white/[0.08] backdrop-blur-2xl">

          {/* 💳 PAYMENT */}
          {!paid && (
            <button
              onClick={handlePayment}
              className="w-full mb-6 py-3 rounded-xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg"
            >
              💳 Pay ₹5 to Unlock
            </button>
          )}

          {/* 🔒 LOCK */}
          <div className={!paid ? "opacity-40 pointer-events-none" : ""}>

            {/* 📄 Upload Box */}
            <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 transition">
              <input
                type="file"
                className="hidden"
                id="fileInput"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFile(f);
                }}
              />

              <label htmlFor="fileInput" className="cursor-pointer">
                <div className="text-3xl mb-2">📄</div>
                <p className="text-gray-300 font-medium">
                  {file ? file.name : "Click to upload file"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF / DOCX supported
                </p>
              </label>
            </div>

            {/* 🔘 Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={upload}
                className="flex-1 py-3 rounded-xl font-bold bg-white/10 hover:bg-white/15 text-white border border-white/10"
              >
                {loading ? "Processing..." : "Upload"}
              </button>

              <button
                onClick={analyze}
                className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-indigo-500 to-violet-500 text-white"
              >
                Analyze ✦
              </button>
            </div>

            {/* ── Step 4: Updated Preview Section ── */}
            {preview && (
              <div className="mt-6 bg-white/5 border border-white/10 p-4 rounded-xl">

                {/* Preview header with controls */}
                <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                  <h3 className={`font-semibold ${D ? "text-white" : "text-gray-900"}`}>
                    Preview
                  </h3>

                  <div className="flex gap-2 items-center flex-wrap">

                    {/* Language Selector */}
                    <select
                      value={previewLang.label}
                      onChange={(e) => {
                        const found = LANGUAGES.find((l) => l.label === e.target.value);
                        if (found) setPreviewLang(found);
                      }}
                      className={`text-xs px-2 py-1.5 rounded-lg border outline-none cursor-pointer ${
                        D
                          ? "bg-white/[0.08] border-white/[0.12] text-gray-300"
                          : "bg-white border-indigo-200 text-gray-700"
                      }`}
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l.label} value={l.label}>
                          {l.label}
                        </option>
                      ))}
                    </select>

                    {/* Translate Button */}
                    <button
                      onClick={translatePreview}
                      disabled={previewTranslating}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition ${
                        D
                          ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30"
                          : "bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100"
                      }`}
                    >
                      {previewTranslating ? "..." : "Translate"}
                    </button>

                    {/* Read Aloud Button */}
                    <button
                      onClick={readPreview}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition ${
                        previewPlaying
                          ? "bg-indigo-500 text-white border-indigo-500"
                          : D
                          ? "bg-white/[0.08] border-white/[0.12] text-gray-300 hover:bg-white/[0.12]"
                          : "bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-100"
                      }`}
                    >
                      {previewPlaying ? "⏹ Stop" : "🔊 Read"}
                    </button>

                  </div>
                </div>

                {/* Step 5: Show translated text instead of raw */}
                <pre className={`text-sm whitespace-pre-wrap leading-relaxed ${D ? "text-gray-300" : "text-gray-700"}`}>
                  {previewTranslating
                    ? "Translating..."
                    : translatedPreview || preview}
                </pre>

                {/* Language indicator when not English */}
                {previewLang.label !== "English" && translatedPreview && !previewTranslating && (
                  <p className="text-xs text-indigo-400 font-medium mt-2">
                    · Translated to {previewLang.label}
                  </p>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}