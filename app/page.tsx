"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [dark, setDark] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) setDark(saved === "true");
  }, []);

  const toggleDark = () => {
    setDark((d) => { localStorage.setItem("darkMode", String(!d)); return !d; });
  };

  const go = () => router.push("/upload");
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
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-base shadow-lg shadow-indigo-500/30">
            ⚖
          </div>
          <span className={`text-xl font-black tracking-tight ${D ? "text-white" : "text-gray-900"}`}>
            Lex<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-500">Simple</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleDark}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${D ? "bg-white/[0.07] hover:bg-white/[0.12] text-yellow-300" : "bg-black/[0.06] hover:bg-black/[0.1] text-slate-600"}`}>
            {D ? "☀️" : "🌙"}
          </button>
          <button onClick={go}
            className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/30 transition-all hover:scale-105">
            Get Started →
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="relative z-10 text-center px-6 pt-20 pb-16">
        <div className={`inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full mb-8 border ${D ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/25" : "bg-indigo-50 text-indigo-600 border-indigo-200"}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          AI-Powered Legal Intelligence
        </div>

        <h1 className={`text-5xl md:text-7xl font-black tracking-tight leading-[1.02] mb-6 ${D ? "text-white" : "text-gray-900"}`}>
          Understand Legal
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400">
            Documents Instantly
          </span>
        </h1>

        <p className={`text-base md:text-lg max-w-xl mx-auto leading-relaxed mb-10 ${D ? "text-gray-400" : "text-gray-500"}`}>
          Upload contracts and let AI simplify complex terms,
          detect risks, and give clear insights in plain English.
        </p>

        <button onClick={go}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 bg-[length:200%] hover:bg-right text-white font-black text-lg px-8 py-4 rounded-2xl shadow-2xl shadow-indigo-500/40 hover:shadow-indigo-500/60 transition-all hover:scale-105">
          Start Analyzing 🚀
        </button>

        {/* Stats */}
        <div className="flex justify-center gap-10 mt-14 flex-wrap">
          {[{ value: "11+", label: "Languages" }, { value: "AI", label: "Powered" }, { value: "100%", label: "Private" }].map((s) => (
            <div key={s.label} className="text-center">
              <p className={`text-3xl font-black ${D ? "text-white" : "text-gray-900"}`}>{s.value}</p>
              <p className={`text-xs mt-1 font-medium ${D ? "text-gray-500" : "text-gray-400"}`}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Feature cards (MD: 3 cols) ── */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 pb-10">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: "📄", title: "Upload Documents",  desc: "Supports PDF & DOCX files. Drag and drop or click to browse.",                      color: D ? "bg-indigo-500/10 border-indigo-500/20" : "bg-indigo-50 border-indigo-200",  iconBg: D ? "bg-indigo-500/20" : "bg-indigo-100" },
            { icon: "🤖", title: "AI Analysis",        desc: "Converts complex legal language into simple, clear terms instantly.",                color: D ? "bg-violet-500/10 border-violet-500/20" : "bg-violet-50 border-violet-200",  iconBg: D ? "bg-violet-500/20" : "bg-violet-100" },
            { icon: "⚠️", title: "Risk Detection",     desc: "Automatically identifies and flags high-risk clauses before you sign.",            color: D ? "bg-rose-500/10 border-rose-500/20"   : "bg-rose-50 border-rose-200",        iconBg: D ? "bg-rose-500/20"   : "bg-rose-100"   },
          ].map((f) => (
            <div key={f.title} className={`rounded-2xl border p-6 transition-all hover:scale-[1.02] cursor-default ${f.color}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 ${f.iconBg}`}>{f.icon}</div>
              <h3 className={`font-black text-base mb-2 ${D ? "text-white" : "text-gray-900"}`}>{f.title}</h3>
              <p className={`text-sm leading-relaxed ${D ? "text-gray-400" : "text-gray-500"}`}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Extra features strip */}
        <div className={`mt-4 rounded-2xl border p-6 ${D ? "bg-white/[0.03] border-white/[0.07]" : "bg-white border-gray-200 shadow-sm"}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { icon: "🌐", label: "11 Languages",  sub: "Translate & listen"    },
              { icon: "💬", label: "AI Chatbot",     sub: "Ask questions live"    },
              { icon: "🔊", label: "Read Aloud",     sub: "Voice in any language" },
              { icon: "🎤", label: "Voice Input",    sub: "Speak your questions"  },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${D ? "bg-white/[0.06]" : "bg-gray-50 border border-gray-100"}`}>
                  {f.icon}
                </div>
                <div>
                  <p className={`text-xs font-bold ${D ? "text-gray-200" : "text-gray-800"}`}>{f.label}</p>
                  <p className={`text-xs ${D ? "text-gray-600" : "text-gray-400"}`}>{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className={`relative z-10 text-center py-8 text-xs ${D ? "text-gray-700" : "text-gray-400"}`}>
        © 2026 LexSimple · Legal AI Analyzer 🚀
      </div>
    </div>
  );
}