"use client";
import { useEffect, useState, useRef, useCallback } from "react";

interface Clause {
  original: string;
  simple: string;
  risk: boolean;
  explanation: string;
}
interface AnalysisResult {
  clauses: Clause[];
  summary: string;
  risk_level: string;
}
interface Message {
  role: "user" | "assistant";
  content: string;
}

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

const SUGGESTED = [
  "What are the penalties?",
  "Can I cancel anytime?",
  "Are there hidden charges?",
  "What are my main obligations?",
];

export default function AnalysisPage() {
  // ── Document state ──────────────────────────────
  const [result, setResult]     = useState<AnalysisResult | null>(null);
  const [loading, setLoading]   = useState(true);

  // ── Summary language & TTS ──────────────────────
  const [summaryLang, setSummaryLang]             = useState(LANGUAGES[0]);
  const [translatedSummary, setTranslatedSummary] = useState("");
  const [summaryTranslating, setSummaryTranslating] = useState(false);
  const [summaryPlaying, setSummaryPlaying]       = useState(false);

  // ── Chat state ──────────────────────────────────
  const [chatOpen, setChatOpen] = useState(false);
  const [chatLang, setChatLang] = useState(LANGUAGES[0]);   // ← INDEPENDENT chat language
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I've read your document. Ask me anything about it 👋" },
  ]);
  const [input, setInput]           = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatPlaying, setChatPlaying] = useState<number | null>(null); // which msg is speaking
  const [isListening, setIsListening] = useState(false);

  const chatEndRef     = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // ── Analyze on mount ────────────────────────────
  useEffect(() => {
    (async () => {
      const text = localStorage.getItem("docText");
      if (!text) { alert("No document found!"); return; }
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();
        setResult(data.result);
        setTranslatedSummary(data.result?.summary ?? "");
      } catch {
        alert("Analysis failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Auto-scroll chat ────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Stop TTS when chat closes ───────────────────
  useEffect(() => {
    if (!chatOpen) {
      window.speechSynthesis?.cancel();
      setChatPlaying(null);
    }
  }, [chatOpen]);

  // ── Translate summary when lang changes ─────────
  useEffect(() => {
    if (!result) return;
    translateText(result.summary, summaryLang.label).then(setTranslatedSummary);
  }, [summaryLang]);

  // ── Generic translate helper ────────────────────
  const translateText = async (text: string, language: string): Promise<string> => {
    if (language === "English") return text;
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
      });
      const data = await res.json();
      return data.translated || text;
    } catch {
      return text;
    }
  };

  // ── Summary translate (with loading state) ──────
  const handleSummaryLangChange = async (label: string) => {
    const lang = LANGUAGES.find((l) => l.label === label)!;
    setSummaryLang(lang);
    if (label === "English") { setTranslatedSummary(result?.summary ?? ""); return; }
    setSummaryTranslating(true);
    const translated = await translateText(result?.summary ?? "", label);
    setTranslatedSummary(translated);
    setSummaryTranslating(false);
  };

  // ── TTS: Summary ────────────────────────────────
  const speakSummary = useCallback(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (summaryPlaying) { setSummaryPlaying(false); return; }
    const u = new SpeechSynthesisUtterance(translatedSummary);
    u.lang = summaryLang.code;
    u.rate = 0.95;
    u.onstart = () => setSummaryPlaying(true);
    u.onend   = () => setSummaryPlaying(false);
    u.onerror = () => setSummaryPlaying(false);
    window.speechSynthesis.speak(u);
  }, [translatedSummary, summaryLang, summaryPlaying]);

  // ── TTS: Chat message ───────────────────────────
  const speakChat = useCallback((text: string, index: number) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (chatPlaying === index) { setChatPlaying(null); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = chatLang.code;   // ← uses CHAT language
    u.rate = 0.95;
    u.onstart = () => setChatPlaying(index);
    u.onend   = () => setChatPlaying(null);
    u.onerror = () => setChatPlaying(null);
    window.speechSynthesis.speak(u);
  }, [chatLang, chatPlaying]);

  // ── Voice Input ─────────────────────────────────
  const toggleVoice = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice input not supported. Use Chrome or Edge."); return; }

    const r = new SR();
    r.lang           = chatLang.code;   // ← listens in CHAT language
    r.interimResults = false;
    r.continuous     = false;

    r.onstart  = () => setIsListening(true);
    r.onend    = () => setIsListening(false);
    r.onerror  = (e: any) => {
      setIsListening(false);
      if (e.error === "not-allowed")
        alert("Microphone permission denied. Allow mic in browser settings and try again.");
    };
    r.onresult = (e: any) => {
      setInput(e.results[0][0].transcript);
      setIsListening(false);
    };

    recognitionRef.current = r;
    r.start();
  }, [isListening, chatLang]);

  // ── Send chat message ───────────────────────────
  const sendMessage = async (question?: string) => {
    const q = (question ?? input).trim();
    if (!q || chatLoading) return;

    const userMsg: Message = { role: "user", content: q };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          history: next.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          language: chatLang.label,   // ← sends chosen language to API
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer ?? data.error ?? "Something went wrong." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "❌ Failed to get a response. Try again." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // ── Loading screen ──────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-lg font-semibold text-gray-700">Analyzing document...</p>
        <p className="text-sm text-gray-400 mt-1">This may take a few seconds</p>
      </div>
    </div>
  );

  if (!result) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded-xl shadow text-center">
        <p className="text-lg font-semibold text-red-500">❌ No result found</p>
      </div>
    </div>
  );

  // ── Main render ─────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8">

        <h1 className="text-3xl font-bold text-center mb-6">📊 Analysis Result</h1>

        {/* Risk badge */}
        <div className="text-center mb-6">
          <span className="text-lg font-semibold">Risk Level: </span>
          <span className={`px-4 py-1 rounded-full font-semibold ${
            result.risk_level === "High"   ? "bg-red-500 text-white"
            : result.risk_level === "Medium" ? "bg-yellow-400 text-black"
            : "bg-green-500 text-white"
          }`}>
            {result.risk_level}
          </span>
        </div>

        {/* Clauses */}
        <div className="space-y-4">
          {result.clauses.map((c, i) => (
            <div key={i} className={`p-4 rounded-xl shadow-sm border ${
              c.risk ? "bg-red-50 border-red-300" : "bg-green-50 border-green-300"
            }`}>
              <p className="text-sm"><b>Original:</b> {c.original}</p>
              <p className="mt-2 text-sm text-gray-700"><b>Simple:</b> {c.simple}</p>
              {c.risk && <p className="mt-2 text-red-600 text-sm font-medium">⚠️ {c.explanation}</p>}
            </div>
          ))}
        </div>

        {/* ── Summary card ── */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h3 className="font-bold text-lg">
              Summary
              {summaryLang.label !== "English" && (
                <span className="ml-2 text-sm font-normal text-blue-500">({summaryLang.label})</span>
              )}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Summary language dropdown */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">🌐</span>
                <select
                  value={summaryLang.label}
                  onChange={(e) => handleSummaryLangChange(e.target.value)}
                  className="text-xs border border-blue-200 rounded-lg px-2 py-1 outline-none focus:border-blue-400 bg-white cursor-pointer"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.label} value={l.label}>{l.label}</option>
                  ))}
                </select>
              </div>
              {/* Summary listen button */}
              <button
                onClick={speakSummary}
                disabled={summaryTranslating}
                className={`text-xs px-3 py-1.5 rounded-full border transition font-medium ${
                  summaryPlaying
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-blue-600 border-blue-300 hover:bg-blue-50"
                }`}
              >
                {summaryPlaying ? "⏹ Stop" : "🔊 Listen"}
              </button>
            </div>
          </div>
          {summaryTranslating
            ? <p className="text-sm text-gray-400 animate-pulse">Translating...</p>
            : <p className="text-sm text-gray-700">{translatedSummary}</p>
          }
        </div>
      </div>

      {/* ════════════════════════════════════════
          FLOATING CHAT BUTTON
      ════════════════════════════════════════ */}
      <button
        onClick={() => setChatOpen((o) => !o)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl transition-all z-50"
      >
        {chatOpen ? "✕" : "💬"}
      </button>

      {/* ════════════════════════════════════════
          CHAT PANEL
      ════════════════════════════════════════ */}
      {chatOpen && (
        <div
          className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50"
          style={{ height: "600px" }}
        >
          {/* ── Chat header with language selector ── */}
          <div className="bg-blue-600 text-white px-4 py-3 rounded-t-2xl flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🤖</span>
              <div>
                <p className="font-semibold text-sm">LexSimple Assistant</p>
                <p className="text-xs opacity-75">Ask anything about your document</p>
              </div>
            </div>

            {/* ── Language selector inside chat ── */}
            <div className="flex items-center gap-2 bg-blue-500 rounded-lg px-3 py-2">
              <span className="text-xs font-medium opacity-90 whitespace-nowrap">
                🌐 Reply language:
              </span>
              <select
                value={chatLang.label}
                onChange={(e) => {
                  const lang = LANGUAGES.find((l) => l.label === e.target.value)!;
                  setChatLang(lang);
                  // stop any ongoing speech when language changes
                  window.speechSynthesis?.cancel();
                  setChatPlaying(null);
                }}
                className="flex-1 text-xs bg-blue-500 text-white border border-blue-400 rounded-md px-2 py-1 outline-none cursor-pointer"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.label} value={l.label} className="text-black bg-white">
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start items-end"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-800 rounded-bl-sm"
                }`}>
                  {m.content}
                </div>
                {/* Per-message read aloud */}
                {m.role === "assistant" && (
                  <button
                    onClick={() => speakChat(m.content, i)}
                    title={chatPlaying === i ? "Stop" : "Read aloud"}
                    className={`flex-shrink-0 mb-1 w-7 h-7 rounded-full flex items-center justify-center transition text-sm ${
                      chatPlaying === i
                        ? "bg-blue-100 text-blue-600"
                        : "text-gray-400 hover:text-blue-500 hover:bg-gray-100"
                    }`}
                  >
                    {chatPlaying === i ? "⏹" : "🔊"}
                  </button>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm">
                  <span className="flex gap-1 items-center h-4">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* ── Suggested questions ── */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-2 flex-shrink-0">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1 rounded-full transition"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* ── Input row ── */}
          <div className="p-3 border-t border-gray-100 flex gap-2 items-center flex-shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={`Ask in ${chatLang.label}...`}
              className="flex-1 text-sm border border-gray-200 rounded-full px-4 py-2 outline-none focus:border-blue-400"
              disabled={chatLoading}
            />

            {/* MIC button */}
            <button
              onClick={toggleVoice}
              title={isListening ? "Stop listening" : `Speak in ${chatLang.label}`}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition flex-shrink-0 border text-xs font-bold ${
                isListening
                  ? "bg-red-500 text-white border-red-500 animate-pulse"
                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-500"
              }`}
            >
              {isListening ? "■" : "MIC"}
            </button>

            {/* Send button */}
            <button
              onClick={() => sendMessage()}
              disabled={chatLoading || !input.trim()}
              className="w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-full flex items-center justify-center transition flex-shrink-0"
            >
              &#10148;
            </button>
          </div>

          {/* Listening indicator */}
          {isListening && (
            <div className="px-4 pb-3 text-center flex-shrink-0">
              <span className="text-xs text-red-500 animate-pulse font-medium">
                🎙 Listening in {chatLang.label}... click MIC to stop
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}