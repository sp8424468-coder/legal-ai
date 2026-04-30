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

  // 💳 NEW STATE
  const [paid, setPaid] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) setDark(saved === "true");
  }, []);

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

  // 📄 Upload (PAYMENT LOCK ADDED)
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
      setTranslatedPreview(p);
    } catch {
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  // 🤖 Analyze (PAYMENT LOCK ADDED)
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
    <div
      className={`min-h-screen flex items-center justify-center ${
        D ? "bg-[#070b14]" : "bg-[#eef2ff]"
      }`}
    >
      <div className="max-w-xl w-full p-6">

        {/* 💳 PAYMENT BUTTON */}
        {!paid && (
          <button
            onClick={handlePayment}
            className="w-full mb-5 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg"
          >
            💳 Pay ₹5 to Unlock
          </button>
        )}

        {/* 🔒 LOCK UI */}
        <div className={!paid ? "opacity-40 pointer-events-none" : ""}>

          {/* Upload */}
          <input
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setFile(f);
            }}
          />

          <div className="flex gap-3 mt-4">
            <button
              onClick={upload}
              className="flex-1 bg-blue-600 text-white p-2 rounded"
            >
              Upload
            </button>

            <button
              onClick={analyze}
              className="flex-1 bg-indigo-600 text-white p-2 rounded"
            >
              Analyze
            </button>
          </div>

          {/* Preview */}
          {preview && (
            <div className="mt-5 bg-gray-100 p-3 rounded">
              <pre>{preview}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}