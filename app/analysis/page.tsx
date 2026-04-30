"use client";
import { useEffect, useState, useRef, useCallback } from "react";

interface Clause { original: string; simple: string; risk: boolean; explanation: string; }
interface AnalysisResult { clauses: Clause[]; summary: string; risk_level: string; }
interface Message { role: "user" | "assistant"; content: string; }

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

const SUGGESTED = [
  "What are the penalties?",
  "Can I cancel anytime?",
  "Any hidden charges?",
  "My main obligations?",
];

export default function AnalysisPage() {
  const [result, setResult]   = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [dark, setDark]       = useState(true);

  // Summary
  const [summaryLang, setSummaryLang]               = useState(LANGUAGES[0]);
  const [translatedSummary, setTranslatedSummary]   = useState("");
  const [summaryTranslating, setSummaryTranslating] = useState(false);
  const [summaryPlaying, setSummaryPlaying]         = useState(false);

  // Chat
  const [chatOpen, setChatOpen]     = useState(false);
  const [chatLang, setChatLang]     = useState(LANGUAGES[0]);
  const [messages, setMessages]     = useState<Message[]>([
    { role: "assistant", content: "Hi! I've analyzed your document. Ask me anything about it 👋" },
  ]);
  const [input, setInput]             = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatPlaying, setChatPlaying] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);

  const chatEndRef     = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) setDark(saved === "true");
  }, []);

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
      } catch { alert("Analysis failed"); }
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (!chatOpen) { window.speechSynthesis?.cancel(); setChatPlaying(null); } }, [chatOpen]);
  useEffect(() => { if (!result) return; doTranslateSummary(result.summary, summaryLang.label); }, [summaryLang]);

  const doTranslateSummary = async (text: string, language: string) => {
    if (language === "English") { setTranslatedSummary(text); return; }
    setSummaryTranslating(true);
    try {
      const res = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, language }) });
      const data = await res.json();
      setTranslatedSummary(data.translated || text);
    } catch { setTranslatedSummary(text); }
    finally { setSummaryTranslating(false); }
  };

  const speakSummary = useCallback(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (summaryPlaying) { setSummaryPlaying(false); return; }
    const u = new SpeechSynthesisUtterance(translatedSummary);
    u.lang = summaryLang.code; u.rate = 0.95;
    u.onstart = () => setSummaryPlaying(true);
    u.onend = () => setSummaryPlaying(false);
    u.onerror = () => setSummaryPlaying(false);
    window.speechSynthesis.speak(u);
  }, [translatedSummary, summaryLang, summaryPlaying]);

  const speakChat = useCallback((text: string, index: number) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (chatPlaying === index) { setChatPlaying(null); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = chatLang.code; u.rate = 0.95;
    u.onstart = () => setChatPlaying(index);
    u.onend = () => setChatPlaying(null);
    u.onerror = () => setChatPlaying(null);
    window.speechSynthesis.speak(u);
  }, [chatLang, chatPlaying]);

  const toggleVoice = useCallback(() => {
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice input not supported. Use Chrome or Edge."); return; }
    const r = new SR();
    r.lang = chatLang.code; r.interimResults = false; r.continuous = false;
    r.onstart = () => setIsListening(true);
    r.onend = () => setIsListening(false);
    r.onerror = (e: any) => { setIsListening(false); if (e.error === "not-allowed") alert("Microphone permission denied. Allow mic in browser settings."); };
    r.onresult = (e: any) => { setInput(e.results[0][0].transcript); setIsListening(false); };
    recognitionRef.current = r; r.start();
  }, [isListening, chatLang]);

  const sendMessage = async (question?: string) => {
    const q = (question ?? input).trim();
    if (!q || chatLoading) return;
    const userMsg: Message = { role: "user", content: q };
    const next = [...messages, userMsg];
    setMessages(next); setInput(""); setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history: next.slice(-10).map((m) => ({ role: m.role, content: m.content })), language: chatLang.label }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer ?? data.error ?? "Something went wrong." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "❌ Failed to get a response. Try again." }]);
    } finally { setChatLoading(false); }
  };

  const D = dark;

  const toggleDark = () => { setDark(!D); localStorage.setItem("darkMode", String(!D)); };

  // ── Loading ──
  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${D ? "bg-[#070b14]" : "bg-[#eef2ff]"}`}
      style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <div className={`p-10 rounded-2xl border text-center ${D ? "bg-white/[0.04] border-white/[0.08]" : "bg-white border-gray-200 shadow-xl"}`}>
        <div className="w-14 h-14 mx-auto mb-5 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        <p className={`font-bold text-lg ${D ? "text-white" : "text-gray-900"}`}>Analyzing your document</p>
        <p className={`text-sm mt-1 ${D ? "text-gray-500" : "text-gray-400"}`}>AI is reading every clause...</p>
      </div>
    </div>
  );

  if (!result) return (
    <div className={`min-h-screen flex items-center justify-center ${D ? "bg-[#070b14]" : "bg-[#eef2ff]"}`}>
      <p className="text-red-400 font-bold">❌ No result found</p>
    </div>
  );

  const riskColor = result.risk_level === "High" ? "text-red-400 bg-red-500/15 border-red-500/30"
    : result.risk_level === "Medium" ? "text-amber-400 bg-amber-500/15 border-amber-500/30"
    : "text-emerald-400 bg-emerald-500/15 border-emerald-500/30";

  const riskDot = result.risk_level === "High" ? "bg-red-400" : result.risk_level === "Medium" ? "bg-amber-400" : "bg-emerald-400";

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif" }}
      className={`min-h-screen transition-colors duration-500 ${D ? "bg-[#070b14]" : "bg-[#eef2ff]"}`}>

      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] ${D ? "opacity-20 bg-indigo-700" : "opacity-15 bg-indigo-400"}`} />
        <div className={`absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] ${D ? "opacity-15 bg-violet-700" : "opacity-10 bg-violet-400"}`} />
        <div className={`absolute inset-0 ${D ? "opacity-[0.025]" : "opacity-[0.035]"}`}
          style={{ backgroundImage: "linear-gradient(#6366f1 1px,transparent 1px),linear-gradient(90deg,#6366f1 1px,transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      {/* Navbar */}
      <nav className={`relative z-20 flex items-center justify-between px-6 md:px-10 py-5 border-b sticky top-0 backdrop-blur-xl ${D ? "border-white/[0.06] bg-[#070b14]/80" : "border-black/[0.07] bg-[#eef2ff]/80"}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/30">⚖</div>
          <span className={`text-xl font-black tracking-tight ${D ? "text-white" : "text-gray-900"}`}>
            Lex<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-500">Simple</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${riskColor}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${riskDot}`} />
            {result.risk_level} Risk
          </span>
          <button onClick={toggleDark}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${D ? "bg-white/[0.07] hover:bg-white/[0.12] text-yellow-300" : "bg-black/[0.06] hover:bg-black/[0.1] text-slate-600"}`}>
            {D ? "☀️" : "🌙"}
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-10 pb-24">

        <div className="mb-8">
          <h1 className={`text-3xl font-black tracking-tight ${D ? "text-white" : "text-gray-900"}`}>📊 Analysis Result</h1>
          <p className={`text-sm mt-1 ${D ? "text-gray-500" : "text-gray-400"}`}>{result.clauses.length} clauses analyzed · {result.clauses.filter(c => c.risk).length} flagged as risky</p>
        </div>

        {/* Clauses */}
        <div className="space-y-3 mb-8">
          {result.clauses.map((c, i) => (
            <div key={i} className={`rounded-xl border p-5 transition-all ${
              c.risk
                ? D ? "bg-red-500/[0.06] border-red-500/25 hover:border-red-500/40" : "bg-red-50 border-red-200 hover:border-red-300"
                : D ? "bg-white/[0.03] border-white/[0.07] hover:border-white/[0.12]" : "bg-white border-gray-200 hover:border-gray-300"
            }`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${D ? "bg-white/[0.08] text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                  Clause {i + 1}
                </span>
                {c.risk && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${D ? "bg-red-500/15 text-red-400" : "bg-red-100 text-red-600"}`}>
                    ⚠ High Risk
                  </span>
                )}
              </div>
              <p className={`text-xs leading-relaxed mb-2 ${D ? "text-gray-500" : "text-gray-400"}`}>
                <span className={`font-semibold ${D ? "text-gray-400" : "text-gray-500"}`}>Original: </span>
                {c.original}
              </p>
              <p className={`text-sm leading-relaxed font-medium ${D ? "text-gray-200" : "text-gray-800"}`}>
                <span className={`font-bold ${D ? "text-indigo-400" : "text-indigo-600"}`}>Simple: </span>
                {c.simple}
              </p>
              {c.risk && (
                <p className={`mt-2 text-xs leading-relaxed ${D ? "text-red-400" : "text-red-600"}`}>
                  ⚠️ {c.explanation}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Summary card */}
        <div className={`rounded-2xl border p-6 ${D ? "bg-indigo-500/[0.06] border-indigo-500/20" : "bg-indigo-50 border-indigo-200"}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className={`font-black text-lg ${D ? "text-white" : "text-gray-900"}`}>
                Document Summary
              </h3>
              {summaryLang.label !== "English" && (
                <span className="text-xs text-indigo-400 font-medium">· Translated to {summaryLang.label}</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select value={summaryLang.label}
                onChange={(e) => { const l = LANGUAGES.find((x) => x.label === e.target.value)!; setSummaryLang(l); }}
                className={`text-xs rounded-lg px-2 py-1.5 border outline-none cursor-pointer ${D ? "bg-white/[0.08] border-white/[0.12] text-gray-300" : "bg-white border-indigo-200 text-gray-700"}`}>
                {LANGUAGES.map((l) => <option key={l.label} value={l.label}>{l.label}</option>)}
              </select>
              <button onClick={speakSummary} disabled={summaryTranslating}
                className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition ${
                  summaryPlaying
                    ? "bg-indigo-500 text-white border-indigo-500"
                    : D ? "bg-white/[0.08] border-white/[0.12] text-gray-300 hover:bg-white/[0.12]" : "bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-100"
                }`}>
                {summaryPlaying ? "⏹ Stop" : "🔊 Listen"}
              </button>
            </div>
          </div>
          {summaryTranslating
            ? <p className={`text-sm animate-pulse ${D ? "text-gray-500" : "text-gray-400"}`}>Translating...</p>
            : <p className={`text-sm leading-relaxed ${D ? "text-gray-300" : "text-gray-700"}`}>{translatedSummary}</p>
          }
        </div>
      </div>

      <button
  onClick={async () => {
    const res = await fetch("/api/download-pdf");
    const blob = await res.blob();

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "legal-analysis.pdf";
    a.click();
  }}
>
  Download PDF
</button>

      {/* ── Floating chat button ── */}
      <button onClick={() => setChatOpen((o) => !o)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-xl font-bold z-50 transition-all ${
          chatOpen
            ? D ? "bg-white/[0.12] text-white border border-white/20" : "bg-gray-200 text-gray-700"
            : "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-indigo-500/40 hover:shadow-indigo-500/60 hover:scale-105"
        }`}>
        {chatOpen ? "✕" : "💬"}
      </button>

      {/* ── Chat panel ── */}
      {chatOpen && (
        <div className={`fixed bottom-24 right-6 w-96 max-w-[calc(100vw-2rem)] rounded-2xl border flex flex-col z-50 shadow-2xl overflow-hidden ${D ? "bg-[#0d1426] border-white/[0.1]" : "bg-white border-gray-200"}`}
          style={{ height: "400px" }}>

          {/* Chat header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 flex-shrink-0">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-base">🤖</div>
              <div>
                <p className="font-bold text-sm text-white">LexSimple Assistant</p>
                <p className="text-xs text-white/60">Powered by AI · Based on your document</p>
              </div>
            </div>
            
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start items-end"}`}>
                <div className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-br-sm"
                    : D ? "bg-white/[0.07] text-gray-200 rounded-bl-sm border border-white/[0.08]" : "bg-gray-100 text-gray-800 rounded-bl-sm"
                }`}>
                  {m.content}
                </div>
                {m.role === "assistant" && (
                  <button onClick={() => speakChat(m.content, i)}
                    className={`flex-shrink-0 mb-1 w-7 h-7 rounded-full flex items-center justify-center transition text-sm ${
                      chatPlaying === i
                        ? D ? "bg-indigo-500/30 text-indigo-400" : "bg-indigo-100 text-indigo-600"
                        : D ? "text-gray-600 hover:text-indigo-400 hover:bg-white/[0.06]" : "text-gray-400 hover:text-indigo-500 hover:bg-gray-100"
                    }`}>
                    {chatPlaying === i ? "⏹" : "🔊"}
                  </button>
                )}
              </div>
            ))}

            {/* Typing dots */}
            {chatLoading && (
              <div className="flex justify-start">
                <div className={`px-4 py-3 rounded-2xl rounded-bl-sm ${D ? "bg-white/[0.07]" : "bg-gray-100"}`}>
                  <span className="flex gap-1.5 items-center h-4">
                    {[0, 150, 300].map((d) => (
                      <span key={d} className={`w-2 h-2 rounded-full animate-bounce ${D ? "bg-gray-500" : "bg-gray-400"}`}
                        style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Suggested */}
          {messages.length <= 1 && (
            <div className={`px-4 pb-3 flex flex-wrap gap-2 flex-shrink-0 ${D ? "border-t border-white/[0.06]" : "border-t border-gray-100"} pt-3`}>
              {SUGGESTED.map((q) => (
                <button key={q} onClick={() => sendMessage(q)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition ${
                    D ? "bg-indigo-500/10 border-indigo-500/25 text-indigo-300 hover:bg-indigo-500/20" : "bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100"
                  }`}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className={`p-3 border-t flex gap-2 items-center flex-shrink-0 ${D ? "border-white/[0.08]" : "border-gray-100"}`}>
            <input type="text" value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={`Ask in ${chatLang.label}...`}
              disabled={chatLoading}
              className={`flex-1 text-sm rounded-full px-4 py-2 border outline-none transition ${
                D ? "bg-white/[0.06] border-white/[0.1] text-white placeholder-gray-600 focus:border-indigo-500/50" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-indigo-300"
              }`}
            />
            <button onClick={toggleVoice}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition flex-shrink-0 border text-xs font-black ${
                isListening
                  ? "bg-red-500 text-white border-red-500 animate-pulse"
                  : D ? "bg-white/[0.07] border-white/[0.12] text-gray-400 hover:border-indigo-400/50 hover:text-indigo-400" : "bg-gray-50 border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600"
              }`}>
              {isListening ? "■" : "MIC"}
            </button>
            <button onClick={() => sendMessage()} disabled={chatLoading || !input.trim()}
              className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-40 text-white rounded-full flex items-center justify-center transition flex-shrink-0 text-sm">
              ➤
            </button>
          </div>

          {isListening && (
            <div className="px-4 pb-3 text-center flex-shrink-0">
              <span className={`text-xs animate-pulse font-medium ${D ? "text-red-400" : "text-red-500"}`}>
                🎙 Listening in {chatLang.label}... click MIC to stop
              </span>
            </div>
          )}
        </div>
      )}
    </div>
    
  );
}