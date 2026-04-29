"use client";
import { useEffect, useState, useRef } from "react";

interface Clause {
  original: string;
  simple: string;
  risk: boolean;
  explanation: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "What are the penalties?",
  "Can I cancel anytime?",
  "Are there hidden charges?",
  "What are my main obligations?",
];

export default function AnalysisPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I've read your document. Ask me anything about it 👋",
    },
  ]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
          headers: { "Content-Type": "application/json" },
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

  // Auto scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (question?: string) => {
    const q = question || input.trim();
    if (!q || chatLoading) return;

    const userMsg: Message = { role: "user", content: q };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setChatLoading(true);

    try {
      // Only send last 10 messages to save tokens
      const history = newMessages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer || data.error || "Something went wrong.",
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "❌ Failed to get a response. Try again." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

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
          <p className="text-lg font-semibold text-red-500">❌ No result found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8">

        {/* Title */}
        <h1 className="text-3xl font-bold text-center mb-6">📊 Analysis Result</h1>

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
          {result.clauses.map((c: Clause, i: number) => (
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

      {/* ── CHAT WIDGET ── */}

      {/* Floating Chat Button */}
      <button
        onClick={() => setChatOpen((o) => !o)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl transition-all z-50"
        title="Ask about this document"
      >
        {chatOpen ? "✕" : "💬"}
      </button>

      {/* Chat Panel */}
      {chatOpen && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50"
          style={{ height: "520px" }}>

          {/* Header */}
          <div className="bg-blue-600 text-white px-4 py-3 rounded-t-2xl flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <div>
              <p className="font-semibold text-sm">LexSimple Assistant</p>
              <p className="text-xs opacity-80">Ask anything about your document</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-2 rounded-2xl rounded-bl-sm">
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

          {/* Suggested Questions — only show at start */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
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

          {/* Input */}
          <div className="p-3 border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask about your document..."
              className="flex-1 text-sm border border-gray-200 rounded-full px-4 py-2 outline-none focus:border-blue-400"
              disabled={chatLoading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={chatLoading || !input.trim()}
              className="w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-full flex items-center justify-center transition text-sm"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </div>
  );
}