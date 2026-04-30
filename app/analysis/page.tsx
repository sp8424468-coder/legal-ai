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

  // ── DARK theme tokens (from screenshot) ──
  // bg: #080d1a deep navy, blobs: indigo + cyan, text: white
  // LIGHT theme tokens: bg: #f0f4ff soft lavender-white, text: #0f172a

  // ── Loading ──
  if (loading) return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        fontFamily: "'Sora','DM Sans',sans-serif",
        background: D ? "#080d1a" : "#f0f4ff",
      }}
    >
      {/* ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{ position:"absolute", top:"-120px", left:"-120px", width:"520px", height:"520px", borderRadius:"50%", background: D ? "radial-gradient(circle,#3b3fd8 0%,transparent 70%)" : "radial-gradient(circle,#818cf8 0%,transparent 70%)", opacity: D ? 0.25 : 0.15, filter:"blur(40px)" }} />
        <div style={{ position:"absolute", bottom:"-80px", right:"-80px", width:"420px", height:"420px", borderRadius:"50%", background: D ? "radial-gradient(circle,#06b6d4 0%,transparent 70%)" : "radial-gradient(circle,#67e8f9 0%,transparent 70%)", opacity: D ? 0.2 : 0.12, filter:"blur(40px)" }} />
      </div>
      <div style={{
        padding:"40px 48px", borderRadius:"24px", textAlign:"center",
        background: D ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.8)",
        border: D ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(99,102,241,0.2)",
        backdropFilter:"blur(20px)",
        boxShadow: D ? "0 0 60px rgba(99,102,241,0.15)" : "0 8px 40px rgba(99,102,241,0.12)",
      }}>
        {/* Spinning ring matching screenshot style */}
        <div style={{ width:56, height:56, margin:"0 auto 20px", borderRadius:"50%", border:`3px solid ${D ? "rgba(255,255,255,0.08)" : "rgba(99,102,241,0.15)"}`, borderTop:"3px solid #6366f1", animation:"spin 0.9s linear infinite" }} />
        <p style={{ fontWeight:800, fontSize:18, color: D ? "#fff" : "#0f172a", letterSpacing:"-0.3px" }}>Analyzing your document</p>
        <p style={{ fontSize:13, marginTop:6, color: D ? "#64748b" : "#94a3b8" }}>AI is reading every clause...</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!result) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: D ? "#080d1a" : "#f0f4ff" }}>
      <p style={{ color:"#f87171", fontWeight:700 }}>❌ No result found</p>
    </div>
  );

  const riskColor = result.risk_level === "High"
    ? { text:"#f87171", bg:"rgba(239,68,68,0.12)", border:"rgba(239,68,68,0.3)", dot:"#f87171" }
    : result.risk_level === "Medium"
    ? { text:"#fbbf24", bg:"rgba(245,158,11,0.12)", border:"rgba(245,158,11,0.3)", dot:"#fbbf24" }
    : { text:"#34d399", bg:"rgba(52,211,153,0.12)", border:"rgba(52,211,153,0.3)", dot:"#34d399" };

  // Shared style helpers
  const cardStyle = (extra?: object): object => ({
    borderRadius: 20,
    border: D ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(99,102,241,0.15)",
    background: D ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.75)",
    backdropFilter: "blur(16px)",
    boxShadow: D ? "0 4px 32px rgba(0,0,0,0.3)" : "0 4px 24px rgba(99,102,241,0.08)",
    padding: "24px 28px",
    ...extra,
  });

  const bg       = D ? "#080d1a" : "#f0f4ff";
  const textPri  = D ? "#f1f5f9" : "#0f172a";
  const textSec  = D ? "#64748b" : "#64748b";
  const textMid  = D ? "#94a3b8" : "#475569";

  return (
    <div style={{ fontFamily:"'Sora','DM Sans',sans-serif", minHeight:"100vh", background: bg, transition:"background 0.4s" }}>

      {/* ── Ambient background blobs (matching screenshot) ── */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", overflow:"hidden", zIndex:0 }}>
        <div style={{ position:"absolute", top:"-150px", left:"-150px", width:"600px", height:"600px", borderRadius:"50%", background: D ? "radial-gradient(circle,#3730a3 0%,transparent 65%)" : "radial-gradient(circle,#a5b4fc 0%,transparent 65%)", opacity: D ? 0.35 : 0.2, filter:"blur(1px)" }} />
        <div style={{ position:"absolute", bottom:"-100px", right:"-100px", width:"500px", height:"500px", borderRadius:"50%", background: D ? "radial-gradient(circle,#0e7490 0%,transparent 65%)" : "radial-gradient(circle,#67e8f9 0%,transparent 65%)", opacity: D ? 0.25 : 0.15, filter:"blur(1px)" }} />
        <div style={{ position:"absolute", top:"40%", right:"20%", width:"300px", height:"300px", borderRadius:"50%", background: D ? "radial-gradient(circle,#7c3aed 0%,transparent 65%)" : "radial-gradient(circle,#c4b5fd 0%,transparent 65%)", opacity: D ? 0.2 : 0.12, filter:"blur(1px)" }} />
        {/* Subtle grid */}
        <div style={{ position:"absolute", inset:0, backgroundImage:`linear-gradient(${D?"rgba(99,102,241,0.04)":"rgba(99,102,241,0.06)"} 1px,transparent 1px),linear-gradient(90deg,${D?"rgba(99,102,241,0.04)":"rgba(99,102,241,0.06)"} 1px,transparent 1px)`, backgroundSize:"64px 64px" }} />
      </div>

      {/* ── Navbar (matches screenshot: logo left, badge + toggle right) ── */}
      <nav style={{
        position:"sticky", top:0, zIndex:20,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 40px", height:68,
        background: D ? "rgba(8,13,26,0.85)" : "rgba(240,244,255,0.85)",
        backdropFilter:"blur(20px)",
        borderBottom: D ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(99,102,241,0.12)",
      }}>
        {/* Logo — matches screenshot style exactly */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:38, height:38, borderRadius:12,
            background:"linear-gradient(135deg,#6366f1,#7c3aed)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:18, boxShadow:"0 0 20px rgba(99,102,241,0.5)",
          }}>⚖</div>
          <span style={{ fontSize:22, fontWeight:900, letterSpacing:"-0.5px", color: D ? "#fff" : "#0f172a" }}>
            Lex<span style={{ background:"linear-gradient(90deg,#818cf8,#22d3ee)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Simple</span>
          </span>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {/* Risk badge — pill style from screenshot */}
          <span style={{
            display:"flex", alignItems:"center", gap:6,
            fontSize:12, fontWeight:700, letterSpacing:"0.3px",
            padding:"6px 14px", borderRadius:999,
            background: riskColor.bg, border:`1px solid ${riskColor.border}`, color: riskColor.text,
          }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:riskColor.dot, boxShadow:`0 0 6px ${riskColor.dot}` }} />
            {result.risk_level} Risk
          </span>
          {/* Dark mode toggle */}
          <button onClick={toggleDark} style={{
            width:42, height:42, borderRadius:12, border:"none", cursor:"pointer", fontSize:18,
            background: D ? "rgba(255,255,255,0.07)" : "rgba(99,102,241,0.1)",
            transition:"all 0.2s",
          }}>
            {D ? "☀️" : "🌙"}
          </button>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <div style={{ position:"relative", zIndex:1, maxWidth:860, margin:"0 auto", padding:"48px 24px 120px" }}>

        {/* Page header — hero style from screenshot */}
        <div style={{ marginBottom:40, textAlign:"center" }}>
          {/* Badge pill like screenshot */}
          <div style={{
            display:"inline-flex", alignItems:"center", gap:8,
            padding:"6px 16px", borderRadius:999, marginBottom:20,
            background: D ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)",
            border: D ? "1px solid rgba(99,102,241,0.25)" : "1px solid rgba(99,102,241,0.2)",
          }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:"#34d399", boxShadow:"0 0 6px #34d399" }} />
            <span style={{ fontSize:12, fontWeight:600, color: D ? "#a5b4fc" : "#4f46e5" }}>AI-Powered Legal Intelligence</span>
          </div>

          <h1 style={{
            fontSize:"clamp(28px,4vw,42px)", fontWeight:900, letterSpacing:"-1px", lineHeight:1.15,
            color: D ? "#fff" : "#0f172a", marginBottom:10,
          }}>
            Analysis{" "}
            <span style={{ background:"linear-gradient(90deg,#818cf8 0%,#22d3ee 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              Results
            </span>
          </h1>
          <p style={{ fontSize:15, color:textSec }}>
            {result.clauses.length} clauses analyzed · <span style={{ color: riskColor.text, fontWeight:600 }}>{result.clauses.filter(c => c.risk).length} flagged as risky</span>
          </p>
        </div>

        {/* ── Clauses ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:32 }}>
          {result.clauses.map((c, i) => (
            <div key={i} style={{
              ...cardStyle(),
              border: c.risk
                ? D ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(239,68,68,0.2)"
                : D ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(99,102,241,0.12)",
              background: c.risk
                ? D ? "rgba(239,68,68,0.05)" : "rgba(254,226,226,0.5)"
                : D ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)",
              transition:"border-color 0.2s, transform 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.transform="translateY(-1px)")}
            onMouseLeave={e => (e.currentTarget.style.transform="translateY(0)")}
            >
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, marginBottom:12 }}>
                <span style={{
                  fontSize:11, fontWeight:700, letterSpacing:"0.8px", textTransform:"uppercase",
                  padding:"3px 10px", borderRadius:6,
                  background: D ? "rgba(255,255,255,0.06)" : "rgba(99,102,241,0.08)",
                  color: D ? "#64748b" : "#6366f1",
                }}>
                  Clause {i + 1}
                </span>
                {c.risk && (
                  <span style={{
                    fontSize:11, fontWeight:700, letterSpacing:"0.5px",
                    padding:"3px 10px", borderRadius:6,
                    background:"rgba(239,68,68,0.12)", color:"#f87171",
                    display:"flex", alignItems:"center", gap:5,
                    border:"1px solid rgba(239,68,68,0.2)",
                  }}>
                    ⚠ High Risk
                  </span>
                )}
              </div>
              <p style={{ fontSize:12, lineHeight:1.6, marginBottom:8, color:textSec }}>
                <span style={{ fontWeight:600, color:textMid }}>Original: </span>
                {c.original}
              </p>
              <p style={{ fontSize:14, lineHeight:1.65, fontWeight:500, color:textPri }}>
                <span style={{ fontWeight:700, background:"linear-gradient(90deg,#818cf8,#22d3ee)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Simple: </span>
                {c.simple}
              </p>
              {c.risk && (
                <p style={{ marginTop:10, fontSize:12, lineHeight:1.6, color:"#f87171",
                  padding:"8px 12px", borderRadius:8, background:"rgba(239,68,68,0.08)", borderLeft:"2px solid rgba(239,68,68,0.4)" }}>
                  ⚠️ {c.explanation}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* ── Summary card ── */}
        <div style={{
          ...cardStyle({ padding:"28px 32px" }),
          background: D ? "rgba(99,102,241,0.06)" : "rgba(238,242,255,0.8)",
          border: D ? "1px solid rgba(99,102,241,0.2)" : "1px solid rgba(99,102,241,0.18)",
          boxShadow: D ? "0 0 40px rgba(99,102,241,0.1)" : "0 8px 32px rgba(99,102,241,0.1)",
        }}>
          {/* Summary header */}
          <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom:16 }}>
            <div>
              <h3 style={{ fontWeight:900, fontSize:18, color:textPri, letterSpacing:"-0.3px", margin:0 }}>
                Document Summary
              </h3>
              {summaryLang.label !== "English" && (
                <span style={{ fontSize:12, color:"#818cf8", fontWeight:500 }}>· Translated to {summaryLang.label}</span>
              )}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <select
                value={summaryLang.label}
                onChange={(e) => { const l = LANGUAGES.find((x) => x.label === e.target.value)!; setSummaryLang(l); }}
                style={{
                  fontSize:12, borderRadius:10, padding:"6px 10px", outline:"none", cursor:"pointer",
                  background: D ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.9)",
                  border: D ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(99,102,241,0.2)",
                  color: D ? "#cbd5e1" : "#374151",
                  fontFamily:"inherit",
                }}
              >
                {LANGUAGES.map((l) => <option key={l.label} value={l.label}>{l.label}</option>)}
              </select>
              <button
                onClick={speakSummary}
                disabled={summaryTranslating}
                style={{
                  fontSize:12, padding:"6px 14px", borderRadius:10, cursor:"pointer",
                  fontWeight:700, fontFamily:"inherit", transition:"all 0.2s",
                  background: summaryPlaying ? "linear-gradient(135deg,#6366f1,#7c3aed)" : D ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.9)",
                  border: summaryPlaying ? "1px solid transparent" : D ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(99,102,241,0.2)",
                  color: summaryPlaying ? "#fff" : D ? "#cbd5e1" : "#4f46e5",
                  boxShadow: summaryPlaying ? "0 0 16px rgba(99,102,241,0.4)" : "none",
                }}
              >
                {summaryPlaying ? "⏹ Stop" : "🔊 Listen"}
              </button>
            </div>
          </div>

          {summaryTranslating
            ? <p style={{ fontSize:13, color:textSec, animation:"pulse 1.5s ease-in-out infinite" }}>Translating...</p>
            : <p style={{ fontSize:14, lineHeight:1.75, color:textMid }}>{translatedSummary}</p>
          }

          {/* Download button — large CTA style matching screenshot */}
          <div style={{ display:"flex", justifyContent:"center", marginTop:24 }}>
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
              style={{
                padding:"13px 32px", borderRadius:14, border:"none", cursor:"pointer",
                fontFamily:"inherit", fontWeight:800, fontSize:15, letterSpacing:"0.2px",
                background:"linear-gradient(135deg,#6366f1 0%,#7c3aed 50%,#06b6d4 100%)",
                color:"#fff",
                boxShadow:"0 0 32px rgba(99,102,241,0.45), 0 4px 16px rgba(0,0,0,0.2)",
                transition:"all 0.2s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity="0.9"; (e.currentTarget as HTMLButtonElement).style.transform="translateY(-2px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity="1"; (e.currentTarget as HTMLButtonElement).style.transform="translateY(0)"; }}
            >
              ⬇ Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── Floating chat button (glow style from screenshot) ── */}
      <button
        onClick={() => setChatOpen((o) => !o)}
        style={{
          position:"fixed", bottom:24, right:24,
          width:56, height:56, borderRadius:"50%",
          border: chatOpen ? D ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(99,102,241,0.2)" : "none",
          cursor:"pointer", fontSize:20, fontWeight:700,
          background: chatOpen
            ? D ? "rgba(255,255,255,0.08)" : "rgba(240,244,255,0.9)"
            : "linear-gradient(135deg,#6366f1,#7c3aed)",
          color: chatOpen ? D ? "#fff" : "#4f46e5" : "#fff",
          boxShadow: chatOpen ? "none" : "0 0 32px rgba(99,102,241,0.5), 0 4px 16px rgba(0,0,0,0.25)",
          transition:"all 0.25s",
          zIndex:50, display:"flex", alignItems:"center", justifyContent:"center",
        }}
        onMouseEnter={e => { if (!chatOpen) (e.currentTarget as HTMLButtonElement).style.transform="scale(1.08)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform="scale(1)"; }}
      >
        {chatOpen ? "✕" : "💬"}
      </button>

      {/* ── Chat panel ── */}
      {chatOpen && (
        <div style={{
          position:"fixed", bottom:92, right:24,
          width:384, maxWidth:"calc(100vw - 2rem)", height:420,
          borderRadius:20, overflow:"hidden",
          display:"flex", flexDirection:"column",
          background: D ? "#0d1426" : "#ffffff",
          border: D ? "1px solid rgba(255,255,255,0.09)" : "1px solid rgba(99,102,241,0.15)",
          boxShadow: D ? "0 0 60px rgba(99,102,241,0.2), 0 20px 40px rgba(0,0,0,0.5)" : "0 8px 40px rgba(99,102,241,0.15)",
          zIndex:50,
        }}>
          {/* Chat header — gradient from screenshot */}
          <div style={{ background:"linear-gradient(135deg,#4f46e5,#7c3aed)", padding:"14px 16px", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:10, background:"rgba(255,255,255,0.18)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🤖</div>
              <div>
                <p style={{ fontWeight:800, fontSize:14, color:"#fff", margin:0, letterSpacing:"-0.2px" }}>LexSimple Assistant</p>
                <p style={{ fontSize:11, color:"rgba(255,255,255,0.6)", margin:0 }}>Powered by AI · Based on your document</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", padding:"16px", display:"flex", flexDirection:"column", gap:12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display:"flex", gap:8, justifyContent: m.role === "user" ? "flex-end" : "flex-start", alignItems:"flex-end" }}>
                <div style={{
                  maxWidth:"82%", padding:"10px 14px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  fontSize:13.5, lineHeight:1.55,
                  background: m.role === "user"
                    ? "linear-gradient(135deg,#6366f1,#7c3aed)"
                    : D ? "rgba(255,255,255,0.06)" : "#f1f5f9",
                  color: m.role === "user" ? "#fff" : D ? "#e2e8f0" : "#1e293b",
                  border: m.role === "user" ? "none" : D ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(99,102,241,0.1)",
                }}>
                  {m.content}
                </div>
                {m.role === "assistant" && (
                  <button
                    onClick={() => speakChat(m.content, i)}
                    style={{
                      flexShrink:0, marginBottom:2, width:28, height:28, borderRadius:"50%",
                      border:"none", cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center",
                      background: chatPlaying === i ? "rgba(99,102,241,0.25)" : "transparent",
                      color: chatPlaying === i ? "#818cf8" : D ? "#475569" : "#94a3b8",
                      transition:"all 0.2s",
                    }}
                  >
                    {chatPlaying === i ? "⏹" : "🔊"}
                  </button>
                )}
              </div>
            ))}

            {/* Typing dots */}
            {chatLoading && (
              <div style={{ display:"flex", justifyContent:"flex-start" }}>
                <div style={{
                  padding:"12px 16px", borderRadius:"18px 18px 18px 4px",
                  background: D ? "rgba(255,255,255,0.06)" : "#f1f5f9",
                  border: D ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(99,102,241,0.1)",
                  display:"flex", gap:5, alignItems:"center",
                }}>
                  {[0, 150, 300].map((d) => (
                    <span key={d} style={{
                      width:7, height:7, borderRadius:"50%",
                      background: D ? "#475569" : "#94a3b8",
                      animation:"bounce 1s ease-in-out infinite",
                      animationDelay:`${d}ms`,
                      display:"inline-block",
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Suggested pills */}
          {messages.length <= 1 && (
            <div style={{
              padding:"10px 14px 12px",
              borderTop: D ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(99,102,241,0.08)",
              display:"flex", flexWrap:"wrap", gap:7, flexShrink:0,
            }}>
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  style={{
                    fontSize:11, padding:"5px 12px", borderRadius:999, cursor:"pointer",
                    fontFamily:"inherit", fontWeight:600, transition:"all 0.15s",
                    background: D ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.06)",
                    border: D ? "1px solid rgba(99,102,241,0.25)" : "1px solid rgba(99,102,241,0.15)",
                    color: D ? "#a5b4fc" : "#4f46e5",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = D ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.12)")}
                  onMouseLeave={e => (e.currentTarget.style.background = D ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.06)")}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div style={{
            padding:"10px 12px",
            borderTop: D ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(99,102,241,0.08)",
            display:"flex", gap:8, alignItems:"center", flexShrink:0,
          }}>
            <input
              type="text" value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={`Ask in ${chatLang.label}...`}
              disabled={chatLoading}
              style={{
                flex:1, fontSize:13, borderRadius:999, padding:"8px 16px", outline:"none",
                fontFamily:"inherit", transition:"border-color 0.2s",
                background: D ? "rgba(255,255,255,0.05)" : "#f8fafc",
                border: D ? "1px solid rgba(255,255,255,0.09)" : "1px solid rgba(99,102,241,0.15)",
                color: D ? "#f1f5f9" : "#0f172a",
              }}
            />
            <button
              onClick={toggleVoice}
              style={{
                width:36, height:36, borderRadius:"50%", border:"none", cursor:"pointer",
                fontSize:12, fontWeight:900, fontFamily:"inherit",
                background: isListening ? "#ef4444" : D ? "rgba(255,255,255,0.06)" : "#f1f5f9",
                color: isListening ? "#fff" : D ? "#64748b" : "#64748b",
                border: isListening ? "none" : D ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(99,102,241,0.15)",
                animation: isListening ? "pulse 1s ease-in-out infinite" : "none",
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                boxShadow: isListening ? "0 0 14px rgba(239,68,68,0.5)" : "none",
              }}
            >
              {isListening ? "■" : "MIC"}
            </button>
            <button
              onClick={() => sendMessage()}
              disabled={chatLoading || !input.trim()}
              style={{
                width:36, height:36, borderRadius:"50%", border:"none", cursor:"pointer",
                fontSize:14, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
                background:"linear-gradient(135deg,#6366f1,#7c3aed)",
                color:"#fff",
                opacity: chatLoading || !input.trim() ? 0.4 : 1,
                transition:"all 0.2s",
                boxShadow: chatLoading || !input.trim() ? "none" : "0 0 14px rgba(99,102,241,0.4)",
              }}
            >
              ➤
            </button>
          </div>

          {isListening && (
            <div style={{ padding:"0 16px 10px", textAlign:"center", flexShrink:0 }}>
              <span style={{ fontSize:11, fontWeight:600, color:"#f87171", animation:"pulse 1s ease-in-out infinite" }}>
                🎙 Listening in {chatLang.label}... click MIC to stop
              </span>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 2px; }
        input::placeholder { opacity: 0.5; }
        select option { background: #1e293b; color: #f1f5f9; }
      `}</style>
    </div>
  );
}